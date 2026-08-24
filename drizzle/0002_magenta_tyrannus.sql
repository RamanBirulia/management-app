CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`occurred_at` text NOT NULL,
	`status` text,
	`assignee_id` text,
	`due_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `log_people` (
	`log_id` text NOT NULL,
	`person_id` text NOT NULL,
	PRIMARY KEY(`log_id`, `person_id`)
);
--> statement-breakpoint
CREATE TABLE `log_projects` (
	`log_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`log_id`, `project_id`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`log_id` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL
);
