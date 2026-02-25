import { ipcMain } from 'electron';
import {
  AuditService,
  GetSettingUseCase,
  GetCurrencySettingsUseCase,
  SetSettingUseCase,
  GetCompanySettingsUseCase,
  SetCompanySettingsUseCase,
  mapErrorToResult,
} from '@nuqtaplus/core';
import { SqliteAuditRepository, SqliteSettingsRepository } from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { app } from 'electron';
import { userContextService } from '../services/UserContextService.js';

type TypedSettingKind = 'string' | 'boolean' | 'int';

const TYPED_SETTING_KEYS: Record<string, TypedSettingKind> = {
  'pos.defaultPaymentMethod': 'string',
  'pos.printerEnabled': 'boolean',
  'pos.autoGenerateInvoice': 'boolean',
  'pos.enableBarcodeScanner': 'boolean',
  'pos.autoAddOnScan': 'boolean',
  'pos.showStockWarning': 'boolean',
  'pos.defaultTaxRateBps': 'int',

  'accounting.enabled': 'boolean',
  // NOTE: autoPostOnSale / autoPostOnPurchase are stored but NOT consumed by business logic.
  // All journal entries are created as unposted and must be posted manually via PostPeriodUseCase.
  // These settings are kept for future use; they do not affect current posting behavior.
  'accounting.autoPostOnSale': 'boolean',
  'accounting.autoPostOnPurchase': 'boolean',
  'accounting.enforceBalancedEntries': 'boolean',
  'accounting.defaultCostMethod': 'string',
  'accounting.fiscalYearStart': 'string',

  'barcode.defaultTemplateId': 'int',
  'barcode.printerType': 'string',
  'barcode.dpi': 'int',
  'barcode.defaultFormat': 'string',
  'barcode.prefix': 'string',
  'barcode.labelWidth': 'int',
  'barcode.labelHeight': 'int',
  'barcode.showPrice': 'boolean',
  'barcode.showProductName': 'boolean',
  'barcode.printerName': 'string',
};

const LEGACY_TYPED_MIGRATION_FLAG = 'settings.typedMigration.v1';

function decodeTypedSetting(
  kind: TypedSettingKind,
  raw: string | null
): string | number | boolean | null {
  if (raw === null) return null;
  if (kind === 'string') return raw;
  if (kind === 'boolean') return raw === 'true';
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function encodeTypedSetting(kind: TypedSettingKind, value: unknown): string {
  if (kind === 'string') {
    if (value === null || value === undefined) return '';
    return String(value);
  }
  if (kind === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error('Boolean setting value must be true/false');
    }
    return value ? 'true' : 'false';
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Integer setting value must be an integer number');
  }
  return String(value);
}

