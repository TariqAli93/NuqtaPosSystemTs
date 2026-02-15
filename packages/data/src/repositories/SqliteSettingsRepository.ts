import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { currencySettings, settings } from '../schema/schema.js';
import { ISettingsRepository, CompanySettings } from '@nuqtaplus/core';

type CurrencySettingRow = typeof currencySettings.$inferSelect;

const COMPANY_SETTINGS_KEY = 'company_settings';

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private db: DbClient) {}

  getCurrencySettings(): {
    defaultCurrency: string;
    usdRate: number;
    iqdRate: number;
  } {
    // defaults
    let defaultCurrency = 'USD';
    let usdRate = 1;
    let iqdRate = 1320; // fallback

    const currencies = this.db.select().from(currencySettings).all();

    // Find base currency
    const base = currencies.find((c: CurrencySettingRow) => c.isBaseCurrency);
    if (base) {
      defaultCurrency = base.currencyCode;
    }

    // Try to find raw rates
    const usd = currencies.find((c: CurrencySettingRow) => c.currencyCode === 'USD');
    const iqd = currencies.find((c: CurrencySettingRow) => c.currencyCode === 'IQD');

    if (usd) usdRate = usd.exchangeRate;
    if (iqd) iqdRate = iqd.exchangeRate;

    // Check company settings for explicit currency
    const companySettings = this.getCompanySettings();
    if (companySettings?.currency) {
      defaultCurrency = companySettings.currency;
    }

    return { defaultCurrency, usdRate, iqdRate };
  }

  get(key: string): string | null {
    const row = this.db.select().from(settings).where(eq(settings.key, key)).get();
    return row ? row.value : null;
  }

  set(key: string, value: string): void {
    const existing = this.get(key);

    if (existing !== null) {
      // Update existing setting
      this.db
        .update(settings)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(settings.key, key))
        .run();
    } else {
      // Insert new setting
      this.db.insert(settings).values({ key, value }).run();
    }
  }

  getCompanySettings(): CompanySettings | null {
    const raw = this.get(COMPANY_SETTINGS_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CompanySettings;
    } catch {
      return null;
    }
  }

  setCompanySettings(companySettings: CompanySettings): void {
    const serialized = JSON.stringify(companySettings);
    this.set(COMPANY_SETTINGS_KEY, serialized);
  }
}
