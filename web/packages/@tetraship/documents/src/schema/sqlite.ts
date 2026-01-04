import { integer, text } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "@tetrastack/backend/utils";

/**
 * Core column definitions for document_types
 */
export const documentTypesColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  schema: text("schema", { mode: "json" }).$type<Record<string, unknown>>(),
  agentConfig: text("agent_config", { mode: "json" }).$type<{
    systemPrompt?: string;
    generationPrompt?: string;
    contextFields?: Record<string, string>;
  }>(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
};

/**
 * Core column definitions for documents
 */
export const documentsColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  typeId: text("type_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  content: text("content", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
};
