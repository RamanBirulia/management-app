CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`format_version` text DEFAULT '1' NOT NULL,
	`source_system` text DEFAULT 'manual' NOT NULL,
	`title` text DEFAULT 'Import' NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_import_batches_idempotency_unique` ON `import_batches` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `import_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`external_key` text,
	`external_url` text,
	`canonical_log_id` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_import_suggestions_batch_id` ON `import_suggestions` (`batch_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_import_suggestions_external_unique` ON `import_suggestions` (`external_key`);