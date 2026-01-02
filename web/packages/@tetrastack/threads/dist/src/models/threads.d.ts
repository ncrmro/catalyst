/**
 * Thread model operations following the many-first pattern.
 * Provides CRUD operations for thread containers.
 */
import { type DrizzleDb } from './factory';
import { type Thread, type NewThread } from '../database/schema/sqlite';
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
export declare function createThreadsModel(db: DrizzleDb): {
    /**
     * Find a thread by its polymorphic scope.
     * Returns the thread for a specific parent record.
     */
    findByScope(projectId: string, scopeType: string, scopeId: string): Promise<Thread[]>;
    /**
     * Get or create a thread for a scope.
     * Useful for ensuring a thread exists before adding items.
     */
    getOrCreate(projectId: string, scopeType: string, scopeId: string, title?: string): Promise<Thread>;
    /**
     * List all threads for a project.
     */
    listByProject(projectId: string): Promise<Thread[]>;
    /**
     * Update thread metadata and title.
     */
    updateThread(id: string, data: Partial<Pick<NewThread, "title" | "metadata">>): Promise<Thread>;
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
export type ThreadsModel = ReturnType<typeof createThreadsModel>;
export type { Thread, NewThread };
//# sourceMappingURL=threads.d.ts.map