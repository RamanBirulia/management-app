CREATE INDEX `idx_log_entries_occurred_at` ON `log_entries` (`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_log_people_person_id` ON `log_people` (`person_id`,`log_id`);--> statement-breakpoint
CREATE INDEX `idx_log_projects_project_id` ON `log_projects` (`project_id`,`log_id`);--> statement-breakpoint
CREATE INDEX `idx_sources_log_id` ON `sources` (`log_id`);