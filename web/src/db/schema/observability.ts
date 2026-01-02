import {
  boolean,
  timestamp,
  pgTable,
  text,
  decimal,
} from "drizzle-orm/pg-core";
import { projects } from "./core";

export const alertRules = pgTable("alert_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  signalType: text("signal_type").notNull(), // 'latency', 'error_rate', 'traffic', 'saturation'
  threshold: decimal("threshold", { precision: 10, scale: 4 }).notNull(),
  operator: text("operator").notNull(), // 'gt', 'lt', 'gte', 'lte'
  duration: text("duration").notNull(), // e.g., '5m'
  severity: text("severity").default("warning").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
