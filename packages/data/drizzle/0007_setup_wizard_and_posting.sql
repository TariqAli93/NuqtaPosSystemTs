-- Migration: Setup wizard module settings + posting batches
-- Seeds default module toggle settings for the setup wizard

-- Posting batches table for batch-posting journal entries
CREATE TABLE IF NOT EXISTS `posting_batches` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `period_type` TEXT NOT NULL DEFAULT 'day',
  `period_start` TEXT NOT NULL,
  `period_end` TEXT NOT NULL,
  `entries_count` INTEGER NOT NULL DEFAULT 0,
  `total_amount` INTEGER NOT NULL DEFAULT 0,
  `posted_at` TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  `posted_by` INTEGER,
  `notes` TEXT,
  `created_at` TEXT DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_posting_batches_period` ON `posting_batches` (`period_type`, `period_start`, `period_end`);
--> statement-breakpoint

-- Add postingBatchId to journal_entries
ALTER TABLE `journal_entries` ADD `posting_batch_id` INTEGER REFERENCES `posting_batches`(`id`);
--> statement-breakpoint

-- Seed default module toggle settings (only if not already present)
INSERT OR IGNORE INTO `settings` (`key`, `value`, `description`) VALUES
  ('modules.accounting.enabled', 'false', 'Enable double-entry accounting module'),
  ('modules.purchases.enabled', 'true', 'Enable purchases and suppliers module'),
  ('modules.ledgers.enabled', 'true', 'Enable customer AR / supplier AP ledgers'),
  ('modules.units.enabled', 'false', 'Enable product unit conversions (carton/dozen/box)'),
  ('modules.payments_on_invoices.enabled', 'true', 'Enable partial payments on invoices'),
  ('notifications.low_stock_threshold', '5', 'Low stock alert threshold'),
  ('notifications.expiry_days', '30', 'Expiry alert days before expiration'),
  ('notifications.debt_reminder_interval', '7', 'Debt reminder interval in days'),
  ('invoice.prefix', 'INV', 'Invoice number prefix'),
  ('invoice.paper_size', 'thermal', 'Invoice paper size: thermal, a4, a5'),
  ('invoice.logo', '', 'Invoice logo path'),
  ('invoice.footer_notes', '', 'Invoice footer notes'),
  ('invoice.show_qr', 'false', 'Show QR code on invoice'),
  ('setup.wizard_completed', 'false', 'Whether setup wizard has been completed');
