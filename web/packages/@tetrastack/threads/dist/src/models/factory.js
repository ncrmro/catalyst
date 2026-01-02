/**
 * Model CRUD factory for @tetrastack/threads.
 * Uses the many-first design pattern.
 *
 * This is a database-agnostic factory that requires a db instance
 * to be passed in, allowing host applications to use their own
 * database connections.
 */
import { and, eq, inArray } from 'drizzle-orm';
/**
 * Takes the first element from an array, throwing an error if not found.
 * Used to convert many-first operations to single-record operations.
 */
export function takeFirst(items, errorMsg) {
    if (!items[0]) {
        throw new Error(errorMsg || 'Record not found');
    }
    return items[0];
}
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
export function createModelFactory(db, table, idColumn, insertSchema) {
    return {
        takeFirst,
        /**
         * Select multiple records with flexible filtering using SQL conditions.
         */
        async select(conditions = []) {
            const result = await db
                .select()
                .from(table)
                .where(conditions.length > 0 ? and(...conditions) : undefined);
            return result;
        },
        /**
         * Select a single record by ID.
         */
        async selectById(id) {
            const result = await db.select().from(table).where(eq(idColumn, id));
            return result[0];
        },
        /**
         * Insert multiple records (many-first design).
         */
        async insert(data) {
            const validated = data.map((item) => insertSchema.parse(item));
            const result = await db.insert(table).values(validated).returning();
            return result;
        },
        /**
         * Update multiple records matching conditions (many-first design).
         */
        async update(conditions, data) {
            const validated = insertSchema.partial().parse(data);
            const result = await db
                .update(table)
                .set(validated)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .returning();
            return result;
        },
        /**
         * Delete multiple records matching conditions.
         */
        async delete(conditions) {
            await db
                .delete(table)
                .where(conditions.length > 0 ? and(...conditions) : undefined);
        },
        /**
         * Build SQL conditions for flexible querying.
         */
        buildConditions(filters) {
            const conditions = [];
            for (const filter of Object.values(filters)) {
                if (filter && filter.values.length > 0) {
                    conditions.push(inArray(filter.column, filter.values));
                }
            }
            return conditions;
        },
        /**
         * Get the table reference for advanced queries.
         */
        get table() {
            return table;
        },
        /**
         * Get the ID column reference.
         */
        get idColumn() {
            return idColumn;
        },
    };
}
