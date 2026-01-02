/**
 * Stream model operations following the many-first pattern.
 * Streams track state for resumable streaming.
 */
import { type DrizzleDb } from './factory';
import { type Stream, type NewStream } from '../database/schema/sqlite';
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
export declare function createStreamsModel(db: DrizzleDb): {
    /**
     * Get active stream for a thread.
     */
    getActive(threadId: string): Promise<Stream | undefined>;
    /**
     * Get active stream by run ID.
     */
    getByRun(threadId: string, runId: string): Promise<Stream | undefined>;
    /**
     * Start a new stream.
     */
    start(threadId: string, runId: string | null, expiresInMs?: number): Promise<Stream>;
    /**
     * Update the stream snapshot with current message state.
     */
    updateSnapshot(id: string, snapshot: {
        parts: MessagePart[];
        metadata?: Record<string, unknown>;
    }, lastEventId?: string): Promise<Stream>;
    /**
     * Set a resume token for client reconnection.
     */
    setResumeToken(id: string, resumeToken: string): Promise<Stream>;
    /**
     * Mark stream as completed.
     */
    complete(id: string): Promise<Stream>;
    /**
     * Mark stream as aborted.
     */
    abort(id: string): Promise<Stream>;
    /**
     * Mark expired streams.
     * Call this periodically to clean up stale streams.
     */
    expireStale(): Promise<number>;
    /**
     * Get stream by resume token for client reconnection.
     */
    getByResumeToken(resumeToken: string): Promise<Stream | undefined>;
    /**
     * Check if a stream can be resumed.
     */
    canResume(id: string): Promise<boolean>;
    takeFirst: typeof import("./factory").takeFirst;
    select(conditions?: import("drizzle-orm").SQL[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        threadId: string;
        runId: string | null;
        status: "active" | "completed" | "aborted" | "expired";
        resumeToken: string | null;
        lastEventId: string | null;
        snapshot: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        } | null;
        expiresAt: Date | null;
    }[]>;
    selectById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        threadId: string;
        runId: string | null;
        status: "active" | "completed" | "aborted" | "expired";
        resumeToken: string | null;
        lastEventId: string | null;
        snapshot: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        } | null;
        expiresAt: Date | null;
    } | undefined>;
    insert(data: {
        threadId: string;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        runId?: string | null | undefined;
        status?: "active" | "completed" | "aborted" | "expired" | undefined;
        resumeToken?: string | null | undefined;
        lastEventId?: string | null | undefined;
        snapshot?: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        } | null | undefined;
        expiresAt?: Date | null | undefined;
    }[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        threadId: string;
        runId: string | null;
        status: "active" | "completed" | "aborted" | "expired";
        resumeToken: string | null;
        lastEventId: string | null;
        snapshot: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        } | null;
        expiresAt: Date | null;
    }[]>;
    update(conditions: import("drizzle-orm").SQL[], data: Partial<{
        threadId: string;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        runId?: string | null | undefined;
        status?: "active" | "completed" | "aborted" | "expired" | undefined;
        resumeToken?: string | null | undefined;
        lastEventId?: string | null | undefined;
        snapshot?: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        } | null | undefined;
        expiresAt?: Date | null | undefined;
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        threadId: string;
        runId: string | null;
        status: "active" | "completed" | "aborted" | "expired";
        resumeToken: string | null;
        lastEventId: string | null;
        snapshot: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        } | null;
        expiresAt: Date | null;
    }[]>;
    delete(conditions: import("drizzle-orm").SQL[]): Promise<void>;
    buildConditions(filters: Record<string, {
        column: any;
        values: unknown[];
    } | undefined>): import("drizzle-orm").SQL[];
    table: any;
    idColumn: any;
};
export type StreamsModel = ReturnType<typeof createStreamsModel>;
export type { Stream, NewStream };
//# sourceMappingURL=streams.d.ts.map