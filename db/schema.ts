import { sql } from "drizzle-orm";
import { index, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const logEntries = sqliteTable("log_entries", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["decision", "task", "question"] }).notNull(),
  content: text("content").notNull(),
  description: text("description").notNull().default(""),
  occurredAt: text("occurred_at").notNull(),
  status: text("status"),
  assigneeId: text("assignee_id"),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  completedByPersonId: text("completed_by_person_id"),
  resolvedAt: text("resolved_at"),
  resolvedByPersonId: text("resolved_by_person_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_log_entries_occurred_at").on(table.occurredAt, table.id), index("idx_log_entries_completed_at").on(table.completedAt), index("idx_log_entries_resolved_at").on(table.resolvedAt)]);

export const logPeople = sqliteTable("log_people", {
  logId: text("log_id").notNull(),
  personId: text("person_id").notNull(),
}, (table) => [primaryKey({ columns: [table.logId, table.personId] }), index("idx_log_people_person_id").on(table.personId, table.logId)]);

export const logProjects = sqliteTable("log_projects", {
  logId: text("log_id").notNull(),
  projectId: text("project_id").notNull(),
}, (table) => [primaryKey({ columns: [table.logId, table.projectId] }), index("idx_log_projects_project_id").on(table.projectId, table.logId)]);

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  logId: text("log_id").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
}, (table) => [index("idx_sources_log_id").on(table.logId)]);
