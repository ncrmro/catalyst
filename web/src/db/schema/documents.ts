import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "../schema";

/**
 * Documents table - Generic document storage for various document types.
 * Used for storing structured data like external agent tasks, workflow definitions, etc.
 */
export const documents = pgTable(
  "documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    typeId: text("type_id").notNull(), // Document type identifier (e.g., 'external-agent-task')
    content: jsonb("content").notNull().$type<Record<string, unknown>>(), // Document-specific structured data
    metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Additional metadata
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_documents_project").on(table.projectId),
    index("idx_documents_type").on(table.typeId),
    index("idx_documents_project_type").on(table.projectId, table.typeId),
  ],
);
