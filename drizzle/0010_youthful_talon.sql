CREATE INDEX `idx_import_suggestions_status_created_at` ON `import_suggestions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_type_occurred_at` ON `log_entries` (`type`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_status_occurred_at` ON `log_entries` (`status`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_work_items_stage_rank` ON `work_items` (`workflow_stage`,`rank`);