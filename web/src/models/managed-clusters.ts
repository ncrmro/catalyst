/**
 * Managed Clusters Model
 *
 * Database operations for managed_clusters table.
 * No authentication — handled by actions layer.
 */

import { db } from "@/db";
import { managedClusters } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export type InsertManagedCluster = InferInsertModel<typeof managedClusters>;

export interface GetManagedClustersParams {
  ids?: string[];
  teamIds?: string[];
  cloudAccountIds?: string[];
  statuses?: string[];
}

/**
 * Get managed clusters with optional filtering.
 */
export async function getManagedClusters(params: GetManagedClustersParams) {
  const { ids, teamIds, cloudAccountIds, statuses } = params;

  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(managedClusters.id, ids));
  }
  if (teamIds && teamIds.length > 0) {
    conditions.push(inArray(managedClusters.teamId, teamIds));
  }
  if (cloudAccountIds && cloudAccountIds.length > 0) {
    conditions.push(inArray(managedClusters.cloudAccountId, cloudAccountIds));
  }
  if (statuses && statuses.length > 0) {
    conditions.push(inArray(managedClusters.status, statuses));
  }

  if (conditions.length === 0) {
    return [];
  }

  return db
    .select()
    .from(managedClusters)
    .where(and(...conditions));
}

/**
 * Create a managed cluster.
 */
export async function createManagedCluster(
  data: Omit<InsertManagedCluster, "id" | "createdAt" | "updatedAt">,
) {
  const [created] = await db
    .insert(managedClusters)
    .values({
      ...data,
      status: data.status ?? "provisioning",
      deletionProtection: data.deletionProtection ?? true,
    })
    .returning();

  return created;
}

/**
 * Update a managed cluster by ID.
 */
export async function updateManagedCluster(
  id: string,
  data: Partial<{
    name: string;
    status: string;
    region: string;
    kubernetesVersion: string;
    config: unknown;
    kubeconfigEncrypted: string | null;
    kubeconfigIv: string | null;
    kubeconfigAuthTag: string | null;
    deletionProtection: boolean;
    deleteGracePeriodEnds: Date | null;
  }>,
) {
  const [updated] = await db
    .update(managedClusters)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(managedClusters.id, id))
    .returning();

  return updated;
}

/**
 * Request deletion of a managed cluster.
 * Rejects if deletionProtection is enabled.
 * Sets a 72-hour grace period.
 */
export async function requestClusterDeletion(id: string) {
  const [cluster] = await db
    .select()
    .from(managedClusters)
    .where(eq(managedClusters.id, id))
    .limit(1);

  if (!cluster) {
    throw new Error("Cluster not found");
  }

  if (cluster.deletionProtection) {
    throw new Error(
      "Deletion protection is enabled. Disable it before deleting.",
    );
  }

  const gracePeriodEnd = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const [updated] = await db
    .update(managedClusters)
    .set({
      status: "deleting",
      deleteGracePeriodEnds: gracePeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(managedClusters.id, id))
    .returning();

  return updated;
}
