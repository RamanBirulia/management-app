ALTER TABLE `log_entries` ADD `completed_at` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `completed_by_person_id` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `resolved_at` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `resolved_by_person_id` text;--> statement-breakpoint
CREATE INDEX `idx_log_entries_completed_at` ON `log_entries` (`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_resolved_at` ON `log_entries` (`resolved_at`);