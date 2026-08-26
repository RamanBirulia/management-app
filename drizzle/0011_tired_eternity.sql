CREATE TRIGGER `fk_log_entries_insert` BEFORE INSERT ON `log_entries` BEGIN
  SELECT CASE WHEN NEW.assignee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.assignee_id) THEN RAISE(ABORT, 'log assignee missing') END;
  SELECT CASE WHEN NEW.completed_by_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.completed_by_person_id) THEN RAISE(ABORT, 'log completer missing') END;
  SELECT CASE WHEN NEW.resolved_by_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.resolved_by_person_id) THEN RAISE(ABORT, 'log resolver missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_log_entries_update` BEFORE UPDATE OF assignee_id, completed_by_person_id, resolved_by_person_id ON `log_entries` BEGIN
  SELECT CASE WHEN NEW.assignee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.assignee_id) THEN RAISE(ABORT, 'log assignee missing') END;
  SELECT CASE WHEN NEW.completed_by_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.completed_by_person_id) THEN RAISE(ABORT, 'log completer missing') END;
  SELECT CASE WHEN NEW.resolved_by_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.resolved_by_person_id) THEN RAISE(ABORT, 'log resolver missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_work_items_insert` BEFORE INSERT ON `work_items` BEGIN
  SELECT CASE WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM work_items WHERE id = NEW.parent_id) THEN RAISE(ABORT, 'work item parent missing') END;
  SELECT CASE WHEN NEW.assignee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.assignee_id) THEN RAISE(ABORT, 'work item assignee missing') END;
  SELECT CASE WHEN NEW.source_log_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.source_log_id) THEN RAISE(ABORT, 'work item source log missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_work_items_update` BEFORE UPDATE OF parent_id, assignee_id, source_log_id ON `work_items` BEGIN
  SELECT CASE WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM work_items WHERE id = NEW.parent_id) THEN RAISE(ABORT, 'work item parent missing') END;
  SELECT CASE WHEN NEW.assignee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM people WHERE id = NEW.assignee_id) THEN RAISE(ABORT, 'work item assignee missing') END;
  SELECT CASE WHEN NEW.source_log_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.source_log_id) THEN RAISE(ABORT, 'work item source log missing') END;
END;--> statement-breakpoint
CREATE TRIGGER `fk_import_suggestions_update` BEFORE UPDATE OF batch_id, canonical_log_id ON `import_suggestions` BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM import_batches WHERE id = NEW.batch_id) THEN RAISE(ABORT, 'import batch missing') END;
  SELECT CASE WHEN NEW.canonical_log_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM log_entries WHERE id = NEW.canonical_log_id) THEN RAISE(ABORT, 'canonical log missing') END;
END;--> statement-breakpoint
PRAGMA optimize;
