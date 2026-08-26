PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`status` text,
	`assignee_id` text,
	`due_date` text,
	`completed_at` text,
	`completed_by_person_id` text,
	`resolved_at` text,
	`resolved_by_person_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text,
	`updated_by` text,
	FOREIGN KEY (`assignee_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`completed_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resolved_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_log_entries`("id", "type", "content", "description", "occurred_at", "status", "assignee_id", "due_date", "completed_at", "completed_by_person_id", "resolved_at", "resolved_by_person_id", "created_at", "updated_at", "created_by", "updated_by") SELECT "id", "type", "content", "description", "occurred_at", "status", "assignee_id", "due_date", "completed_at", "completed_by_person_id", "resolved_at", "resolved_by_person_id", "created_at", "updated_at", "created_by", "updated_by" FROM `log_entries`;--> statement-breakpoint
DROP TABLE `log_entries`;--> statement-breakpoint
ALTER TABLE `__new_log_entries` RENAME TO `log_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_log_entries_occurred_at` ON `log_entries` (`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_type_occurred_at` ON `log_entries` (`type`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_status_occurred_at` ON `log_entries` (`status`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_completed_at` ON `log_entries` (`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_log_entries_resolved_at` ON `log_entries` (`resolved_at`);