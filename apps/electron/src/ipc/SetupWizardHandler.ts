import { ipcMain } from 'electron';
import {
  GetModuleSettingsUseCase,
  CompleteSetupWizardUseCase,
  CheckInitialSetupUseCase,
  MODULE_SETTING_KEYS,
} from '@nuqtaplus/core';
import { SqliteSettingsRepository, SqliteUserRepository, withTransaction, DatabaseType } from '@nuqtaplus/data';
import { requirePermission } from '../services/PermissionGuardService.js';
import { userContextService } from '../services/UserContextService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

const LEGACY_TOGGLE_KEY_BY_CANONICAL: Record<string, string> = {
  [MODULE_SETTING_KEYS.ACCOUNTING_ENABLED]: 'modules.accounting.enabled',
  [MODULE_SETTING_KEYS.PURCHASES_ENABLED]: 'modules.purchases.enabled',
  [MODULE_SETTING_KEYS.LEDGERS_ENABLED]: 'modules.ledgers.enabled',
  [MODULE_SETTING_KEYS.UNITS_ENABLED]: 'modules.units.enabled',
  [MODULE_SETTING_KEYS.PAYMENTS_ON_INVOICES_ENABLED]: 'modules.payments_on_invoices.enabled',
};

const CANONICAL_TOGGLE_KEY_BY_ALIAS: Record<string, string> = {
  [MODULE_SETTING_KEYS.ACCOUNTING_ENABLED]: MODULE_SETTING_KEYS.ACCOUNTING_ENABLED,
  [MODULE_SETTING_KEYS.PURCHASES_ENABLED]: MODULE_SETTING_KEYS.PURCHASES_ENABLED,
  [MODULE_SETTING_KEYS.LEDGERS_ENABLED]: MODULE_SETTING_KEYS.LEDGERS_ENABLED,
  [MODULE_SETTING_KEYS.UNITS_ENABLED]: MODULE_SETTING_KEYS.UNITS_ENABLED,
  [MODULE_SETTING_KEYS.PAYMENTS_ON_INVOICES_ENABLED]: MODULE_SETTING_KEYS.PAYMENTS_ON_INVOICES_ENABLED,
  'modules.accounting.enabled': MODULE_SETTING_KEYS.ACCOUNTING_ENABLED,
  'modules.purchases.enabled': MODULE_SETTING_KEYS.PURCHASES_ENABLED,
  'modules.ledgers.enabled': MODULE_SETTING_KEYS.LEDGERS_ENABLED,
  'modules.units.enabled': MODULE_SETTING_KEYS.UNITS_ENABLED,
  'modules.payments_on_invoices.enabled': MODULE_SETTING_KEYS.PAYMENTS_ON_INVOICES_ENABLED,
};

export function registerSetupWizardHandlers(db: DatabaseType) {
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const userRepo = new SqliteUserRepository(db.db);
  const checkInitialSetupUseCase = new CheckInitialSetupUseCase(userRepo, settingsRepo);
  const getModuleSettingsUseCase = new GetModuleSettingsUseCase(settingsRepo);
  const completeSetupWizardUseCase = new CompleteSetupWizardUseCase(settingsRepo);

  const canAccessWizardWithoutAuth = (): boolean => {
    const context = userContextService.getContext();
    if (context?.userId) return false;

    const setupStatus = checkInitialSetupUseCase.execute();
    const moduleSettings = getModuleSettingsUseCase.execute();
    return !setupStatus.isInitialized || !moduleSettings.wizardCompleted;
  };

  const writeModuleToggle = (key: string, value: boolean): void => {
    const serialized = value ? 'true' : 'false';
    settingsRepo.set(key, serialized);

    const legacyKey = LEGACY_TOGGLE_KEY_BY_CANONICAL[key];
    if (legacyKey) {
      settingsRepo.set(legacyKey, serialized);
    }
  };

  ipcMain.handle('settings:getModules', async () => {
    try {
      if (!canAccessWizardWithoutAuth()) {
        requirePermission({
          permission: 'settings:read',
          allowRoles: ['admin', 'manager', 'cashier'],
        });
      }

      const result = getModuleSettingsUseCase.execute();
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:completeWizard', async (_event, payload) => {
    try {
      if (!canAccessWizardWithoutAuth()) {
        requirePermission({ permission: 'settings:write', allowRoles: ['admin'] });
      }

      const body = assertPayload('settings:completeWizard', payload, ['data']);
      const data = body.data;

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw buildValidationError(
          'settings:completeWizard',
          payload,
          'Wizard settings must be an object'
        );
      }

      withTransaction(db.sqlite, () => {
        completeSetupWizardUseCase.execute(data as any);
      });

      const updated = getModuleSettingsUseCase.execute();
      return ok(updated);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:setModuleToggle', async (_event, payload) => {
    try {
      requirePermission({ permission: 'settings:write', allowRoles: ['admin'] });

      const body = assertPayload('settings:setModuleToggle', payload, ['data']);
      const data = body.data as { key?: string; value?: boolean };

      if (!data || typeof data.key !== 'string' || typeof data.value !== 'boolean') {
        throw buildValidationError(
          'settings:setModuleToggle',
          payload,
          'key (string) and value (boolean) are required'
        );
      }

      const canonicalKey = CANONICAL_TOGGLE_KEY_BY_ALIAS[data.key];
      if (!canonicalKey) {
        throw buildValidationError(
          'settings:setModuleToggle',
          payload,
          `Invalid module key: ${data.key}`
        );
      }

      writeModuleToggle(canonicalKey, data.value);
      const updated = getModuleSettingsUseCase.execute();
      return ok(updated);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
