CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_item_events` (
	`id` text PRIMARY KEY NOT NULL,
	`work_item_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_item_events_work_item_id` ON `work_item_events` (`work_item_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `work_item_links` (
	`id` text PRIMARY KEY NOT NULL,
	`work_item_id` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_item_links_work_item_id` ON `work_item_links` (`work_item_id`);--> statement-breakpoint
CREATE TABLE `work_item_projects` (
	`work_item_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`work_item_id`, `project_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_work_item_projects_project_id` ON `work_item_projects` (`project_id`,`work_item_id`);--> statement-breakpoint
CREATE TABLE `work_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`parent_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`workflow_stage` text DEFAULT 'backlog' NOT NULL,
	`assignee_id` text,
	`due_date` text,
	`rank` text NOT NULL,
	`source_log_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_work_items_rank_unique` ON `work_items` (`rank`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_work_items_source_log_unique` ON `work_items` (`source_log_id`);--> statement-breakpoint
CREATE INDEX `idx_work_items_parent_id` ON `work_items` (`parent_id`);