/**
 * Item model operations following the many-first pattern.
 * Items are the append-only event log within a thread.
 */
import { eq } from 'drizzle-orm';
import { createModelFactory } from './factory';
import { items, insertItemSchema, } from '../database/schema/sqlite';
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
export function createItemsModel(db) {
    const base = createModelFactory(db, items, items.id, insertItemSchema);
    return {
        ...base,
        /**
         * List all items in a thread, ordered by ID (time-sorted via UUIDv7).
         * @param threadId - The thread to list items for
         * @param order - Sort order ('asc' for oldest first, 'desc' for newest first)
         */
        async listByThread(threadId, order = 'asc') {
            const result = await base.select([eq(items.threadId, threadId)]);
            // Sort by ID since UUIDv7 is time-sortable
            return result.sort((a, b) => {
                const cmp = a.id.localeCompare(b.id);
                return order === 'asc' ? cmp : -cmp;
            });
        },
        /**
         * List items for a specific run within a thread.
         * Useful for grouping items by agent execution.
         */
        async listByRun(threadId, runId) {
            return base.select([
                eq(items.threadId, threadId),
                eq(items.runId, runId),
            ]);
        },
        /**
         * List items for a specific span within a thread.
         * Useful for DAG node grouping.
         */
        async listBySpan(threadId, spanId) {
            return base.select([
                eq(items.threadId, threadId),
                eq(items.spanId, spanId),
            ]);
        },
        /**
         * Get visible items only (excludes hidden and archived).
         */
        async listVisible(threadId) {
            const all = await this.listByThread(threadId);
            return all.filter((item) => item.visibility === 'visible');
        },
        /**
         * Get items for LLM context (visible + hidden, excludes archived).
         */
        async listForContext(threadId) {
            const all = await this.listByThread(threadId);
            return all.filter((item) => item.visibility !== 'archived');
        },
        /**
         * Append a new item to a thread.
         * Convenience method for single-item insertion.
         */
        async append(data) {
            const [item] = await base.insert([data]);
            return item;
        },
        /**
         * Update item visibility.
         */
        async setVisibility(id, visibility) {
            const [updated] = await base.update([eq(items.id, id)], { visibility });
            return updated;
        },
        /**
         * Archive an item (soft delete - removes from both UI and LLM context).
         */
        async archive(id) {
            return this.setVisibility(id, 'archived');
        },
        /**
         * Hide an item from UI but keep in LLM context.
         */
        async hide(id) {
            return this.setVisibility(id, 'hidden');
        },
        /**
         * Get replies to a specific item.
         */
        async getReplies(parentId) {
            return base.select([eq(items.parentId, parentId)]);
        },
        /**
         * Get the latest item in a thread.
         */
        async getLatest(threadId) {
            const all = await this.listByThread(threadId, 'desc');
            return all[0];
        },
        /**
         * Count items in a thread.
         */
        async count(threadId) {
            const all = await base.select([eq(items.threadId, threadId)]);
            return all.length;
        },
    };
}
