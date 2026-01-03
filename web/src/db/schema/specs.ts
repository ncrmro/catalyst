import {
  pgTable,
  text,
  integer,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { projects } from "../schema";

export const specFolders = pgTable("spec_folders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  slug: varchar("slug", { length: 100 }).notNull(), // e.g., '001-user-auth'
  specNumber: integer("spec_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // 'draft', 'active', 'complete'
  completionPercentage: integer("completion_percentage").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const specTasks = pgTable("spec_tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  specFolderId: text("spec_folder_id")
    .references(() => specFolders.id, { onDelete: "cascade" })
    .notNull(),
  taskId: varchar("task_id", { length: 20 }).notNull(), // e.g., 'T001'
  userStoryRef: varchar("user_story_ref", { length: 20 }), // e.g., 'US-1'
  description: text("description").notNull(),
  isParallelizable: boolean("is_parallelizable").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'in_progress', 'complete'
  linkedPrNumber: integer("linked_pr_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
