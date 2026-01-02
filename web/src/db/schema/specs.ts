import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./core";

export const specFolders = pgTable(
  "spec_folders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    slug: text("slug").notNull(), // e.g., '001-user-auth'
    specNumber: integer("spec_number").notNull(),
    title: text("title").notNull(),
    status: text("status").default("draft").notNull(), // 'draft', 'active', 'complete'
    completionPercentage: integer("completion_percentage").default(0).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueProjectSlug: uniqueIndex("spec_folders_project_id_slug_unique").on(
      table.projectId,
      table.slug
    ),
  })
);

export const specTasks = pgTable("spec_tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  specFolderId: text("spec_folder_id")
    .references(() => specFolders.id, { onDelete: "cascade" })
    .notNull(),
  taskId: text("task_id").notNull(), // e.g., 'T001'
  userStoryRef: text("user_story_ref"), // e.g., 'US-1'
  description: text("description").notNull(),
  isParallelizable: boolean("is_parallelizable").default(false).notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'in_progress', 'complete'
  linkedPrNumber: integer("linked_pr_number"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
