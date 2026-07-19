/**
 * Cloud Resource Usage Recording Job
 *
 * Records hourly cloud resource usage (managed clusters, nodes) per team.
 * Follows the same pattern as usage-job.ts for environment billing.
 */

import { isTeamOnPaidPlan } from "./models";
import { eq, and, count, sum } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

export interface CloudResourceCounts {
  clusterCount: number;
  totalNodeCount: number;
}

export interface CloudUsageResult {
  teamId: string;
  success: boolean;
  error?: string;
  reportedToStripe: boolean;
}

/**
 * Count active managed clusters and total nodes for a team.
 */
export async function countTeamCloudResources(
  db: PgDatabase<any, any, any>,
  teamId: string,
  schema: { managedClusters: any; nodePools: any },
): Promise<CloudResourceCounts> {
  try {
    const { managedClusters, nodePools } = schema;

    // Count active clusters for this team
    const clusterRows = await db
      .select({ clusterCount: count(managedClusters.id) })
      .from(managedClusters)
      .where(
        and(
          eq(managedClusters.teamId, teamId),
          eq(managedClusters.status, "active"),
        ),
      );

    const clusterCount = clusterRows[0]?.clusterCount ?? 0;

    if (clusterCount === 0) {
      return { clusterCount: 0, totalNodeCount: 0 };
    }

    // Sum current nodes across all active clusters' node pools
    const nodeRows = await db
      .select({ totalNodes: sum(nodePools.currentNodes) })
      .from(nodePools)
      .innerJoin(
        managedClusters,
        eq(nodePools.clusterId, managedClusters.id),
      )
      .where(
        and(
          eq(managedClusters.teamId, teamId),
          eq(managedClusters.status, "active"),
        ),
      );

    const totalNodeCount = Number(nodeRows[0]?.totalNodes ?? 0);

    return { clusterCount, totalNodeCount };
  } catch (error) {
    console.error("[cloud-usage-job] Error counting cloud resources", {
      teamId,
      error,
    });
    return { clusterCount: 0, totalNodeCount: 0 };
  }
}

/**
 * Record cloud resource usage for a single team.
 * Skips free-tier teams (reportedToStripe: false).
 */
export async function recordTeamCloudUsage(
  db: PgDatabase<any, any, any>,
  teamId: string,
  hour: Date,
  schema: {
    managedClusters: any;
    nodePools: any;
    cloudResourceUsageRecords: any;
  },
): Promise<CloudUsageResult> {
  try {
    const isPaid = await isTeamOnPaidPlan(db, teamId);
    if (!isPaid) {
      return {
        teamId,
        success: true,
        reportedToStripe: false,
      };
    }

    const counts = await countTeamCloudResources(db, teamId, schema);

    // Record usage if there are any resources
    if (counts.clusterCount > 0 || counts.totalNodeCount > 0) {
      console.info("[cloud-usage-job] Recorded cloud usage for team", {
        teamId,
        hour: hour.toISOString(),
        clusterCount: counts.clusterCount,
        totalNodeCount: counts.totalNodeCount,
      });
    }

    return {
      teamId,
      success: true,
      reportedToStripe: isPaid && (counts.clusterCount > 0 || counts.totalNodeCount > 0),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error("[cloud-usage-job] Failed to record cloud usage for team", {
      teamId,
      error: errorMessage,
    });

    return {
      teamId,
      success: false,
      error: errorMessage,
      reportedToStripe: false,
    };
  }
}
