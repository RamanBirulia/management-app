CREATE TABLE `planning_scope_projects` (
	`scope_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`scope_id`, `project_id`),
	FOREIGN KEY (`scope_id`) REFERENCES `planning_scopes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_planning_scope_projects_project` ON `planning_scope_projects` (`project_id`,`scope_id`);--> statement-breakpoint
CREATE TABLE `planning_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_planning_scopes_team_unique` ON `planning_scopes` (`team_id`);--> statement-breakpoint
ALTER TABLE `work_items` ADD `design_owner_id` text REFERENCES people(id);--> statement-breakpoint
ALTER TABLE `work_items` ADD `design_draft_url` text;--> statement-breakpoint
ALTER TABLE `work_items` ADD `design_target_date` text;--> statement-breakpoint
ALTER TABLE `work_items` ADD `readiness_note` text DEFAULT '' NOT NULL;