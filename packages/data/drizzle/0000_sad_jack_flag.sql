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
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`city` text,
	`notes` text,
	`total_purchases` real DEFAULT 0,
	`total_debt` real DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `installments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer,
	`customer_id` integer,
	`installment_number` integer NOT NULL,
	`due_amount` real NOT NULL,
	`paid_amount` real DEFAULT 0,
	`remaining_amount` real NOT NULL,
	`currency` text DEFAULT 'IQD' NOT NULL,
	`due_date` text NOT NULL,
	`paid_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer,
	`customer_id` integer,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`exchange_rate` real DEFAULT 1,
	`payment_method` text NOT NULL,
	`payment_date` text DEFAULT (datetime('now','localtime')),
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`barcode` text,
	`category_id` integer,
	`description` text,
	`cost_price` real NOT NULL,
	`selling_price` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`stock` integer DEFAULT 0,
	`min_stock` integer DEFAULT 0,
	`unit` text DEFAULT 'piece',
	`supplier` text,
	`status` text DEFAULT 'available' NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`discount` real DEFAULT 0,
	`subtotal` real NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` integer,
	`subtotal` real NOT NULL,
	`discount` real DEFAULT 0,
	`tax` real DEFAULT 0,
	`total` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`exchange_rate` real DEFAULT 1,
	`interest_rate` real DEFAULT 0,
	`interest_amount` real DEFAULT 0,
	`payment_type` text NOT NULL,
	`paid_amount` real DEFAULT 0,
	`remaining_amount` real DEFAULT 0,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`created_by` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` text DEFAULT (datetime('now','localtime')),
	`updated_by` integer
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
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `currency_settings_currency_code_unique` ON `currency_settings` (`currency_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_number_unique` ON `sales` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);