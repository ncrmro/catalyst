/**
 * Edge model operations following the many-first pattern.
 * Edges define DAG dependencies for complex agent workflows.
 */

import { eq } from 'drizzle-orm';
import { createModelFactory, type DrizzleDb } from './factory';
import {
  edges,
  insertEdgeSchema,
  type Edge,
  type NewEdge,
} from '../database/schema/sqlite';
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
export function createEdgesModel(db: DrizzleDb) {
  const base = createModelFactory<NewEdge, Edge>(
    db,
    edges,
    edges.id,
    insertEdgeSchema,
  );

  return {
    ...base,

    /**
     * List all edges in a thread.
     */
    async listByThread(threadId: string): Promise<Edge[]> {
      return base.select([eq(edges.threadId, threadId)]);
    },

    /**
     * Get items that this item depends on (incoming edges).
     */
    async getDependencies(toItemId: string): Promise<Edge[]> {
      return base.select([eq(edges.toItemId, toItemId)]);
    },

    /**
     * Get items that depend on this item (outgoing edges).
     */
    async getDependents(fromItemId: string): Promise<Edge[]> {
      return base.select([eq(edges.fromItemId, fromItemId)]);
    },

    /**
     * Add a dependency edge between two items.
     */
    async addDependency(
      threadId: string,
      fromItemId: string,
      toItemId: string,
      requestId: string,
      type: EdgeType = 'depends_on',
    ): Promise<Edge> {
      const [edge] = await base.insert([
        { threadId, fromItemId, toItemId, type, requestId },
      ]);
      return edge;
    },

    /**
     * Get the DAG structure for visualization.
     * Returns nodes (item IDs) and edges in a format suitable for graph rendering.
     */
    async getDAGStructure(threadId: string): Promise<{
      nodes: string[];
      edges: Array<{ from: string; to: string; type: EdgeType }>;
    }> {
      const allEdges = await this.listByThread(threadId);
      const nodeSet = new Set<string>();

      for (const edge of allEdges) {
        nodeSet.add(edge.fromItemId);
        nodeSet.add(edge.toItemId);
      }

      return {
        nodes: Array.from(nodeSet),
        edges: allEdges.map((e) => ({
          from: e.fromItemId,
          to: e.toItemId,
          type: e.type as EdgeType,
        })),
      };
    },

    /**
     * Check if an item has all its dependencies satisfied.
     * Useful for determining if a workflow step can execute.
     */
    async areDependenciesSatisfied(
      toItemId: string,
      completedItemIds: Set<string>,
    ): Promise<boolean> {
      const deps = await this.getDependencies(toItemId);
      return deps.every((dep) => completedItemIds.has(dep.fromItemId));
    },
  };
}

export type EdgesModel = ReturnType<typeof createEdgesModel>;

// Re-export types for convenience
export type { Edge, NewEdge };
