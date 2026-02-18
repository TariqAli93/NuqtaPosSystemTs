CREATE INDEX `idx_print_jobs_product` ON `barcode_print_jobs` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_sale` ON `payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_purchase` ON `payments` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_customer` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_supplier` ON `payments` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_supp_ledger_date` ON `supplier_ledger` (`created_at`);