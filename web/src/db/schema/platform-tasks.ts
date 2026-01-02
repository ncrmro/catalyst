import {
  timestamp,
  pgTable,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./core";

export const platformTasks = pgTable("platform_tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  taskType: text("task_type").notNull(), // 'dependency_update', 'convention_fix', 'flaky_test'
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(),
  priority: text("priority").default("medium").notNull(),
  linkedPrNumber: integer("linked_pr_number"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});