function migrateLegacyTypedSettings(settingsRepo: SqliteSettingsRepository): void {
  if (settingsRepo.get(LEGACY_TYPED_MIGRATION_FLAG) === 'done') return;

  const writeIfMissing = (key: string, value: unknown): void => {
    if (!(key in TYPED_SETTING_KEYS)) return;
    if (value === undefined || value === null) return;
    if (settingsRepo.get(key) !== null) return;
    const encoded = encodeTypedSetting(TYPED_SETTING_KEYS[key], value);
    settingsRepo.set(key, encoded);
  };

  const parseBlob = (key: string): Record<string, unknown> | null => {
    const raw = settingsRepo.get(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  };

  const pos = parseBlob('pos');
  if (pos) {
    writeIfMissing('pos.enableBarcodeScanner', pos.enableBarcodeScanner);
    writeIfMissing('pos.autoAddOnScan', pos.autoAddOnScan);
    writeIfMissing('pos.showStockWarning', pos.showStockWarning);
    if (typeof pos.defaultTaxRate === 'number' && Number.isInteger(pos.defaultTaxRate)) {
      writeIfMissing('pos.defaultTaxRateBps', pos.defaultTaxRate * 100);
    }
    if (typeof pos.defaultPaymentType === 'string') {
      writeIfMissing('pos.defaultPaymentMethod', pos.defaultPaymentType);
    }
  }

  const accounting = parseBlob('accounting');
  if (accounting) {
    writeIfMissing('accounting.autoPostOnSale', accounting.autoPostOnSale);
    writeIfMissing('accounting.autoPostOnPurchase', accounting.autoPostOnPurchase);
    writeIfMissing('accounting.enforceBalancedEntries', accounting.enforceBalancedEntries);
    writeIfMissing('accounting.defaultCostMethod', accounting.defaultCostMethod);
    if (typeof accounting.fiscalYearStart === 'number' && accounting.fiscalYearStart >= 1) {
      const month = String(Math.trunc(accounting.fiscalYearStart)).padStart(2, '0');
      writeIfMissing('accounting.fiscalYearStart', `${month}-01`);
    }
  }

  const barcode = parseBlob('barcode');
  if (barcode) {
    writeIfMissing('barcode.defaultFormat', barcode.defaultFormat);
    writeIfMissing('barcode.prefix', barcode.prefix);
    writeIfMissing('barcode.labelWidth', barcode.labelWidth);
    writeIfMissing('barcode.labelHeight', barcode.labelHeight);
    writeIfMissing('barcode.showPrice', barcode.showPrice);
    writeIfMissing('barcode.showProductName', barcode.showProductName);
  }

  settingsRepo.set(LEGACY_TYPED_MIGRATION_FLAG, 'done');
}

export function registerSettingsHandlers(db: DatabaseType) {
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);
  const auditService = new AuditService(auditRepo);
  const getSettingUseCase = new GetSettingUseCase(settingsRepo);
  const getCurrencySettingsUseCase = new GetCurrencySettingsUseCase(settingsRepo);
  const setSettingUseCase = new SetSettingUseCase(settingsRepo);
  const getCompanySettingsUseCase = new GetCompanySettingsUseCase(settingsRepo);
  const setCompanySettingsUseCase = new SetCompanySettingsUseCase(settingsRepo);

  withTransaction(db.sqlite, () => {
    migrateLegacyTypedSettings(settingsRepo);
    return true;
  });

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

  ipcMain.handle('settings:getTyped', async (_event, payload) => {
    try {
      requirePermission({ permission: 'settings:read', allowRoles: ['admin', 'manager'] });

      const parsed = assertPayload('settings:getTyped', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params)
          ? (parsed.params as Record<string, unknown>)
          : {};
      const keys = Array.isArray(params.keys) ? params.keys : [];
      if (!keys.every((key) => typeof key === 'string' && key in TYPED_SETTING_KEYS)) {
        throw buildValidationError(
          'settings:getTyped',
          payload,
          'keys must be a list of supported typed setting keys'
        );
      }

      const values: Record<string, string | number | boolean | null> = {};
      for (const key of keys as string[]) {
        const kind = TYPED_SETTING_KEYS[key];
        values[key] = decodeTypedSetting(kind, settingsRepo.get(key));
      }

      return ok(values);
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
      const userId = userContextService.getUserId() || 1;
      await auditService.logAction(
        userId,
        'settings:update',
        'Settings',
        0,
        `Updated setting key "${data.key}"`,
        { key: data.key }
      );
      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('settings:setTyped', async (_event, payload) => {
    try {
      requirePermission({ permission: 'settings:write', allowRoles: ['admin'] });

      const parsed = assertPayload('settings:setTyped', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : {};
      const values =
        data.values && typeof data.values === 'object' && !Array.isArray(data.values)
          ? (data.values as Record<string, unknown>)
          : null;

      if (!values) {
        throw buildValidationError('settings:setTyped', payload, 'data.values must be an object');
      }

      const keys = Object.keys(values);
      if (!keys.every((key) => key in TYPED_SETTING_KEYS)) {
        throw buildValidationError(
          'settings:setTyped',
          payload,
          'Only supported typed setting keys can be written'
        );
      }

      withTransaction(db.sqlite, () => {
        for (const key of keys) {
          const kind = TYPED_SETTING_KEYS[key];
          const encoded = encodeTypedSetting(kind, values[key]);
          settingsRepo.set(key, encoded);
        }
        return true;
      });
      const userId = userContextService.getUserId() || 1;
      await auditService.logAction(
        userId,
        'settings:update',
        'Settings',
        0,
        `Updated ${keys.length} typed settings`,
        { keys }
      );

      return ok({ ok: true });
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
      const userId = userContextService.getUserId() || 1;
      await auditService.logAction(
        userId,
        'settings:company:update',
        'Settings',
        0,
        'Updated company settings',
        { keys: Object.keys(data as Record<string, unknown>) }
      );
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
