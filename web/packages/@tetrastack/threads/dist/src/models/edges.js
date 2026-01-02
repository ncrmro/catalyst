/**
 * Edge model operations following the many-first pattern.
 * Edges define DAG dependencies for complex agent workflows.
 */
import { eq } from 'drizzle-orm';
import { createModelFactory } from './factory';
import { edges, insertEdgeSchema, } from '../database/schema/sqlite';
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
export function createEdgesModel(db) {
    const base = createModelFactory(db, edges, edges.id, insertEdgeSchema);
    return {
        ...base,
        /**
         * List all edges in a thread.
         */
        async listByThread(threadId) {
            return base.select([eq(edges.threadId, threadId)]);
        },
        /**
         * Get items that this item depends on (incoming edges).
         */
        async getDependencies(toItemId) {
            return base.select([eq(edges.toItemId, toItemId)]);
        },
        /**
         * Get items that depend on this item (outgoing edges).
         */
        async getDependents(fromItemId) {
            return base.select([eq(edges.fromItemId, fromItemId)]);
        },
        /**
         * Add a dependency edge between two items.
         */
        async addDependency(threadId, fromItemId, toItemId, requestId, type = 'depends_on') {
            const [edge] = await base.insert([
                { threadId, fromItemId, toItemId, type, requestId },
            ]);
            return edge;
        },
        /**
         * Get the DAG structure for visualization.
         * Returns nodes (item IDs) and edges in a format suitable for graph rendering.
         */
        async getDAGStructure(threadId) {
            const allEdges = await this.listByThread(threadId);
            const nodeSet = new Set();
            for (const edge of allEdges) {
                nodeSet.add(edge.fromItemId);
                nodeSet.add(edge.toItemId);
            }
            return {
                nodes: Array.from(nodeSet),
                edges: allEdges.map((e) => ({
                    from: e.fromItemId,
                    to: e.toItemId,
                    type: e.type,
                })),
            };
        },
        /**
         * Check if an item has all its dependencies satisfied.
         * Useful for determining if a workflow step can execute.
         */
        async areDependenciesSatisfied(toItemId, completedItemIds) {
            const deps = await this.getDependencies(toItemId);
            return deps.every((dep) => completedItemIds.has(dep.fromItemId));
        },
    };
}
