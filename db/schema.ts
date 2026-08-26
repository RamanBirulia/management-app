import { sql } from "drizzle-orm";
import { AnySQLiteColumn, index, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    alias: text("alias").notNull(),
    note: text("note").notNull().default(""),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    archivedAt: text("archived_at"),
  },
  (table) => [uniqueIndex("idx_people_alias_unique").on(table.alias)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color", { enum: ["amber", "coral", "purple", "rose", "graphite", "brown"] }).notNull().default("amber"),
    note: text("note").notNull().default(""),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    archivedAt: text("archived_at"),
  },
  (table) => [uniqueIndex("idx_projects_slug_unique").on(table.slug)],
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    alias: text("alias").notNull(),
    note: text("note").notNull().default(""),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    archivedAt: text("archived_at"),
  },
  (table) => [uniqueIndex("idx_teams_alias_unique").on(table.alias)],
);

export const teamPeople = sqliteTable("team_people", {
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.teamId, table.personId] }), index("idx_team_people_person_id").on(table.personId, table.teamId)]);

export const logEntries = sqliteTable("log_entries", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["decision", "task", "question"] }).notNull(),
  content: text("content").notNull(),
  description: text("description").notNull().default(""),
  occurredAt: text("occurred_at").notNull(),
  status: text("status"),
  assigneeId: text("assignee_id").references(() => people.id, { onDelete: "set null" }),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  completedByPersonId: text("completed_by_person_id").references(() => people.id, { onDelete: "set null" }),
  resolvedAt: text("resolved_at"),
  resolvedByPersonId: text("resolved_by_person_id").references(() => people.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  importSuggestionId: text("import_suggestion_id"),
}, (table) => [index("idx_log_entries_occurred_at").on(table.occurredAt, table.id), index("idx_log_entries_type_occurred_at").on(table.type, table.occurredAt, table.id), index("idx_log_entries_status_occurred_at").on(table.status, table.occurredAt, table.id), index("idx_log_entries_completed_at").on(table.completedAt), index("idx_log_entries_resolved_at").on(table.resolvedAt), uniqueIndex("idx_log_entries_import_suggestion_unique").on(table.importSuggestionId)]);

export const logPeople = sqliteTable("log_people", {
  logId: text("log_id").notNull().references(() => logEntries.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.logId, table.personId] }), index("idx_log_people_person_id").on(table.personId, table.logId)]);

export const logProjects = sqliteTable("log_projects", {
  logId: text("log_id").notNull().references(() => logEntries.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.logId, table.projectId] }), index("idx_log_projects_project_id").on(table.projectId, table.logId)]);

export const logTeams = sqliteTable("log_teams", {
  logId: text("log_id").notNull().references(() => logEntries.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.logId, table.teamId] }), index("idx_log_teams_team_id").on(table.teamId, table.logId)]);

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  logId: text("log_id").notNull().references(() => logEntries.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
}, (table) => [index("idx_sources_log_id").on(table.logId)]);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const planningScopes = sqliteTable("planning_scopes", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_planning_scopes_team_unique").on(table.teamId)]);

export const planningScopeProjects = sqliteTable("planning_scope_projects", {
  scopeId: text("scope_id").notNull().references(() => planningScopes.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.scopeId, table.projectId] }), index("idx_planning_scope_projects_project").on(table.projectId, table.scopeId)]);

export const workItems = sqliteTable("work_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  parentId: text("parent_id").references((): AnySQLiteColumn => workItems.id, { onDelete: "restrict" }),
  status: text("status", { enum: ["active", "done", "cancelled"] }).notNull().default("active"),
  workflowStage: text("workflow_stage", { enum: ["backlog", "product", "design", "pbr", "engineering"] }).notNull().default("backlog"),
  assigneeId: text("assignee_id").references(() => people.id, { onDelete: "set null" }),
  dueDate: text("due_date"),
  designOwnerId: text("design_owner_id").references(() => people.id, { onDelete: "set null" }),
  designDraftUrl: text("design_draft_url"),
  designTargetDate: text("design_target_date"),
  readinessNote: text("readiness_note").notNull().default(""),
  rank: text("rank").notNull(),
  sourceLogId: text("source_log_id").references(() => logEntries.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_work_items_rank_unique").on(table.rank), uniqueIndex("idx_work_items_source_log_unique").on(table.sourceLogId), index("idx_work_items_parent_id").on(table.parentId), index("idx_work_items_stage_rank").on(table.workflowStage, table.rank)]);

export const workItemProjects = sqliteTable("work_item_projects", {
  workItemId: text("work_item_id").notNull().references(() => workItems.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.workItemId, table.projectId] }), index("idx_work_item_projects_project_id").on(table.projectId, table.workItemId)]);

export const workItemLinks = sqliteTable("work_item_links", {
  id: text("id").primaryKey(),
  workItemId: text("work_item_id").notNull().references(() => workItems.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
}, (table) => [index("idx_work_item_links_work_item_id").on(table.workItemId)]);

export const workItemEvents = sqliteTable("work_item_events", {
  id: text("id").primaryKey(),
  workItemId: text("work_item_id").notNull().references(() => workItems.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  payload: text("payload").notNull().default("{}"),
  actorId: text("actor_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_work_item_events_work_item_id").on(table.workItemId, table.createdAt)]);

export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(),
  formatVersion: text("format_version").notNull().default("1"),
  sourceSystem: text("source_system").notNull().default("manual"),
  title: text("title").notNull().default("Import"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_import_batches_idempotency_unique").on(table.idempotencyKey)]);

export const importSuggestions = sqliteTable("import_suggestions", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["decision", "task", "question"] }).notNull(),
  content: text("content").notNull(),
  description: text("description").notNull().default(""),
  occurredAt: text("occurred_at").notNull(),
  status: text("status", { enum: ["pending", "processing", "approved", "rejected"] }).notNull().default("pending"),
  externalKey: text("external_key"),
  externalUrl: text("external_url"),
  canonicalLogId: text("canonical_log_id").references(() => logEntries.id, { onDelete: "set null" }),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_import_suggestions_batch_id").on(table.batchId, table.createdAt), index("idx_import_suggestions_status_created_at").on(table.status, table.createdAt), uniqueIndex("idx_import_suggestions_external_unique").on(table.externalKey)]);

export const logSyncOutbox = sqliteTable("log_sync_outbox", {
  logId: text("log_id").primaryKey().references(() => logEntries.id, { onDelete: "cascade" }),
  attempts: text("attempts").notNull().default("0"),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
