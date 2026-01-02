import {
  boolean,
  timestamp,
  pgTable,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { projects } from "./core";

export const conventionRules = pgTable("convention_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  ruleType: text("rule_type").notNull(), // 'lint', 'commit', 'branch', 'test'
  ruleName: text("rule_name").notNull(),
  config: jsonb("config").notNull(), // Rule-specific configuration
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
