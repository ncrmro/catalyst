/**
 * SQLite schema for threads persistence layer.
 * Uses factory pattern for generic metadata support.
 */

import { uuidv7 } from "@tetrastack/backend/utils";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import type { MessagePart } from "../../../types";

/**
 * Factory function to create thread tables with custom metadata types.
 * @example
 * ```typescript
 * type ThreadMeta = { workflowType: string; priority: number };
 * type ItemMeta = { confidence: number; model: string };
 * const { threads, items, edges, streams } = createThreadTables<ThreadMeta, ItemMeta>();
 * ```
 */
export const createThreadTables = <
	TThreadMetadata extends Record<string, unknown> = Record<string, unknown>,
	TItemMetadata extends Record<string, unknown> = Record<string, unknown>,
>() => {
	/**
	 * Threads - The container for activity.
	 * Polymorphically scoped via scopeType + scopeId.
	 */
	const threads = sqliteTable(
		"threads",
		{
			id: text("id")
				.notNull()
				.primaryKey()
				.$defaultFn(() => uuidv7()),
			projectId: text("project_id").notNull(),
			scopeType: text("scope_type"),
			scopeId: text("scope_id"),
			title: text("title"),
			metadata: text("metadata", { mode: "json" }).$type<TThreadMetadata>(),
			createdAt: integer("created_at", { mode: "timestamp_ms" })
				.notNull()
				.$defaultFn(() => new Date()),
			updatedAt: integer("updated_at", { mode: "timestamp_ms" })
				.notNull()
				.$defaultFn(() => new Date()),
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
	 * Items - The append-only log of events within a thread.
	 * UUIDv7 IDs provide natural time-ordering.
	 */
	const items = sqliteTable(
		"items",
		{
			id: text("id")
				.notNull()
				.primaryKey()
				.$defaultFn(() => uuidv7()),
			threadId: text("thread_id")
				.notNull()
				.references(() => threads.id, { onDelete: "cascade" }),
			role: text("role", { enum: ["user", "assistant", "system", "tool"] })
				.notNull()
				.default("user"),
			parts: text("parts", { mode: "json" })
				.notNull()
				.$type<MessagePart[]>()
				.default(sql`'[]'`),
			runId: text("run_id"),
			spanId: text("span_id"),
			parentId: text("parent_id"),
			visibility: text("visibility", {
				enum: ["visible", "hidden", "archived"],
			})
				.notNull()
				.default("visible"),
			attempt: integer("attempt").notNull().default(1),
			requestId: text("request_id").notNull(),
			metadata: text("metadata", { mode: "json" }).$type<TItemMetadata>(),
			createdAt: integer("created_at", { mode: "timestamp_ms" })
				.notNull()
				.$defaultFn(() => new Date()),
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
	const edges = sqliteTable(
		"edges",
		{
			id: text("id")
				.notNull()
				.primaryKey()
				.$defaultFn(() => uuidv7()),
			threadId: text("thread_id")
				.notNull()
				.references(() => threads.id, { onDelete: "cascade" }),
			fromItemId: text("from_item_id")
				.notNull()
				.references(() => items.id, { onDelete: "cascade" }),
			toItemId: text("to_item_id")
				.notNull()
				.references(() => items.id, { onDelete: "cascade" }),
			type: text("type", { enum: ["depends_on", "caused_by"] })
				.notNull()
				.default("depends_on"),
			requestId: text("request_id").notNull(),
			createdAt: integer("created_at", { mode: "timestamp_ms" })
				.notNull()
				.$defaultFn(() => new Date()),
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
	const streams = sqliteTable(
		"streams",
		{
			id: text("id")
				.notNull()
				.primaryKey()
				.$defaultFn(() => uuidv7()),
			threadId: text("thread_id")
				.notNull()
				.references(() => threads.id, { onDelete: "cascade" }),
			runId: text("run_id"),
			status: text("status", {
				enum: ["active", "completed", "aborted", "expired"],
			})
				.notNull()
				.default("active"),
			resumeToken: text("resume_token"),
			lastEventId: text("last_event_id"),
			snapshot: text("snapshot", { mode: "json" }).$type<{
				parts: MessagePart[];
				metadata?: Record<string, unknown>;
			}>(),
			expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
			createdAt: integer("created_at", { mode: "timestamp_ms" })
				.notNull()
				.$defaultFn(() => new Date()),
			updatedAt: integer("updated_at", { mode: "timestamp_ms" })
				.notNull()
				.$defaultFn(() => new Date()),
		},
		(table) => [
			index("idx_streams_thread").on(table.threadId),
			index("idx_streams_status").on(table.status),
		],
	);

	return { threads, items, edges, streams };
};

// Default tables with generic metadata for backwards compatibility
export const { threads, items, edges, streams } = createThreadTables();

// Zod schemas for validation
export const insertThreadSchema = createInsertSchema(threads);
export const selectThreadSchema = createSelectSchema(threads);

export const insertItemSchema = createInsertSchema(items);
export const selectItemSchema = createSelectSchema(items);

export const insertEdgeSchema = createInsertSchema(edges);
export const selectEdgeSchema = createSelectSchema(edges);

export const insertStreamSchema = createInsertSchema(streams);
export const selectStreamSchema = createSelectSchema(streams);

// Type exports for convenience
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;

export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
