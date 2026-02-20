-- Migration: canonical setup/settings keys for wizard + module gating
-- Keep old keys for compatibility while introducing canonical keys used by new code.

INSERT OR IGNORE INTO `settings` (`key`, `value`, `description`) VALUES
  ('accounting.enabled', 'false', 'Enable double-entry accounting module'),
  ('purchases.enabled', 'true', 'Enable purchases and suppliers module'),
  ('ledgers.enabled', 'true', 'Enable customer AR / supplier AP ledgers'),
  ('units.enabled', 'false', 'Enable product unit conversions'),
  ('paymentsOnInvoices.enabled', 'true', 'Enable partial payments on invoices'),
  ('notifications.lowStockThreshold', '5', 'Low stock alert threshold'),
  ('notifications.expiryDays', '30', 'Expiry alert days before expiration'),
  ('notifications.debtReminderCount', '3', 'Debt reminder count per cycle'),
  ('notifications.debtReminderIntervalDays', '7', 'Debt reminder interval in days'),
  ('invoice.template.activeId', 'default', 'Active invoice template id'),
  ('invoice.series.prefix', 'INV', 'Invoice number prefix'),
  ('invoice.paperSize', 'thermal', 'Invoice paper size: thermal, a4, a5'),
  ('invoice.footerNotes', '', 'Invoice footer notes'),
  ('invoice.showQr', 'false', 'Show QR code on invoice'),
  ('invoice.showBarcode', 'false', 'Show barcode on invoice'),
  ('invoice.layoutDirection', 'rtl', 'Invoice print direction'),
  ('setup.wizardCompleted', 'false', 'Whether setup wizard has been completed');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'modules.accounting.enabled')
WHERE `key` = 'accounting.enabled'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'modules.accounting.enabled');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'modules.purchases.enabled')
WHERE `key` = 'purchases.enabled'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'modules.purchases.enabled');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'modules.ledgers.enabled')
WHERE `key` = 'ledgers.enabled'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'modules.ledgers.enabled');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'modules.units.enabled')
WHERE `key` = 'units.enabled'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'modules.units.enabled');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'modules.payments_on_invoices.enabled')
WHERE `key` = 'paymentsOnInvoices.enabled'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'modules.payments_on_invoices.enabled');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'notifications.low_stock_threshold')
WHERE `key` = 'notifications.lowStockThreshold'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'notifications.low_stock_threshold');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'notifications.expiry_days')
WHERE `key` = 'notifications.expiryDays'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'notifications.expiry_days');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'notifications.debt_reminder_interval')
WHERE `key` = 'notifications.debtReminderIntervalDays'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'notifications.debt_reminder_interval');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'invoice.prefix')
WHERE `key` = 'invoice.series.prefix'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'invoice.prefix');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'invoice.paper_size')
WHERE `key` = 'invoice.paperSize'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'invoice.paper_size');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'invoice.footer_notes')
WHERE `key` = 'invoice.footerNotes'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'invoice.footer_notes');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'invoice.show_qr')
WHERE `key` = 'invoice.showQr'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'invoice.show_qr');
--> statement-breakpoint

UPDATE `settings`
SET `value` = (SELECT `value` FROM `settings` WHERE `key` = 'setup.wizard_completed')
WHERE `key` = 'setup.wizardCompleted'
  AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'setup.wizard_completed');
