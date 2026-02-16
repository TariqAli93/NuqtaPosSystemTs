ALTER TABLE `payments` ADD `reference_number` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `status` text DEFAULT 'completed' NOT NULL;