import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { currencySettings, settings } from '../schema/schema.js';
import { ISettingsRepository, CompanySettings } from '@nuqtaplus/core';

type CurrencySettingRow = typeof currencySettings.$inferSelect;

const COMPANY_SETTINGS_KEY = 'company_settings';

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private db: DbClient) {}

  async getCurrencySettings(): Promise<{
    defaultCurrency: string;
    usdRate: number;
    iqdRate: number;
  }> {
    // defaults
    let defaultCurrency = 'USD';
    let usdRate = 1;
    let iqdRate = 1320; // fallback

    const currencies = await this.db.select().from(currencySettings).execute();

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
    const companySettings = await this.getCompanySettings();
    if (companySettings?.currency) {
      defaultCurrency = companySettings.currency;
    }

    return { defaultCurrency, usdRate, iqdRate };
  }

  async get(key: string): Promise<string | null> {
    const [row] = await this.db.select().from(settings).where(eq(settings.key, key));
    return row ? row.value : null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.get(key);

    if (existing !== null) {
      // Update existing setting
      await this.db
        .update(settings)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(settings.key, key))
        .execute();
    } else {
      // Insert new setting
      await this.db.insert(settings).values({ key, value }).execute();
    }
  }

  async getCompanySettings(): Promise<CompanySettings | null> {
    const raw = await this.get(COMPANY_SETTINGS_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CompanySettings;
    } catch {
      return null;
    }
  }

  async setCompanySettings(companySettings: CompanySettings): Promise<void> {
    const serialized = JSON.stringify(companySettings);
    await this.set(COMPANY_SETTINGS_KEY, serialized);
  }
}
