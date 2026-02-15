import type { ApiResult } from './contracts';
import type { SettingsCurrencyResponse, CompanySettings } from '../types/domain';
import { invoke } from './invoke';
import { buildDataPayload, buildKeyPayload } from './payloads';

export const settingsClient = {
  get: (key: string): Promise<ApiResult<string | null>> =>
    invoke<string | null>('settings:get', buildKeyPayload('settings:get', key)),

  set: (key: string, value: string): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('settings:set', buildDataPayload('settings:set', { key, value })),

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
};
