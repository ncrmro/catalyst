import { integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "@tetrastack/backend/utils";

/**
 * Core column definitions for document_types (PostgreSQL)
 */
export const documentTypesColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  schema: jsonb("schema").$type<Record<string, unknown>>(),
  agentConfig: jsonb("agent_config").$type<{
    systemPrompt?: string;
    generationPrompt?: string;
    contextFields?: Record<string, string>;
  }>(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Core column definitions for documents (PostgreSQL)
 */
export const documentsColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  typeId: text("type_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  content: jsonb("content").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
