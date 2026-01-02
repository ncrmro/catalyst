/**
 * Model CRUD factory for @tetrastack/threads.
 * Uses the many-first design pattern.
 *
 * This is a database-agnostic factory that requires a db instance
 * to be passed in, allowing host applications to use their own
 * database connections.
 */

import { and, eq, inArray, type SQL } from 'drizzle-orm';

/**
 * Database interface that both SQLite and PostgreSQL clients implement.
 * Allows the factory to work with any Drizzle database instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleDb = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

/**
 * Minimal schema interface for validation.
 * Compatible with Zod schemas from drizzle-zod.
 */
interface ValidationSchema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse: (data: unknown) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  partial: () => { parse: (data: unknown) => any };
}

/**
 * Takes the first element from an array, throwing an error if not found.
 * Used to convert many-first operations to single-record operations.
 */
export function takeFirst<T>(items: T[], errorMsg?: string): T {
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
export function createModelFactory<
  TInsert extends Record<string, unknown>,
  TSelect,
>(
  db: DrizzleDb,
  table: AnyTable,
  idColumn: AnyTable,
  insertSchema: ValidationSchema,
) {
  return {
    takeFirst,

    /**
     * Select multiple records with flexible filtering using SQL conditions.
     */
    async select(conditions: SQL[] = []): Promise<TSelect[]> {
      const result = await db
        .select()
        .from(table)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      return result as TSelect[];
    },

    /**
     * Select a single record by ID.
     */
    async selectById(id: string): Promise<TSelect | undefined> {
      const result = await db.select().from(table).where(eq(idColumn, id));
      return (result as TSelect[])[0];
    },

    /**
     * Insert multiple records (many-first design).
     */
    async insert(data: TInsert[]): Promise<TSelect[]> {
      const validated = data.map((item) => insertSchema.parse(item));
      const result = await db.insert(table).values(validated).returning();
      return result as TSelect[];
    },

    /**
     * Update multiple records matching conditions (many-first design).
     */
    async update(
      conditions: SQL[],
      data: Partial<TInsert>,
    ): Promise<TSelect[]> {
      const validated = insertSchema.partial().parse(data);
      const result = await db
        .update(table)
        .set(validated)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .returning();
      return result as TSelect[];
    },

    /**
     * Delete multiple records matching conditions.
     */
    async delete(conditions: SQL[]): Promise<void> {
      await db
        .delete(table)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    },

    /**
     * Build SQL conditions for flexible querying.
     */
    buildConditions(
      filters: Record<
        string,
        | {
            column: AnyTable;
            values: unknown[];
          }
        | undefined
      >,
    ): SQL[] {
      const conditions: SQL[] = [];
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

/**
 * Type helper to infer Select type from a model CRUD instance.
 */
export type ModelSelect<
  T extends { select: (...args: never[]) => Promise<unknown[]> },
> = Awaited<ReturnType<T['select']>>[number];

/**
 * Type helper to infer Insert type from a model CRUD instance.
 */
export type ModelInsert<
  T extends { insert: (...args: never[]) => Promise<unknown> },
> = Parameters<T['insert']>[0] extends (infer U)[] ? U : never;
