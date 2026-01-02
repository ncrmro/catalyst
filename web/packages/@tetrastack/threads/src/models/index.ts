/**
 * Model layer exports for @tetrastack/threads.
 * Uses the many-first design pattern.
 */

import { createThreadsModel, type Thread } from './threads';
import { createItemsModel, type Item } from './items';
import { createEdgesModel } from './edges';
import { createStreamsModel } from './streams';
import type { DrizzleDb } from './factory';

// Factory utilities
export { createModelFactory, takeFirst } from './factory';
export type { DrizzleDb, ModelSelect, ModelInsert } from './factory';

// Thread model
export { createThreadsModel } from './threads';
export type { ThreadsModel, Thread, NewThread } from './threads';

// Item model
export { createItemsModel } from './items';
export type { ItemsModel, Item, NewItem } from './items';

/**
 * Thread with its items (messages) included.
 * This is the shape returned when fetching a thread with a join on items.
 */
export interface ThreadWithItems extends Thread {
  items: Item[];
}

// Edge model
export { createEdgesModel } from './edges';
export type { EdgesModel, Edge, NewEdge } from './edges';

// Stream model
export { createStreamsModel } from './streams';
export type { StreamsModel, Stream, NewStream } from './streams';

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
export function createThreadModels(db: DrizzleDb) {
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
    async getThreadWithItems(
      threadId: string,
    ): Promise<ThreadWithItems | undefined> {
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

export type ThreadModels = ReturnType<typeof createThreadModels>;
