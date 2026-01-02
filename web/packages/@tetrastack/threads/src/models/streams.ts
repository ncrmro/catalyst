/**
 * Stream model operations following the many-first pattern.
 * Streams track state for resumable streaming.
 */

import { eq } from 'drizzle-orm';
import { createModelFactory, type DrizzleDb } from './factory';
import {
  streams,
  insertStreamSchema,
  type Stream,
  type NewStream,
} from '../database/schema/sqlite';
import type { MessagePart } from '../types';

/**
 * Creates a streams model instance bound to the given database.
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import { createStreamsModel } from '@tetrastack/threads/models';
 *
 * const db = drizzle(sqlite);
 * const streamsModel = createStreamsModel(db);
 *
 * // Start a new stream
 * const [stream] = await streamsModel.insert([{
 *   threadId: 'thread_123',
 *   runId: 'run_456',
 *   status: 'active',
 *   expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
 * }]);
 *
 * // Update stream snapshot during streaming
 * await streamsModel.updateSnapshot(stream.id, {
 *   parts: [{ type: 'text', text: 'Processing...' }],
 * });
 *
 * // Complete the stream
 * await streamsModel.complete(stream.id);
 * ```
 */
export function createStreamsModel(db: DrizzleDb) {
  const base = createModelFactory<NewStream, Stream>(
    db,
    streams,
    streams.id,
    insertStreamSchema,
  );

  return {
    ...base,

    /**
     * Get active stream for a thread.
     */
    async getActive(threadId: string): Promise<Stream | undefined> {
      const result = await base.select([
        eq(streams.threadId, threadId),
        eq(streams.status, 'active'),
      ]);
      return result[0];
    },

    /**
     * Get active stream by run ID.
     */
    async getByRun(
      threadId: string,
      runId: string,
    ): Promise<Stream | undefined> {
      const result = await base.select([
        eq(streams.threadId, threadId),
        eq(streams.runId, runId),
      ]);
      return result[0];
    },

    /**
     * Start a new stream.
     */
    async start(
      threadId: string,
      runId: string | null,
      expiresInMs: number = 5 * 60 * 1000,
    ): Promise<Stream> {
      const [stream] = await base.insert([
        {
          threadId,
          runId,
          status: 'active',
          expiresAt: new Date(Date.now() + expiresInMs),
        },
      ]);
      return stream;
    },

    /**
     * Update the stream snapshot with current message state.
     */
    async updateSnapshot(
      id: string,
      snapshot: { parts: MessagePart[]; metadata?: Record<string, unknown> },
      lastEventId?: string,
    ): Promise<Stream> {
      const updateData: Partial<NewStream> = {
        snapshot,
        updatedAt: new Date(),
      };
      if (lastEventId) {
        updateData.lastEventId = lastEventId;
      }
      const [updated] = await base.update([eq(streams.id, id)], updateData);
      return updated;
    },

    /**
     * Set a resume token for client reconnection.
     */
    async setResumeToken(id: string, resumeToken: string): Promise<Stream> {
      const [updated] = await base.update([eq(streams.id, id)], {
        resumeToken,
        updatedAt: new Date(),
      });
      return updated;
    },

    /**
     * Mark stream as completed.
     */
    async complete(id: string): Promise<Stream> {
      const [updated] = await base.update([eq(streams.id, id)], {
        status: 'completed',
        updatedAt: new Date(),
      });
      return updated;
    },

    /**
     * Mark stream as aborted.
     */
    async abort(id: string): Promise<Stream> {
      const [updated] = await base.update([eq(streams.id, id)], {
        status: 'aborted',
        updatedAt: new Date(),
      });
      return updated;
    },

    /**
     * Mark expired streams.
     * Call this periodically to clean up stale streams.
     */
    async expireStale(): Promise<number> {
      const now = new Date();
      const active = await base.select([eq(streams.status, 'active')]);
      const expired = active.filter((s) => s.expiresAt && s.expiresAt < now);

      for (const stream of expired) {
        await base.update([eq(streams.id, stream.id)], {
          status: 'expired',
          updatedAt: now,
        });
      }

      return expired.length;
    },

    /**
     * Get stream by resume token for client reconnection.
     */
    async getByResumeToken(resumeToken: string): Promise<Stream | undefined> {
      const result = await base.select([eq(streams.resumeToken, resumeToken)]);
      return result[0];
    },

    /**
     * Check if a stream can be resumed.
     */
    async canResume(id: string): Promise<boolean> {
      const stream = await base.selectById(id);
      if (!stream) return false;
      if (stream.status !== 'active') return false;
      if (stream.expiresAt && stream.expiresAt < new Date()) return false;
      return true;
    },
  };
}

export type StreamsModel = ReturnType<typeof createStreamsModel>;

// Re-export types for convenience
export type { Stream, NewStream };
