import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { projects } from "../schema";

export const platformTasks = pgTable("platform_tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull(), // 'dependency_update', 'convention_fix', 'flaky_test'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  priority: varchar("priority", { length: 10 }).default("medium").notNull(),
  linkedPrNumber: integer("linked_pr_number"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
