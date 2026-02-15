import { ipcMain } from 'electron';
import {
  GetSettingUseCase,
  GetCurrencySettingsUseCase,
  SetSettingUseCase,
  GetCompanySettingsUseCase,
  SetCompanySettingsUseCase,
  mapErrorToResult,
} from '@nuqtaplus/core';
import { SqliteSettingsRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { app } from 'electron';

export function registerSettingsHandlers(db: DatabaseType) {
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const getSettingUseCase = new GetSettingUseCase(settingsRepo);
  const getCurrencySettingsUseCase = new GetCurrencySettingsUseCase(settingsRepo);
  const setSettingUseCase = new SetSettingUseCase(settingsRepo);
  const getCompanySettingsUseCase = new GetCompanySettingsUseCase(settingsRepo);
  const setCompanySettingsUseCase = new SetCompanySettingsUseCase(settingsRepo);

  ipcMain.handle('settings:get', async (_event, payload) => {
    try {
      // Settings read requires manager or admin
      requirePermission({ permission: 'settings:read', allowRoles: ['admin', 'manager'] });

      const { key } = assertPayload('settings:get', payload, ['key']);
      if (typeof key !== 'string') {
        throw buildValidationError('settings:get', payload, 'Key must be a string');
      }

      return ok(await getSettingUseCase.execute(key));
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:set', async (_event, payload) => {
    try {
      // Settings write requires admin only
      requirePermission({ permission: 'settings:write', allowRoles: ['admin'] });

      const body = assertPayload('settings:set', payload, ['data']);
      const data = body.data as any;
      if (!data || typeof data.key !== 'string' || typeof data.value !== 'string') {
        throw buildValidationError('settings:set', payload, 'Key and value must be strings');
      }

      await setSettingUseCase.execute(data.key, data.value);
      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:getCurrency', async () => {
    try {
      // Currency read requires at least cashier
      requirePermission({
        permission: 'settings:read',
        allowRoles: ['admin', 'manager', 'cashier'],
      });

      return ok(await getCurrencySettingsUseCase.execute());
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:getCompany', async () => {
    try {
      requirePermission({
        permission: 'settings:read',
        allowRoles: ['admin', 'manager', 'cashier'],
      });

      return ok(await getCompanySettingsUseCase.execute());
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:setCompany', async (_event, payload) => {
    try {
      requirePermission({ permission: 'settings:write', allowRoles: ['admin'] });

      const body = assertPayload('settings:setCompany', payload, ['data']);
      const data = body.data;

      if (!data || typeof data !== 'object') {
        throw buildValidationError(
          'settings:setCompany',
          payload,
          'Company settings must be an object'
        );
      }

      await setCompanySettingsUseCase.execute(data as any);
      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:getAppVersion', async () => {
    try {
      // App version can be read by anyone
      console.log('Fetching app version', app.getVersion());
      return ok({ version: app.getVersion() });
    } catch (error: unknown) {
      return mapErrorToResult(error);
    }
  });
}
