import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { projects } from "../schema";

export const conventionRules = pgTable("convention_rules", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	ruleType: varchar("rule_type", { length: 50 }).notNull(), // 'lint', 'commit', 'branch', 'test'
	ruleName: varchar("rule_name", { length: 100 }).notNull(),
	config: jsonb("config").notNull(), // Rule-specific configuration
	enabled: boolean("enabled").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
