"use server";

import { auth } from "@/auth";
import { isUserTeamMember, isUserTeamAdminOrOwner } from "@/lib/team-auth";
import {
  getManagedClusters,
  createManagedCluster as createManagedClusterModel,
  requestClusterDeletion as requestClusterDeletionModel,
  updateManagedCluster,
} from "@/models/managed-clusters";
import { getCloudAccounts } from "@/models/cloud-accounts";
import {
  createClusterClaim,
  deleteClusterClaim,
} from "@/models/crossplane-bridge";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface ManagedClusterSummary {
  id: string;
  cloudAccountId: string;
  teamId: string;
  name: string;
  status: string;
  region: string;
  kubernetesVersion: string;
  deletionProtection: boolean;
  deleteGracePeriodEnds: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listManagedClusters(
  teamId: string,
): Promise<ActionResult<ManagedClusterSummary[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isMember = await isUserTeamMember(teamId);
  if (!isMember) {
    return { success: false, error: "Not authorized to view clusters" };
  }

  try {
    const clusters = await getManagedClusters({ teamIds: [teamId] });

    const summaries: ManagedClusterSummary[] = clusters.map((c) => ({
      id: c.id,
      cloudAccountId: c.cloudAccountId,
      teamId: c.teamId,
      name: c.name,
      status: c.status,
      region: c.region,
      kubernetesVersion: c.kubernetesVersion,
      deletionProtection: c.deletionProtection,
      deleteGracePeriodEnds: c.deleteGracePeriodEnds,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return { success: true, data: summaries };
  } catch (error) {
    console.error("Failed to list managed clusters:", error);
    return { success: false, error: "Failed to list managed clusters" };
  }
}

export async function createManagedCluster(
  teamId: string,
  input: {
    cloudAccountId: string;
    name: string;
    region: string;
    kubernetesVersion: string;
    config?: unknown;
  },
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isAdmin = await isUserTeamAdminOrOwner(teamId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Only team admins can create clusters",
    };
  }

  // Verify cloud account belongs to team
  const accounts = await getCloudAccounts({
    ids: [input.cloudAccountId],
    teamIds: [teamId],
  });
  if (accounts.length === 0) {
    return {
      success: false,
      error: "Cloud account not found or does not belong to team",
    };
  }

  try {
    const cluster = await createManagedClusterModel({
      cloudAccountId: input.cloudAccountId,
      teamId,
      name: input.name,
      region: input.region,
      kubernetesVersion: input.kubernetesVersion,
      config: input.config,
      createdBy: session.user.id,
    });

    // Create Crossplane KubernetesCluster Claim
    await createClusterClaim(cluster.id);

    return { success: true, data: { id: cluster.id } };
  } catch (error) {
    console.error("Failed to create managed cluster:", error);
    return { success: false, error: "Failed to create managed cluster" };
  }
}

export async function deleteManagedCluster(
  teamId: string,
  clusterId: string,
  confirmationName: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isAdmin = await isUserTeamAdminOrOwner(teamId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Only team admins can delete clusters",
    };
  }

  // Verify cluster exists and belongs to team
  const clusters = await getManagedClusters({
    ids: [clusterId],
    teamIds: [teamId],
  });
  if (clusters.length === 0) {
    return { success: false, error: "Cluster not found" };
  }

  // Verify confirmation name matches
  if (clusters[0].name !== confirmationName) {
    return {
      success: false,
      error: "Confirmation name does not match cluster name",
    };
  }

  try {
    const deleted = await requestClusterDeletionModel(clusterId);
    
    // Delete Crossplane KubernetesCluster Claim
    await deleteClusterClaim(clusterId);
    
    return { success: true, data: { id: deleted.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete cluster";
    return { success: false, error: message };
  }
}
