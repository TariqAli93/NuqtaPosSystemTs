ALTER TABLE `sales` ADD `idempotency_key` text;
--> statement-breakpoint
ALTER TABLE `purchases` ADD `idempotency_key` text;
--> statement-breakpoint
ALTER TABLE `payments` ADD `idempotency_key` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sales_idempotency` ON `sales` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_purchases_idempotency` ON `purchases` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_idempotency` ON `payments` (`idempotency_key`);
