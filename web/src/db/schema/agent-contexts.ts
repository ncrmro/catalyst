import {
  boolean,
  timestamp,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { projects } from "./core";

export const agentContexts = pgTable("agent_contexts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  contentHash: text("content_hash").notNull(),
  generatedContent: text("generated_content").notNull(),
  lastGeneratedAt: timestamp("last_generated_at", { mode: "date" }).defaultNow().notNull(),
  needsRefresh: boolean("needs_refresh").default(false).notNull(),
});
