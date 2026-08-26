ALTER TABLE `log_entries` ADD `import_suggestion_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_log_entries_import_suggestion_unique` ON `log_entries` (`import_suggestion_id`);