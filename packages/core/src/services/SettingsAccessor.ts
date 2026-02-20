// ═══════════════════════════════════════════════════════════════
// Settings Accessor — Typed, domain-grouped settings access
// Wraps the flat KV settings store with typed getters
// ═══════════════════════════════════════════════════════════════

import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';

export class SettingsAccessor {
  constructor(private repo: ISettingsRepository) {}

  // ── System ──────────────────────────────────────────────────
  getLanguage(): string {
    return this.repo.get('system.language') || 'ar';
  }

  getTimezone(): string {
    return this.repo.get('system.timezone') || 'Asia/Baghdad';
  }

  getBackupPath(): string | null {
    return this.repo.get('system.backupPath');
  }

  // ── POS ─────────────────────────────────────────────────────
  getDefaultPaymentMethod(): string {
    return this.repo.get('pos.defaultPaymentMethod') || 'cash';
  }

  isPrinterEnabled(): boolean {
    return this.repo.get('pos.printerEnabled') !== 'false';
  }

  isAutoGenerateInvoice(): boolean {
    return this.repo.get('pos.autoGenerateInvoice') !== 'false';
  }

  // ── Accounting ──────────────────────────────────────────────
  isAccountingEnabled(): boolean {
    const value =
      this.repo.get('accounting.enabled') ?? this.repo.get('modules.accounting.enabled');
    return value !== 'false';
  }

  isLedgersEnabled(): boolean {
    const value = this.repo.get('ledgers.enabled') ?? this.repo.get('modules.ledgers.enabled');
    return value !== 'false';
  }

  isUnitsEnabled(): boolean {
    const value = this.repo.get('units.enabled') ?? this.repo.get('modules.units.enabled');
    return value !== 'false';
  }

  getFiscalYearStart(): string {
    return this.repo.get('accounting.fiscalYearStart') || '01-01';
  }

  getBaseCurrency(): string {
    return this.repo.get('currency.base') || 'IQD';
  }

  // ── Barcode ─────────────────────────────────────────────────
  getDefaultTemplateId(): number | null {
    const value = this.repo.get('barcode.defaultTemplateId');
    return value ? parseInt(value, 10) : null;
  }

  getBarcodePrinterType(): string {
    return this.repo.get('barcode.printerType') || 'thermal';
  }

  getBarcodeDpi(): number {
    const value = this.repo.get('barcode.dpi');
    return value ? parseInt(value, 10) : 203;
  }

  // ── Notifications ───────────────────────────────────────────
  isLowStockNotificationEnabled(): boolean {
    const value =
      this.repo.get('notifications.lowStock') ?? this.repo.get('modules.notifications.lowStock');
    return value !== 'false';
  }

  isExpiryAlertEnabled(): boolean {
    const value =
      this.repo.get('notifications.expiryAlerts') ??
      this.repo.get('modules.notifications.expiryAlerts');
    return value !== 'false';
  }

  // ── Invoice ─────────────────────────────────────────────────
  isShowLogoOnInvoice(): boolean {
    const value = this.repo.get('invoice.showLogo') ?? this.repo.get('modules.invoice.showLogo');
    return value !== 'false';
  }

  getInvoiceFooterText(): string {
    return (
      this.repo.get('invoice.footerText') ??
      this.repo.get('modules.invoice.footerText') ??
      'شكراً لتسوقكم'
    );
  }

  // ── Generic getter for custom keys ──────────────────────────
  get(key: string): string | null {
    return this.repo.get(key);
  }

  set(key: string, value: string): void {
    this.repo.set(key, value);
  }
}
