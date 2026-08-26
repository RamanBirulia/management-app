PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `log_sync_outbox` (
	`log_id` text PRIMARY KEY NOT NULL,
	`attempts` text DEFAULT '0' NOT NULL,
	`last_error` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `import_batches` ADD `created_by` text;--> statement-breakpoint
CREATE TABLE `__new_import_suggestions` (
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
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonical_log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_import_suggestions`("id", "batch_id", "type", "content", "description", "occurred_at", "status", "external_key", "external_url", "canonical_log_id", "reviewed_by", "reviewed_at", "created_at") SELECT "id", "batch_id", "type", "content", "description", "occurred_at", "status", "external_key", "external_url", "canonical_log_id", NULL, "reviewed_at", "created_at" FROM `import_suggestions`;--> statement-breakpoint
DROP TABLE `import_suggestions`;--> statement-breakpoint
ALTER TABLE `__new_import_suggestions` RENAME TO `import_suggestions`;--> statement-breakpoint
CREATE INDEX `idx_import_suggestions_batch_id` ON `import_suggestions` (`batch_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_import_suggestions_external_unique` ON `import_suggestions` (`external_key`);--> statement-breakpoint
ALTER TABLE `log_entries` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `updated_by` text;--> statement-breakpoint
CREATE TABLE `__new_work_item_events` (
	`id` text PRIMARY KEY NOT NULL,
	`work_item_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`actor_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_work_item_events`("id", "work_item_id", "kind", "payload", "actor_id", "created_at") SELECT "id", "work_item_id", "kind", "payload", NULL, "created_at" FROM `work_item_events`;--> statement-breakpoint
DROP TABLE `work_item_events`;--> statement-breakpoint
ALTER TABLE `__new_work_item_events` RENAME TO `work_item_events`;--> statement-breakpoint
CREATE INDEX `idx_work_item_events_work_item_id` ON `work_item_events` (`work_item_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_log_people` (
	`log_id` text NOT NULL,
	`person_id` text NOT NULL,
	PRIMARY KEY(`log_id`, `person_id`),
	FOREIGN KEY (`log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_log_people`("log_id", "person_id") SELECT "log_id", "person_id" FROM `log_people`;--> statement-breakpoint
DROP TABLE `log_people`;--> statement-breakpoint
ALTER TABLE `__new_log_people` RENAME TO `log_people`;--> statement-breakpoint
CREATE INDEX `idx_log_people_person_id` ON `log_people` (`person_id`,`log_id`);--> statement-breakpoint
CREATE TABLE `__new_log_projects` (
	`log_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`log_id`, `project_id`),
	FOREIGN KEY (`log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_log_projects`("log_id", "project_id") SELECT "log_id", "project_id" FROM `log_projects`;--> statement-breakpoint
DROP TABLE `log_projects`;--> statement-breakpoint
ALTER TABLE `__new_log_projects` RENAME TO `log_projects`;--> statement-breakpoint
CREATE INDEX `idx_log_projects_project_id` ON `log_projects` (`project_id`,`log_id`);--> statement-breakpoint
CREATE TABLE `__new_log_teams` (
	`log_id` text NOT NULL,
	`team_id` text NOT NULL,
	PRIMARY KEY(`log_id`, `team_id`),
	FOREIGN KEY (`log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_log_teams`("log_id", "team_id") SELECT "log_id", "team_id" FROM `log_teams`;--> statement-breakpoint
DROP TABLE `log_teams`;--> statement-breakpoint
ALTER TABLE `__new_log_teams` RENAME TO `log_teams`;--> statement-breakpoint
CREATE INDEX `idx_log_teams_team_id` ON `log_teams` (`team_id`,`log_id`);--> statement-breakpoint
CREATE TABLE `__new_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`log_id` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sources`("id", "log_id", "label", "url") SELECT "id", "log_id", "label", "url" FROM `sources`;--> statement-breakpoint
DROP TABLE `sources`;--> statement-breakpoint
ALTER TABLE `__new_sources` RENAME TO `sources`;--> statement-breakpoint
CREATE INDEX `idx_sources_log_id` ON `sources` (`log_id`);--> statement-breakpoint
CREATE TABLE `__new_team_people` (
	`team_id` text NOT NULL,
	`person_id` text NOT NULL,
	PRIMARY KEY(`team_id`, `person_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_team_people`("team_id", "person_id") SELECT "team_id", "person_id" FROM `team_people`;--> statement-breakpoint
DROP TABLE `team_people`;--> statement-breakpoint
ALTER TABLE `__new_team_people` RENAME TO `team_people`;--> statement-breakpoint
CREATE INDEX `idx_team_people_person_id` ON `team_people` (`person_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `__new_work_item_links` (
	`id` text PRIMARY KEY NOT NULL,
	`work_item_id` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_work_item_links`("id", "work_item_id", "label", "url") SELECT "id", "work_item_id", "label", "url" FROM `work_item_links`;--> statement-breakpoint
DROP TABLE `work_item_links`;--> statement-breakpoint
ALTER TABLE `__new_work_item_links` RENAME TO `work_item_links`;--> statement-breakpoint
CREATE INDEX `idx_work_item_links_work_item_id` ON `work_item_links` (`work_item_id`);--> statement-breakpoint
CREATE TABLE `__new_work_item_projects` (
	`work_item_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`work_item_id`, `project_id`),
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_work_item_projects`("work_item_id", "project_id") SELECT "work_item_id", "project_id" FROM `work_item_projects`;--> statement-breakpoint
DROP TABLE `work_item_projects`;--> statement-breakpoint
ALTER TABLE `__new_work_item_projects` RENAME TO `work_item_projects`;--> statement-breakpoint
CREATE INDEX `idx_work_item_projects_project_id` ON `work_item_projects` (`project_id`,`work_item_id`);--> statement-breakpoint
CREATE TABLE `__new_work_items` (
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
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assignee_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_log_id`) REFERENCES `log_entries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_work_items`("id", "title", "description", "parent_id", "status", "workflow_stage", "assignee_id", "due_date", "rank", "source_log_id", "created_at", "updated_at") SELECT "id", "title", "description", "parent_id", "status", "workflow_stage", "assignee_id", "due_date", "rank", "source_log_id", "created_at", "updated_at" FROM `work_items`;--> statement-breakpoint
DROP TABLE `work_items`;--> statement-breakpoint
ALTER TABLE `__new_work_items` RENAME TO `work_items`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_work_items_rank_unique` ON `work_items` (`rank`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_work_items_source_log_unique` ON `work_items` (`source_log_id`);--> statement-breakpoint
CREATE INDEX `idx_work_items_parent_id` ON `work_items` (`parent_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
PRAGMA foreign_key_check;
--> statement-breakpoint
PRAGMA optimize;
