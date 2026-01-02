/**
 * Thread model operations following the many-first pattern.
 * Provides CRUD operations for thread containers.
 */

import { eq } from 'drizzle-orm';
import { createModelFactory, type DrizzleDb } from './factory';
import {
  threads,
  insertThreadSchema,
  type Thread,
  type NewThread,
} from '../database/schema/sqlite';

/**
 * Creates a threads model instance bound to the given database.
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import { createThreadsModel } from '@tetrastack/threads/models';
 *
 * const db = drizzle(sqlite);
 * const threadsModel = createThreadsModel(db);
 *
 * // Create a thread
 * const [thread] = await threadsModel.insert([{
 *   projectId: 'proj_123',
 *   scopeType: 'ticket',
 *   scopeId: 'T-101',
 *   title: 'Support Discussion',
 * }]);
 *
 * // Find thread by scope
 * const [existing] = await threadsModel.findByScope('proj_123', 'ticket', 'T-101');
 * ```
 */
export function createThreadsModel(db: DrizzleDb) {
  const base = createModelFactory<NewThread, Thread>(
    db,
    threads,
    threads.id,
    insertThreadSchema,
  );

  return {
    ...base,

    /**
     * Find a thread by its polymorphic scope.
     * Returns the thread for a specific parent record.
     */
    async findByScope(
      projectId: string,
      scopeType: string,
      scopeId: string,
    ): Promise<Thread[]> {
      return base.select([
        eq(threads.projectId, projectId),
        eq(threads.scopeType, scopeType),
        eq(threads.scopeId, scopeId),
      ]);
    },

    /**
     * Get or create a thread for a scope.
     * Useful for ensuring a thread exists before adding items.
     */
    async getOrCreate(
      projectId: string,
      scopeType: string,
      scopeId: string,
      title?: string,
    ): Promise<Thread> {
      const existing = await this.findByScope(projectId, scopeType, scopeId);
      if (existing[0]) {
        return existing[0];
      }
      const [created] = await base.insert([
        { projectId, scopeType, scopeId, title },
      ]);
      return created;
    },

    /**
     * List all threads for a project.
     */
    async listByProject(projectId: string): Promise<Thread[]> {
      return base.select([eq(threads.projectId, projectId)]);
    },

    /**
     * Update thread metadata and title.
     */
    async updateThread(
      id: string,
      data: Partial<Pick<NewThread, 'title' | 'metadata'>>,
    ): Promise<Thread> {
      const [updated] = await base.update([eq(threads.id, id)], {
        ...data,
        updatedAt: new Date(),
      });
      return updated;
    },
  };
}

export type ThreadsModel = ReturnType<typeof createThreadsModel>;

// Re-export types for convenience
export type { Thread, NewThread };
