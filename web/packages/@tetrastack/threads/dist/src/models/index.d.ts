/**
 * Model layer exports for @tetrastack/threads.
 * Uses the many-first design pattern.
 */
import { type Thread } from './threads';
import { type Item } from './items';
import type { DrizzleDb } from './factory';
export { createModelFactory, takeFirst } from './factory';
export type { DrizzleDb, ModelSelect, ModelInsert } from './factory';
export { createThreadsModel } from './threads';
export type { ThreadsModel, Thread, NewThread } from './threads';
export { createItemsModel } from './items';
export type { ItemsModel, Item, NewItem } from './items';
/**
 * Thread with its items (messages) included.
 * This is the shape returned when fetching a thread with a join on items.
 */
export interface ThreadWithItems extends Thread {
    items: Item[];
}
export { createEdgesModel } from './edges';
export type { EdgesModel, Edge, NewEdge } from './edges';
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
export declare function createThreadModels(db: DrizzleDb): {
    threads: {
        findByScope(projectId: string, scopeType: string, scopeId: string): Promise<Thread[]>;
        getOrCreate(projectId: string, scopeType: string, scopeId: string, title?: string): Promise<Thread>;
        listByProject(projectId: string): Promise<Thread[]>;
        updateThread(id: string, data: Partial<Pick<import("./threads").NewThread, "title" | "metadata">>): Promise<Thread>;
        takeFirst: typeof import("./factory").takeFirst;
        select(conditions?: import("drizzle-orm").SQL[]): Promise<{
            id: string;
            projectId: string;
            scopeType: string | null;
            scopeId: string | null;
            title: string | null;
            metadata: Record<string, unknown> | null;
            createdAt: Date;
            updatedAt: Date;
        }[]>;
        selectById(id: string): Promise<{
            id: string;
            projectId: string;
            scopeType: string | null;
            scopeId: string | null;
            title: string | null;
            metadata: Record<string, unknown> | null;
            createdAt: Date;
            updatedAt: Date;
        } | undefined>;
        insert(data: {
            projectId: string;
            id?: string | undefined;
            scopeType?: string | null | undefined;
            scopeId?: string | null | undefined;
            title?: string | null | undefined;
            metadata?: Record<string, unknown> | null | undefined;
            createdAt?: Date | undefined;
            updatedAt?: Date | undefined;
        }[]): Promise<{
            id: string;
            projectId: string;
            scopeType: string | null;
            scopeId: string | null;
            title: string | null;
            metadata: Record<string, unknown> | null;
            createdAt: Date;
            updatedAt: Date;
        }[]>;
        update(conditions: import("drizzle-orm").SQL[], data: Partial<{
            projectId: string;
            id?: string | undefined;
            scopeType?: string | null | undefined;
            scopeId?: string | null | undefined;
            title?: string | null | undefined;
            metadata?: Record<string, unknown> | null | undefined;
            createdAt?: Date | undefined;
            updatedAt?: Date | undefined;
        }>): Promise<{
            id: string;
            projectId: string;
            scopeType: string | null;
            scopeId: string | null;
            title: string | null;
            metadata: Record<string, unknown> | null;
            createdAt: Date;
            updatedAt: Date;
        }[]>;
        delete(conditions: import("drizzle-orm").SQL[]): Promise<void>;
        buildConditions(filters: Record<string, {
            column: any;
            values: unknown[];
        } | undefined>): import("drizzle-orm").SQL[];
        table: any;
        idColumn: any;
    };
    items: {
        listByThread(threadId: string, order?: "asc" | "desc"): Promise<Item[]>;
        listByRun(threadId: string, runId: string): Promise<Item[]>;
        listBySpan(threadId: string, spanId: string): Promise<Item[]>;
        listVisible(threadId: string): Promise<Item[]>;
        listForContext(threadId: string): Promise<Item[]>;
        append(data: import("./items").NewItem): Promise<Item>;
        setVisibility(id: string, visibility: import("..").Visibility): Promise<Item>;
        archive(id: string): Promise<Item>;
        hide(id: string): Promise<Item>;
        getReplies(parentId: string): Promise<Item[]>;
        getLatest(threadId: string): Promise<Item | undefined>;
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
    edges: {
        listByThread(threadId: string): Promise<import("./edges").Edge[]>;
        getDependencies(toItemId: string): Promise<import("./edges").Edge[]>;
        getDependents(fromItemId: string): Promise<import("./edges").Edge[]>;
        addDependency(threadId: string, fromItemId: string, toItemId: string, requestId: string, type?: import("..").EdgeType): Promise<import("./edges").Edge>;
        getDAGStructure(threadId: string): Promise<{
            nodes: string[];
            edges: Array<{
                from: string;
                to: string;
                type: import("..").EdgeType;
            }>;
        }>;
        areDependenciesSatisfied(toItemId: string, completedItemIds: Set<string>): Promise<boolean>;
        takeFirst: typeof import("./factory").takeFirst;
        select(conditions?: import("drizzle-orm").SQL[]): Promise<{
            id: string;
            createdAt: Date;
            threadId: string;
            requestId: string;
            fromItemId: string;
            toItemId: string;
            type: "depends_on" | "caused_by";
        }[]>;
        selectById(id: string): Promise<{
            id: string;
            createdAt: Date;
            threadId: string;
            requestId: string;
            fromItemId: string;
            toItemId: string;
            type: "depends_on" | "caused_by";
        } | undefined>;
        insert(data: {
            threadId: string;
            requestId: string;
            fromItemId: string;
            toItemId: string;
            id?: string | undefined;
            createdAt?: Date | undefined;
            type?: "depends_on" | "caused_by" | undefined;
        }[]): Promise<{
            id: string;
            createdAt: Date;
            threadId: string;
            requestId: string;
            fromItemId: string;
            toItemId: string;
            type: "depends_on" | "caused_by";
        }[]>;
        update(conditions: import("drizzle-orm").SQL[], data: Partial<{
            threadId: string;
            requestId: string;
            fromItemId: string;
            toItemId: string;
            id?: string | undefined;
            createdAt?: Date | undefined;
            type?: "depends_on" | "caused_by" | undefined;
        }>): Promise<{
            id: string;
            createdAt: Date;
            threadId: string;
            requestId: string;
            fromItemId: string;
            toItemId: string;
            type: "depends_on" | "caused_by";
        }[]>;
        delete(conditions: import("drizzle-orm").SQL[]): Promise<void>;
        buildConditions(filters: Record<string, {
            column: any;
            values: unknown[];
        } | undefined>): import("drizzle-orm").SQL[];
        table: any;
        idColumn: any;
    };
    streams: {
        getActive(threadId: string): Promise<import("./streams").Stream | undefined>;
        getByRun(threadId: string, runId: string): Promise<import("./streams").Stream | undefined>;
        start(threadId: string, runId: string | null, expiresInMs?: number): Promise<import("./streams").Stream>;
        updateSnapshot(id: string, snapshot: {
            parts: import("..").MessagePart[];
            metadata?: Record<string, unknown>;
        }, lastEventId?: string): Promise<import("./streams").Stream>;
        setResumeToken(id: string, resumeToken: string): Promise<import("./streams").Stream>;
        complete(id: string): Promise<import("./streams").Stream>;
        abort(id: string): Promise<import("./streams").Stream>;
        expireStale(): Promise<number>;
        getByResumeToken(resumeToken: string): Promise<import("./streams").Stream | undefined>;
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
                parts: import("..").MessagePart[];
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
                parts: import("..").MessagePart[];
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
                parts: import("..").MessagePart[];
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
                parts: import("..").MessagePart[];
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
                parts: import("..").MessagePart[];
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
                parts: import("..").MessagePart[];
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
    getThreadWithItems(threadId: string): Promise<ThreadWithItems | undefined>;
};
export type ThreadModels = ReturnType<typeof createThreadModels>;
//# sourceMappingURL=index.d.ts.map