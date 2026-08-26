CREATE TABLE `log_sync_outbox` (
  `log_id` text PRIMARY KEY NOT NULL,
  `attempts` text DEFAULT '0' NOT NULL,
  `last_error` text,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
ALTER TABLE `import_batches` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `import_suggestions` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `updated_by` text;--> statement-breakpoint
ALTER TABLE `work_item_events` ADD `actor_id` text;--> statement-breakpoint
PRAGMA optimize;
