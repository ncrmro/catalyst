/**
 * Edge model operations following the many-first pattern.
 * Edges define DAG dependencies for complex agent workflows.
 */
import { type DrizzleDb } from './factory';
import { type Edge, type NewEdge } from '../database/schema/sqlite';
import type { EdgeType } from '../types';
/**
 * Creates an edges model instance bound to the given database.
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import { createEdgesModel } from '@tetrastack/threads/models';
 *
 * const db = drizzle(sqlite);
 * const edgesModel = createEdgesModel(db);
 *
 * // Create a dependency edge (mapper -> reducer)
 * const [edge] = await edgesModel.insert([{
 *   threadId: 'thread_123',
 *   fromItemId: 'item_mapper_1',
 *   toItemId: 'item_reducer',
 *   type: 'depends_on',
 *   requestId: 'req_abc',
 * }]);
 *
 * // Get all dependencies for an item
 * const deps = await edgesModel.getDependencies('item_reducer');
 * ```
 */
export declare function createEdgesModel(db: DrizzleDb): {
    /**
     * List all edges in a thread.
     */
    listByThread(threadId: string): Promise<Edge[]>;
    /**
     * Get items that this item depends on (incoming edges).
     */
    getDependencies(toItemId: string): Promise<Edge[]>;
    /**
     * Get items that depend on this item (outgoing edges).
     */
    getDependents(fromItemId: string): Promise<Edge[]>;
    /**
     * Add a dependency edge between two items.
     */
    addDependency(threadId: string, fromItemId: string, toItemId: string, requestId: string, type?: EdgeType): Promise<Edge>;
    /**
     * Get the DAG structure for visualization.
     * Returns nodes (item IDs) and edges in a format suitable for graph rendering.
     */
    getDAGStructure(threadId: string): Promise<{
        nodes: string[];
        edges: Array<{
            from: string;
            to: string;
            type: EdgeType;
        }>;
    }>;
    /**
     * Check if an item has all its dependencies satisfied.
     * Useful for determining if a workflow step can execute.
     */
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
export type EdgesModel = ReturnType<typeof createEdgesModel>;
export type { Edge, NewEdge };
//# sourceMappingURL=edges.d.ts.map