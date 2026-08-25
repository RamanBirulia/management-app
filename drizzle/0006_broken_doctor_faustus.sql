CREATE TABLE `log_teams` (
	`log_id` text NOT NULL,
	`team_id` text NOT NULL,
	PRIMARY KEY(`log_id`, `team_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_log_teams_team_id` ON `log_teams` (`team_id`,`log_id`);--> statement-breakpoint
CREATE TABLE `team_people` (
	`team_id` text NOT NULL,
	`person_id` text NOT NULL,
	PRIMARY KEY(`team_id`, `person_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_team_people_person_id` ON `team_people` (`person_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`alias` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_teams_alias_unique` ON `teams` (`alias`);