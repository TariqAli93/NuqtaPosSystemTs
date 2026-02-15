import type { CompanySettings } from '../entities/Settings.js';

export interface ISettingsRepository {
  getCurrencySettings(): { defaultCurrency: string; usdRate: number; iqdRate: number };
  get(key: string): string | null;
  set(key: string, value: string): void;
  getCompanySettings(): CompanySettings | null;
  setCompanySettings(settings: CompanySettings): void;
}
