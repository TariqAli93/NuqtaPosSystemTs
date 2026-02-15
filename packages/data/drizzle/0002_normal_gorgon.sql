ALTER TABLE sales ADD `print_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE sales ADD `print_error` text;--> statement-breakpoint
ALTER TABLE `sales` DROP COLUMN `receipt_printed`;