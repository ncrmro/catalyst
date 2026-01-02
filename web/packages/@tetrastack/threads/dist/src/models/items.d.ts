/**
 * Item model operations following the many-first pattern.
 * Items are the append-only event log within a thread.
 */
import { type DrizzleDb } from './factory';
import { type Item, type NewItem } from '../database/schema/sqlite';
import type { Visibility } from '../types';
/**
 * Creates an items model instance bound to the given database.
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import { createItemsModel } from '@tetrastack/threads/models';
 *
 * const db = drizzle(sqlite);
 * const itemsModel = createItemsModel(db);
 *
 * // Append a user message
 * const [item] = await itemsModel.insert([{
 *   threadId: 'thread_123',
 *   role: 'user',
 *   parts: [{ type: 'text', text: 'Hello, I need help.' }],
 *   requestId: 'req_abc',
 * }]);
 *
 * // Get all items in a thread
 * const messages = await itemsModel.listByThread('thread_123');
 * ```
 */
export declare function createItemsModel(db: DrizzleDb): {
    /**
     * List all items in a thread, ordered by ID (time-sorted via UUIDv7).
     * @param threadId - The thread to list items for
     * @param order - Sort order ('asc' for oldest first, 'desc' for newest first)
     */
    listByThread(threadId: string, order?: "asc" | "desc"): Promise<Item[]>;
    /**
     * List items for a specific run within a thread.
     * Useful for grouping items by agent execution.
     */
    listByRun(threadId: string, runId: string): Promise<Item[]>;
    /**
     * List items for a specific span within a thread.
     * Useful for DAG node grouping.
     */
    listBySpan(threadId: string, spanId: string): Promise<Item[]>;
    /**
     * Get visible items only (excludes hidden and archived).
     */
    listVisible(threadId: string): Promise<Item[]>;
    /**
     * Get items for LLM context (visible + hidden, excludes archived).
     */
    listForContext(threadId: string): Promise<Item[]>;
    /**
     * Append a new item to a thread.
     * Convenience method for single-item insertion.
     */
    append(data: NewItem): Promise<Item>;
    /**
     * Update item visibility.
     */
    setVisibility(id: string, visibility: Visibility): Promise<Item>;
    /**
     * Archive an item (soft delete - removes from both UI and LLM context).
     */
    archive(id: string): Promise<Item>;
    /**
     * Hide an item from UI but keep in LLM context.
     */
    hide(id: string): Promise<Item>;
    /**
     * Get replies to a specific item.
     */
    getReplies(parentId: string): Promise<Item[]>;
    /**
     * Get the latest item in a thread.
     */
    getLatest(threadId: string): Promise<Item | undefined>;
    /**
     * Count items in a thread.
     */
    count(threadId: string): Promise<number>;
    takeFirst: typeof import("./factory").takeFirst;
    select(conditions?: import("drizzle-orm").SQL[]): Promise<{
        id: string;
        metadata: Record<string, unknown> | null;
        createdAt: Date;
        threadId: string;
        role: "user" | "assistant" | "system" | "tool";
        parts: import("..").MessagePart[];
        runId: string | null;
        spanId: string | null;
        parentId: string | null;
        visibility: "visible" | "hidden" | "archived";
        attempt: number;
        requestId: string;
    }[]>;
    selectById(id: string): Promise<{
        id: string;
        metadata: Record<string, unknown> | null;
        createdAt: Date;
        threadId: string;
        role: "user" | "assistant" | "system" | "tool";
        parts: import("..").MessagePart[];
        runId: string | null;
        spanId: string | null;
        parentId: string | null;
        visibility: "visible" | "hidden" | "archived";
        attempt: number;
        requestId: string;
    } | undefined>;
    insert(data: {
        threadId: string;
        requestId: string;
        id?: string | undefined;
        metadata?: Record<string, unknown> | null | undefined;
        createdAt?: Date | undefined;
        role?: "user" | "assistant" | "system" | "tool" | undefined;
        parts?: import("..").MessagePart[] | undefined;
        runId?: string | null | undefined;
        spanId?: string | null | undefined;
        parentId?: string | null | undefined;
        visibility?: "visible" | "hidden" | "archived" | undefined;
        attempt?: number | undefined;
    }[]): Promise<{
        id: string;
        metadata: Record<string, unknown> | null;
        createdAt: Date;
        threadId: string;
        role: "user" | "assistant" | "system" | "tool";
        parts: import("..").MessagePart[];
        runId: string | null;
        spanId: string | null;
        parentId: string | null;
        visibility: "visible" | "hidden" | "archived";
        attempt: number;
        requestId: string;
    }[]>;
    update(conditions: import("drizzle-orm").SQL[], data: Partial<{
        threadId: string;
        requestId: string;
        id?: string | undefined;
        metadata?: Record<string, unknown> | null | undefined;
        createdAt?: Date | undefined;
        role?: "user" | "assistant" | "system" | "tool" | undefined;
        parts?: import("..").MessagePart[] | undefined;
        runId?: string | null | undefined;
        spanId?: string | null | undefined;
        parentId?: string | null | undefined;
        visibility?: "visible" | "hidden" | "archived" | undefined;
        attempt?: number | undefined;
    }>): Promise<{
        id: string;
        metadata: Record<string, unknown> | null;
        createdAt: Date;
        threadId: string;
        role: "user" | "assistant" | "system" | "tool";
        parts: import("..").MessagePart[];
        runId: string | null;
        spanId: string | null;
        parentId: string | null;
        visibility: "visible" | "hidden" | "archived";
        attempt: number;
        requestId: string;
    }[]>;
    delete(conditions: import("drizzle-orm").SQL[]): Promise<void>;
    buildConditions(filters: Record<string, {
        column: any;
        values: unknown[];
    } | undefined>): import("drizzle-orm").SQL[];
    table: any;
    idColumn: any;
};
export type ItemsModel = ReturnType<typeof createItemsModel>;
export type { Item, NewItem };
//# sourceMappingURL=items.d.ts.map