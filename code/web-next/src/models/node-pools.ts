/**
 * Node Pools Model
 *
 * Database operations for node_pools table.
 * No authentication — handled by actions layer.
 */

import { db } from "@/db";
import { nodePools } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export type InsertNodePool = InferInsertModel<typeof nodePools>;

export interface GetNodePoolsParams {
  ids?: string[];
  clusterIds?: string[];
  statuses?: string[];
}

/**
 * Get node pools with optional filtering.
 */
export async function getNodePools(params: GetNodePoolsParams) {
  const { ids, clusterIds, statuses } = params;

  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(nodePools.id, ids));
  }
  if (clusterIds && clusterIds.length > 0) {
    conditions.push(inArray(nodePools.clusterId, clusterIds));
  }
  if (statuses && statuses.length > 0) {
    conditions.push(inArray(nodePools.status, statuses));
  }

  if (conditions.length === 0) {
    return [];
  }

  return db
    .select()
    .from(nodePools)
    .where(and(...conditions));
}

/**
 * Create a node pool.
 */
export async function createNodePool(
  data: Omit<InsertNodePool, "id" | "createdAt" | "updatedAt">,
) {
  const [created] = await db.insert(nodePools).values(data).returning();
  return created;
}

/**
 * Update a node pool by ID.
 */
export async function updateNodePool(
  id: string,
  data: Partial<{
    name: string;
    instanceType: string;
    minNodes: number;
    maxNodes: number;
    currentNodes: number;
    spotEnabled: boolean;
    status: string;
  }>,
) {
  const [updated] = await db
    .update(nodePools)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(nodePools.id, id))
    .returning();

  return updated;
}
