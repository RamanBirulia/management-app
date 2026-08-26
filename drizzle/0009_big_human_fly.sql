CREATE TABLE `log_sync_outbox` (
  `log_id` text PRIMARY KEY NOT NULL,
  `attempts` text DEFAULT '0' NOT NULL,
  `last_error` text,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
ALTER TABLE `import_batches` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `import_suggestions` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `log_entries` ADD `updated_by` text;--> statement-breakpoint
ALTER TABLE `work_item_events` ADD `actor_id` text;--> statement-breakpoint

CREATE TRIGGER `fk_log_people_insert` BEFORE INSERT ON `log_people` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.log_id) OR NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.person_id) THEN RAISE(ABORT, 'log_people reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_log_projects_insert` BEFORE INSERT ON `log_projects` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.log_id) OR NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) THEN RAISE(ABORT, 'log_projects reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_log_teams_insert` BEFORE INSERT ON `log_teams` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.log_id) OR NOT EXISTS (SELECT 1 FROM teams WHERE id = NEW.team_id) THEN RAISE(ABORT, 'log_teams reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_sources_insert` BEFORE INSERT ON `sources` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.log_id) THEN RAISE(ABORT, 'source log missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_team_people_insert` BEFORE INSERT ON `team_people` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM teams WHERE id = NEW.team_id) OR NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.person_id) THEN RAISE(ABORT, 'team membership reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_work_item_projects_insert` BEFORE INSERT ON `work_item_projects` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM work_items WHERE id = NEW.work_item_id) OR NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) THEN RAISE(ABORT, 'work item project reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_work_item_links_insert` BEFORE INSERT ON `work_item_links` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM work_items WHERE id = NEW.work_item_id) THEN RAISE(ABORT, 'work item link reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_work_item_events_insert` BEFORE INSERT ON `work_item_events` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM work_items WHERE id = NEW.work_item_id) THEN RAISE(ABORT, 'work item event reference missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_import_suggestions_insert` BEFORE INSERT ON `import_suggestions` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM import_batches WHERE id = NEW.batch_id) THEN RAISE(ABORT, 'import batch missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_log_sync_outbox_insert` BEFORE INSERT ON `log_sync_outbox` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.log_id) THEN RAISE(ABORT, 'outbox log missing') END;
END;--> statement-breakpoint

CREATE TRIGGER `cascade_log_delete` AFTER DELETE ON `log_entries` BEGIN
  DELETE FROM log_people WHERE log_id = OLD.id;
  DELETE FROM log_projects WHERE log_id = OLD.id;
  DELETE FROM log_teams WHERE log_id = OLD.id;
  DELETE FROM sources WHERE log_id = OLD.id;
  DELETE FROM log_sync_outbox WHERE log_id = OLD.id;
  UPDATE work_items SET source_log_id = NULL WHERE source_log_id = OLD.id;
  UPDATE import_suggestions SET canonical_log_id = NULL WHERE canonical_log_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER `cascade_work_item_delete` AFTER DELETE ON `work_items` BEGIN
  DELETE FROM work_item_projects WHERE work_item_id = OLD.id;
  DELETE FROM work_item_links WHERE work_item_id = OLD.id;
  DELETE FROM work_item_events WHERE work_item_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER `restrict_work_item_parent_delete` BEFORE DELETE ON `work_items` BEGIN
  SELECT CASE WHEN EXISTS (SELECT 1 FROM work_items WHERE parent_id = OLD.id) THEN RAISE(ABORT, 'work item has children') END;
END;--> statement-breakpoint
CREATE TRIGGER `cascade_person_delete` AFTER DELETE ON `people` BEGIN
  DELETE FROM team_people WHERE person_id = OLD.id;
  DELETE FROM log_people WHERE person_id = OLD.id;
  UPDATE log_entries SET assignee_id = NULL, completed_by_person_id = CASE WHEN completed_by_person_id = OLD.id THEN NULL ELSE completed_by_person_id END, resolved_by_person_id = CASE WHEN resolved_by_person_id = OLD.id THEN NULL ELSE resolved_by_person_id END WHERE assignee_id = OLD.id OR completed_by_person_id = OLD.id OR resolved_by_person_id = OLD.id;
  UPDATE work_items SET assignee_id = NULL WHERE assignee_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER `cascade_project_delete` AFTER DELETE ON `projects` BEGIN
  DELETE FROM log_projects WHERE project_id = OLD.id;
  DELETE FROM work_item_projects WHERE project_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER `cascade_team_delete` AFTER DELETE ON `teams` BEGIN
  DELETE FROM team_people WHERE team_id = OLD.id;
  DELETE FROM log_teams WHERE team_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER `cascade_import_batch_delete` AFTER DELETE ON `import_batches` BEGIN
  DELETE FROM import_suggestions WHERE batch_id = OLD.id;
END;--> statement-breakpoint
PRAGMA optimize;
