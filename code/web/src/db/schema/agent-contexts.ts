import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { projects } from "../schema";

export const agentContexts = pgTable("agent_contexts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  generatedContent: text("generated_content").notNull(),
  lastGeneratedAt: timestamp("last_generated_at").defaultNow().notNull(),
  needsRefresh: boolean("needs_refresh").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
