import type { ApiResult } from './contracts';
import type { SettingsCurrencyResponse, CompanySettings } from '../types/domain';
import { invoke } from './invoke';
import { buildDataPayload, buildKeyPayload, buildParamsPayload } from './payloads';

/**
 * Module settings types for the setup wizard and gating
 */
export interface ModuleSettings {
  accountingEnabled: boolean;
  purchasesEnabled: boolean;
  ledgersEnabled: boolean;
  unitsEnabled: boolean;
  paymentsOnInvoicesEnabled: boolean;
}

export interface NotificationSettings {
  lowStockThreshold: number;
  expiryDays: number;
  debtReminderCount: number;
  debtReminderIntervalDays: number;
}

export interface InvoiceSettings {
  templateActiveId: string;
  prefix: string;
  paperSize: 'thermal' | 'a4' | 'a5';
  logo: string;
  footerNotes: string;
  layoutDirection: 'rtl' | 'ltr';
  showQr: boolean;
  showBarcode: boolean;
}

export interface AllModuleSettings {
  modules: ModuleSettings;
  notifications: NotificationSettings;
  invoice: InvoiceSettings;
  wizardCompleted: boolean;
}

export interface SetupWizardPayload {
  modules: ModuleSettings;
  notifications: NotificationSettings;
  invoice: InvoiceSettings;
}

export type TypedSettingValue = string | number | boolean | null;

export const settingsClient = {
  get: (key: string): Promise<ApiResult<string | null>> =>
    invoke<string | null>('settings:get', buildKeyPayload('settings:get', key)),

  set: (key: string, value: string): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('settings:set', buildDataPayload('settings:set', { key, value })),

  getTyped: (keys: string[]): Promise<ApiResult<Record<string, TypedSettingValue>>> =>
    invoke<Record<string, TypedSettingValue>>(
      'settings:getTyped',
      buildParamsPayload('settings:getTyped', { keys })
    ),

  setTyped: (values: Record<string, TypedSettingValue>): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>(
      'settings:setTyped',
      buildDataPayload('settings:setTyped', { values })
    ),

  getCurrency: (): Promise<ApiResult<SettingsCurrencyResponse>> =>
    invoke<SettingsCurrencyResponse>('settings:getCurrency'),

  getCompany: (): Promise<ApiResult<CompanySettings | null>> =>
    invoke<CompanySettings | null>('settings:getCompany'),

  setCompany: (settings: CompanySettings): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('settings:setCompany', buildDataPayload('settings:setCompany', settings)),

  getAppVersion: (): Promise<ApiResult<{ version: string }>> =>
    invoke<{ version: string }>('settings:getAppVersion'),

  getPrinters: (): Promise<ApiResult<{ printers: string[] }>> =>
    invoke<{ printers: string[] }>('printers:getAll'),

  // ── Module Settings (Setup Wizard + Gating) ──

  /** Get all module toggle settings */
  getModules: (): Promise<ApiResult<AllModuleSettings>> =>
    invoke<AllModuleSettings>('settings:getModules'),

  /** Complete the setup wizard (writes all settings atomically) */
  completeWizard: (data: SetupWizardPayload): Promise<ApiResult<AllModuleSettings>> =>
    invoke<AllModuleSettings>(
      'settings:completeWizard',
      buildDataPayload('settings:completeWizard', data as any)
    ),

  /** Toggle a single module setting */
  setModuleToggle: (key: string, value: boolean): Promise<ApiResult<AllModuleSettings>> =>
    invoke<AllModuleSettings>(
      'settings:setModuleToggle',
      buildDataPayload('settings:setModuleToggle', { key, value })
    ),
};
