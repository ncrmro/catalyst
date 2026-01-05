import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "../schema";

/**
 * Threads - The container for activity (chat sessions, agent conversations).
 * Polymorphically scoped via scopeType + scopeId.
 * From @tetrastack/threads package schema.
 */
export const threads = pgTable(
  "threads",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scopeType: text("scope_type"), // 'project' or 'spec'
    scopeId: text("scope_id"), // projectId or `${projectId}:${specSlug}`
    title: text("title"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_threads_scope").on(
      table.projectId,
      table.scopeType,
      table.scopeId,
    ),
    index("idx_threads_project").on(table.projectId),
  ],
);

/**
 * Items - The append-only log of events within a thread (messages, tool calls).
 */
export const items = pgTable(
  "items",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system", "tool"] })
      .notNull()
      .default("user"),
    parts: jsonb("parts")
      .notNull()
      .$type<Array<{ type: string; content: string }>>()
      .default([]),
    runId: uuid("run_id"),
    spanId: uuid("span_id"),
    parentId: uuid("parent_id"),
    visibility: text("visibility", {
      enum: ["visible", "hidden", "archived"],
    })
      .notNull()
      .default("visible"),
    attempt: integer("attempt").notNull().default(1),
    requestId: text("request_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_items_thread").on(table.threadId, table.id),
    index("idx_items_run").on(table.threadId, table.runId),
    index("idx_items_span").on(table.threadId, table.spanId),
  ],
);

/**
 * Edges - DAG dependencies for complex agent workflows.
 * Enables map-reduce and other parallel execution patterns.
 */
export const edges = pgTable(
  "edges",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    fromItemId: uuid("from_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    toItemId: uuid("to_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["depends_on", "caused_by"] })
      .notNull()
      .default("depends_on"),
    requestId: text("request_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_edges_thread").on(table.threadId),
    index("idx_edges_from").on(table.fromItemId),
    index("idx_edges_to").on(table.toItemId),
  ],
);

/**
 * Streams - State for resumable streaming.
 * Tracks active streams and allows reconnection.
 */
export const streams = pgTable(
  "streams",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    runId: uuid("run_id"),
    status: text("status", {
      enum: ["active", "completed", "aborted", "expired"],
    })
      .notNull()
      .default("active"),
    resumeToken: text("resume_token"),
    lastEventId: text("last_event_id"),
    snapshot: jsonb("snapshot").$type<{
      parts: Array<{ type: string; content: string }>;
      metadata?: Record<string, unknown>;
    }>(),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_streams_thread").on(table.threadId),
    index("idx_streams_status").on(table.status),
  ],
);
