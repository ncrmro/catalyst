/**
 * Model layer exports for @tetrastack/threads.
 * Uses the many-first design pattern.
 */
import { createThreadsModel } from './threads';
import { createItemsModel } from './items';
import { createEdgesModel } from './edges';
import { createStreamsModel } from './streams';
// Factory utilities
export { createModelFactory, takeFirst } from './factory';
// Thread model
export { createThreadsModel } from './threads';
// Item model
export { createItemsModel } from './items';
// Edge model
export { createEdgesModel } from './edges';
// Stream model
export { createStreamsModel } from './streams';
/**
 * Create all thread-related models bound to a database instance.
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import { createThreadModels } from '@tetrastack/threads/models';
 *
 * const db = drizzle(sqlite);
 * const models = createThreadModels(db);
 *
 * // Now you can use all models
 * const [thread] = await models.threads.insert([{ projectId: 'proj_123' }]);
 * const [item] = await models.items.insert([{
 *   threadId: thread.id,
 *   role: 'user',
 *   parts: [{ type: 'text', text: 'Hello!' }],
 *   requestId: 'req_123',
 * }]);
 * ```
 */
export function createThreadModels(db) {
    const threads = createThreadsModel(db);
    const items = createItemsModel(db);
    const edges = createEdgesModel(db);
    const streams = createStreamsModel(db);
    return {
        threads,
        items,
        edges,
        streams,
        /**
         * Get a thread with all its items (messages) included.
         * This is the canonical way to fetch a complete thread.
         *
         * @param threadId - The thread ID
         * @returns The thread with items, or undefined if not found
         *
         * @example
         * ```typescript
         * const thread = await models.getThreadWithItems('thread_123');
         * if (thread) {
         *   console.log(`Thread has ${thread.items.length} messages`);
         * }
         * ```
         */
        async getThreadWithItems(threadId) {
            const thread = await threads.selectById(threadId);
            if (!thread) {
                return undefined;
            }
            const threadItems = await items.listByThread(threadId);
            return {
                ...thread,
                items: threadItems,
            };
        },
    };
}
