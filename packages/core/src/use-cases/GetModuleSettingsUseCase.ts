import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import {
  MODULE_SETTING_KEYS,
  NOTIFICATION_SETTING_KEYS,
  INVOICE_SETTING_KEYS,
  SETUP_SETTING_KEYS,
  type ModuleSettings,
  type NotificationSettings,
  type InvoiceSettings,
} from '../entities/ModuleSettings.js';

/**
 * GetModuleSettingsUseCase
 * Reads all module toggle, notification, and invoice settings from the KV store
 * and returns them as typed objects.
 */
export class GetModuleSettingsUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  execute(): {
    modules: ModuleSettings;
    notifications: NotificationSettings;
    invoice: InvoiceSettings;
    wizardCompleted: boolean;
  } {
    const pick = (keys: string[]): string | null => {
      for (const key of keys) {
        const value = this.settingsRepo.get(key);
        if (value !== null) return value;
      }
      return null;
    };

    const toBool = (keys: string[], fallback: boolean): boolean => {
      const v = pick(keys);
      if (v === null) return fallback;
      return v === 'true';
    };

    const toInt = (keys: string[], fallback: number): number => {
      const v = pick(keys);
      if (v === null) return fallback;
      const n = parseInt(v, 10);
      return isNaN(n) ? fallback : n;
    };

    const toStr = (keys: string[], fallback: string): string => {
      const v = pick(keys);
      return v ?? fallback;
    };

    const modules: ModuleSettings = {
      accountingEnabled: toBool(
        [MODULE_SETTING_KEYS.ACCOUNTING_ENABLED, 'modules.accounting.enabled'],
        false
      ),
      purchasesEnabled: toBool(
        [MODULE_SETTING_KEYS.PURCHASES_ENABLED, 'modules.purchases.enabled'],
        true
      ),
      ledgersEnabled: toBool([MODULE_SETTING_KEYS.LEDGERS_ENABLED, 'modules.ledgers.enabled'], true),
      unitsEnabled: toBool([MODULE_SETTING_KEYS.UNITS_ENABLED, 'modules.units.enabled'], false),
      paymentsOnInvoicesEnabled: toBool(
        [MODULE_SETTING_KEYS.PAYMENTS_ON_INVOICES_ENABLED, 'modules.payments_on_invoices.enabled'],
        true
      ),
    };

    const notifications: NotificationSettings = {
      lowStockThreshold: toInt(
        [NOTIFICATION_SETTING_KEYS.LOW_STOCK_THRESHOLD, 'notifications.low_stock_threshold'],
        5
      ),
      expiryDays: toInt([NOTIFICATION_SETTING_KEYS.EXPIRY_DAYS, 'notifications.expiry_days'], 30),
      debtReminderCount: toInt([NOTIFICATION_SETTING_KEYS.DEBT_REMINDER_COUNT], 3),
      debtReminderIntervalDays: toInt(
        [
          NOTIFICATION_SETTING_KEYS.DEBT_REMINDER_INTERVAL_DAYS,
          'notifications.debt_reminder_interval',
        ],
        7
      ),
    };

    const invoice: InvoiceSettings = {
      templateActiveId: toStr([INVOICE_SETTING_KEYS.TEMPLATE_ACTIVE_ID], 'default'),
      prefix: toStr([INVOICE_SETTING_KEYS.PREFIX, 'invoice.prefix'], 'INV'),
      paperSize: toStr([INVOICE_SETTING_KEYS.PAPER_SIZE, 'invoice.paper_size'], 'thermal') as
        | 'thermal'
        | 'a4'
        | 'a5',
      logo: toStr([INVOICE_SETTING_KEYS.LOGO], ''),
      footerNotes: toStr([INVOICE_SETTING_KEYS.FOOTER_NOTES, 'invoice.footer_notes'], ''),
      layoutDirection: toStr([INVOICE_SETTING_KEYS.LAYOUT_DIRECTION], 'rtl') as 'rtl' | 'ltr',
      showQr: toBool([INVOICE_SETTING_KEYS.SHOW_QR, 'invoice.show_qr'], false),
      showBarcode: toBool([INVOICE_SETTING_KEYS.SHOW_BARCODE], false),
    };

    const wizardCompleted = toBool(
      [SETUP_SETTING_KEYS.WIZARD_COMPLETED, 'setup.wizard_completed'],
      false
    );

    return { modules, notifications, invoice, wizardCompleted };
  }
}
