CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`name_ar` text,
	`account_type` text NOT NULL,
	`parent_id` integer,
	`is_system` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`balance` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_unique` ON `accounts` (`code`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`timestamp` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`changed_fields` text,
	`change_description` text,
	`ip_address` text,
	`user_agent` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `barcode_print_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`barcode` text,
	`price` integer,
	`expiry_date` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`printed_at` text,
	`print_error` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE INDEX `idx_print_jobs_status` ON `barcode_print_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_print_jobs_product` ON `barcode_print_jobs` (`product_id`);--> statement-breakpoint
CREATE TABLE `barcode_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`barcode_type` text DEFAULT 'CODE128' NOT NULL,
	`show_price` integer DEFAULT true,
	`show_name` integer DEFAULT true,
	`show_barcode` integer DEFAULT true,
	`show_expiry` integer DEFAULT false,
	`layout_json` text,
	`is_default` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `currency_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`currency_code` text NOT NULL,
	`currency_name` text NOT NULL,
	`symbol` text NOT NULL,
	`exchange_rate` real NOT NULL,
	`is_base_currency` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `currency_settings_currency_code_unique` ON `currency_settings` (`currency_code`);--> statement-breakpoint
CREATE TABLE `customer_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`sale_id` integer,
	`payment_id` integer,
	`journal_entry_id` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE INDEX `idx_cust_ledger_customer` ON `customer_ledger` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_cust_ledger_date` ON `customer_ledger` (`created_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`city` text,
	`notes` text,
	`total_purchases` integer DEFAULT 0,
	`total_debt` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`batch_id` integer,
	`movement_type` text NOT NULL,
	`reason` text NOT NULL,
	`quantity_base` integer NOT NULL,
	`unit_name` text DEFAULT 'piece',
	`unit_factor` integer DEFAULT 1,
	`stock_before` integer NOT NULL,
	`stock_after` integer NOT NULL,
	`cost_per_unit` integer,
	`total_cost` integer,
	`source_type` text,
	`source_id` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE INDEX `idx_inv_mov_product` ON `inventory_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_inv_mov_date` ON `inventory_movements` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inv_mov_source` ON `inventory_movements` (`source_type`,`source_id`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_number` text NOT NULL,
	`entry_date` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`description` text NOT NULL,
	`source_type` text,
	`source_id` integer,
	`is_posted` integer DEFAULT false,
	`is_reversed` integer DEFAULT false,
	`reversal_of_id` integer,
	`posting_batch_id` integer,
	`total_amount` integer NOT NULL,
	`currency` text DEFAULT 'IQD' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_entry_number_unique` ON `journal_entries` (`entry_number`);--> statement-breakpoint
CREATE INDEX `idx_journal_date` ON `journal_entries` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_journal_source` ON `journal_entries` (`source_type`,`source_id`);--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`debit` integer DEFAULT 0,
	`credit` integer DEFAULT 0,
	`description` text,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_journal_lines_entry` ON `journal_lines` (`journal_entry_id`);--> statement-breakpoint
CREATE INDEX `idx_journal_lines_account` ON `journal_lines` (`account_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer,
	`purchase_id` integer,
	`customer_id` integer,
	`supplier_id` integer,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'IQD' NOT NULL,
	`exchange_rate` real DEFAULT 1,
	`payment_method` text NOT NULL,
	`reference_number` text,
	`idempotency_key` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`payment_date` text DEFAULT (datetime('now','localtime')),
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE INDEX `idx_payments_sale` ON `payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_purchase` ON `payments` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_customer` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_supplier` ON `payments` (`supplier_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_idempotency` ON `payments` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `posting_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_type` text DEFAULT 'day' NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`entries_count` integer DEFAULT 0 NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`posted_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`posted_by` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_posting_batches_period` ON `posting_batches` (`period_type`,`period_start`,`period_end`);--> statement-breakpoint
CREATE TABLE `product_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`batch_number` text NOT NULL,
	`expiry_date` text,
	`manufacturing_date` text,
	`quantity_received` integer NOT NULL,
	`quantity_on_hand` integer NOT NULL,
	`cost_per_unit` integer,
	`purchase_id` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_batches_product` ON `product_batches` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_batches_expiry` ON `product_batches` (`expiry_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_batches_unique` ON `product_batches` (`product_id`,`batch_number`);--> statement-breakpoint
CREATE TABLE `product_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`unit_name` text NOT NULL,
	`factor_to_base` integer DEFAULT 1 NOT NULL,
	`barcode` text,
	`selling_price` integer,
	`is_default` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_product_units_product` ON `product_units` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_units_unique` ON `product_units` (`product_id`,`unit_name`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`barcode` text,
	`category_id` integer,
	`description` text,
	`cost_price` integer NOT NULL,
	`selling_price` integer NOT NULL,
	`currency` text DEFAULT 'IQD' NOT NULL,
	`stock` integer DEFAULT 0,
	`min_stock` integer DEFAULT 0,
	`unit` text DEFAULT 'piece',
	`supplier` text,
	`supplier_id` integer,
	`expire_date` text,
	`is_expire` integer DEFAULT false,
	`status` text DEFAULT 'available' NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`unit_name` text DEFAULT 'piece',
	`unit_factor` integer DEFAULT 1,
	`quantity` integer NOT NULL,
	`quantity_base` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`line_subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0,
	`batch_id` integer,
	`expiry_date` text,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_items_purchase` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_items_product` ON `purchase_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0,
	`tax` integer DEFAULT 0,
	`total` integer NOT NULL,
	`paid_amount` integer DEFAULT 0,
	`remaining_amount` integer DEFAULT 0,
	`currency` text DEFAULT 'IQD' NOT NULL,
	`exchange_rate` real DEFAULT 1,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`received_at` text,
	`idempotency_key` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE INDEX `idx_purchases_supplier` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_purchases_invoice_supplier` ON `purchases` (`invoice_number`,`supplier_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_purchases_idempotency` ON `purchases` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `sale_item_depletions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`sale_item_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`batch_id` integer NOT NULL,
	`quantity_base` integer NOT NULL,
	`cost_per_unit` integer NOT NULL,
	`total_cost` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_sale_item_depletions_sale` ON `sale_item_depletions` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_item_depletions_item` ON `sale_item_depletions` (`sale_item_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_item_depletions_batch` ON `sale_item_depletions` (`batch_id`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_name` text DEFAULT 'piece',
	`unit_factor` integer DEFAULT 1,
	`quantity_base` integer,
	`batch_id` integer,
	`unit_price` integer NOT NULL,
	`discount` integer DEFAULT 0,
	`subtotal` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` integer,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0,
	`tax` integer DEFAULT 0,
	`total` integer NOT NULL,
	`currency` text DEFAULT 'IQD' NOT NULL,
	`exchange_rate` real DEFAULT 1,
	`interest_rate` real DEFAULT 0,
	`interest_amount` integer DEFAULT 0,
	`payment_type` text NOT NULL,
	`paid_amount` integer DEFAULT 0,
	`remaining_amount` integer DEFAULT 0,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`idempotency_key` text,
	`print_status` text DEFAULT 'pending' NOT NULL,
	`printed_at` text,
	`print_error` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_number_unique` ON `sales` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_idempotency_key_unique` ON `sales` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`updated_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `supplier_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`purchase_id` integer,
	`payment_id` integer,
	`journal_entry_id` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE INDEX `idx_supp_ledger_supplier` ON `supplier_ledger` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_supp_ledger_date` ON `supplier_ledger` (`created_at`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`phone2` text,
	`address` text,
	`city` text,
	`notes` text,
	`opening_balance` integer DEFAULT 0,
	`current_balance` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`role` text DEFAULT 'cashier' NOT NULL,
	`is_active` integer DEFAULT true,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);