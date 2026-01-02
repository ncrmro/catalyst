import { pgTable, text, varchar, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { projects } from "../schema";

export const alertRules = pgTable("alert_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  signalType: varchar("signal_type", { length: 20 }).notNull(), // 'latency', 'error_rate', 'traffic', 'saturation'
  threshold: decimal("threshold", { precision: 10, scale: 4 }).notNull(),
  operator: varchar("operator", { length: 10 }).notNull(), // 'gt', 'lt', 'gte', 'lte'
  duration: varchar("duration", { length: 20 }).notNull(), // e.g., '5m'
  severity: varchar("severity", { length: 20 }).default("warning").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
