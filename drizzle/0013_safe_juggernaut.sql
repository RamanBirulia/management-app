ALTER TABLE `projects` ADD `color` text DEFAULT 'amber' NOT NULL;--> statement-breakpoint
UPDATE `projects` SET `color` = CASE abs(rowid) % 6
  WHEN 0 THEN 'amber' WHEN 1 THEN 'coral' WHEN 2 THEN 'purple'
  WHEN 3 THEN 'rose' WHEN 4 THEN 'graphite' ELSE 'brown' END;
