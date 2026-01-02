/**
 * Model CRUD factory for @tetrastack/threads.
 * Uses the many-first design pattern.
 *
 * This is a database-agnostic factory that requires a db instance
 * to be passed in, allowing host applications to use their own
 * database connections.
 */
import { type SQL } from 'drizzle-orm';
/**
 * Database interface that both SQLite and PostgreSQL clients implement.
 * Allows the factory to work with any Drizzle database instance.
 */
export type DrizzleDb = any;
type AnyTable = any;
/**
 * Minimal schema interface for validation.
 * Compatible with Zod schemas from drizzle-zod.
 */
interface ValidationSchema {
    parse: (data: unknown) => any;
    partial: () => {
        parse: (data: unknown) => any;
    };
}
/**
 * Takes the first element from an array, throwing an error if not found.
 * Used to convert many-first operations to single-record operations.
 */
export declare function takeFirst<T>(items: T[], errorMsg?: string): T;
/**
 * Generic CRUD model factory - "many-first" design pattern.
 * Creates standard database operations for a given table.
 *
 * @example
 * ```typescript
 * import { threads, insertThreadSchema } from '../database/schema/sqlite';
 * import { createModelFactory } from './factory';
 *
 * export function createThreadsModel(db: DrizzleDb) {
 *   return createModelFactory(db, threads, threads.id, insertThreadSchema);
 * }
 *
 * // Usage:
 * const threadsModel = createThreadsModel(db);
 * const [thread] = await threadsModel.insert([{ projectId: 'proj_123' }]);
 * ```
 */
export declare function createModelFactory<TInsert extends Record<string, unknown>, TSelect>(db: DrizzleDb, table: AnyTable, idColumn: AnyTable, insertSchema: ValidationSchema): {
    takeFirst: typeof takeFirst;
    /**
     * Select multiple records with flexible filtering using SQL conditions.
     */
    select(conditions?: SQL[]): Promise<TSelect[]>;
    /**
     * Select a single record by ID.
     */
    selectById(id: string): Promise<TSelect | undefined>;
    /**
     * Insert multiple records (many-first design).
     */
    insert(data: TInsert[]): Promise<TSelect[]>;
    /**
     * Update multiple records matching conditions (many-first design).
     */
    update(conditions: SQL[], data: Partial<TInsert>): Promise<TSelect[]>;
    /**
     * Delete multiple records matching conditions.
     */
    delete(conditions: SQL[]): Promise<void>;
    /**
     * Build SQL conditions for flexible querying.
     */
    buildConditions(filters: Record<string, {
        column: AnyTable;
        values: unknown[];
    } | undefined>): SQL[];
    /**
     * Get the table reference for advanced queries.
     */
    readonly table: any;
    /**
     * Get the ID column reference.
     */
    readonly idColumn: any;
};
/**
 * Type helper to infer Select type from a model CRUD instance.
 */
export type ModelSelect<T extends {
    select: (...args: never[]) => Promise<unknown[]>;
}> = Awaited<ReturnType<T['select']>>[number];
/**
 * Type helper to infer Insert type from a model CRUD instance.
 */
export type ModelInsert<T extends {
    insert: (...args: never[]) => Promise<unknown>;
}> = Parameters<T['insert']>[0] extends (infer U)[] ? U : never;
export {};
//# sourceMappingURL=factory.d.ts.map