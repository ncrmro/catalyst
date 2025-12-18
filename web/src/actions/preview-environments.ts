"use server";

/**
 * Preview Environments Actions Layer
 *
 * Server actions for managing PR preview environments.
 * This layer handles authentication, authorization, and delegates to models.
 */

import { auth } from "@/auth";
import {
  listActivePreviewPods,
  listActivePreviewPodsWithMetrics,
  userHasAccessToPod,
  getPreviewDeploymentStatusFull,
  getPreviewDeploymentLogs,
  deletePreviewDeploymentOrchestrated,
  retryFailedDeployment,
  createManualPreviewEnvironment,
  type CreateManualPreviewResult,
  type SelectPullRequestPod,
  type SelectPullRequest,
  type SelectRepo,
  type PreviewPodWithMetrics,
  type PodResourceUsage,
} from "@/models/preview-environments";
import { db } from "@/db";
import {
  repos,
  teams,
  teamsMemberships,
  pullRequestPods,
  pullRequests,
} from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

// Re-export types for frontend components
export type { SelectPullRequestPod, SelectPullRequest, SelectRepo };
export type { PreviewPodWithMetrics, PodResourceUsage };
export type {
  PodStatus,
  ResourceAllocation,
} from "@/types/preview-environments";

// Type for preview pod with related data
export type PreviewPodWithRelations = SelectPullRequestPod & {
  pullRequest: SelectPullRequest;
  repo: SelectRepo;
};

// Result types for actions
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * List all active preview environments for the current user.
 *
 * Returns pods that the user has access to through team membership.
 */
export async function getActivePreviewEnvironments(): Promise<
  ActionResult<PreviewPodWithRelations[]>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await listActivePreviewPods(session.user.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.pods };
}

/**
 * Get detailed status of a preview environment.
 *
 * Combines database state with live Kubernetes status.
 */
export async function getPreviewEnvironmentStatus(podId: string): Promise<
  ActionResult<{
    dbStatus: string;
    k8sStatus?: {
      ready: boolean;
      status: string;
      replicas?: number;
      readyReplicas?: number;
      error?: string;
    };
    publicUrl?: string;
    namespace: string;
    deploymentName: string;
    branch: string;
    commitSha: string;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check authorization
  const hasAccess = await userHasAccessToPod(session.user.id, podId);
  if (!hasAccess) {
    return { success: false, error: "Access denied" };
  }

  const result = await getPreviewDeploymentStatusFull(podId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.status };
}

/**
 * Get logs from a preview environment.
 */
export async function getPreviewEnvironmentLogs(
  podId: string,
  options?: { tailLines?: number; timestamps?: boolean },
): Promise<ActionResult<string>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check authorization
  const hasAccess = await userHasAccessToPod(session.user.id, podId);
  if (!hasAccess) {
    return { success: false, error: "Access denied" };
  }

  const result = await getPreviewDeploymentLogs(podId, options);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.logs };
}

/**
 * Delete a preview environment.
 *
 * This cleans up Kubernetes resources, GitHub comments, and database records.
 */
export async function deletePreviewEnvironment(
  podId: string,
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check authorization
  const hasAccess = await userHasAccessToPod(session.user.id, podId);
  if (!hasAccess) {
    return { success: false, error: "Access denied" };
  }

  // Note: We don't pass GitHub info here since we don't have it in this context.
  // The webhook handler will handle GitHub comment cleanup when PRs are closed.
  const result = await deletePreviewDeploymentOrchestrated({ podId });

  return result;
}

/**
 * List preview environments with resource usage metrics.
 *
 * Enhanced version that includes CPU/memory usage and age for operator dashboard.
 */
export async function getPreviewEnvironmentsWithMetrics(options?: {
  includeMetrics?: boolean;
  statusFilter?: Array<"pending" | "deploying" | "running" | "failed">;
}): Promise<ActionResult<PreviewPodWithMetrics[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await listActivePreviewPodsWithMetrics(session.user.id, {
    includeMetrics: options?.includeMetrics ?? true,
    statusFilter: options?.statusFilter,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.pods };
}

/**
 * Retry a failed deployment.
 *
 * Only works for pods in 'failed' status.
 */
export async function retryDeployment(podId: string): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check authorization
  const hasAccess = await userHasAccessToPod(session.user.id, podId);
  if (!hasAccess) {
    return { success: false, error: "Access denied" };
  }

  const result = await retryFailedDeployment(podId);

  return result;
}

/**
 * Get repositories accessible by the current user.
 *
 * Returns repos that the user has access to through team membership.
 */
export async function getUserRepositories(): Promise<
  ActionResult<SelectRepo[]>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Get user's teams
  const userTeams = await db
    .select({ teamId: teamsMemberships.teamId })
    .from(teamsMemberships)
    .where(eq(teamsMemberships.userId, session.user.id));

  const teamIds = userTeams.map((t) => t.teamId);

  if (teamIds.length === 0) {
    return { success: true, data: [] };
  }

  // Get repos for those teams
  const userRepos = await db
    .select()
    .from(repos)
    .where(inArray(repos.teamId, teamIds))
    .orderBy(repos.fullName);

  return { success: true, data: userRepos };
}

/**
 * Get the most recent image tag used for a repository.
 *
 * Returns the latest image tag from recent deployments to help users
 * populate the image URI field for manual preview environments.
 */
export async function getLatestImageForRepo(
  repoId: string,
): Promise<ActionResult<string | null>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the most recent pod for this repo
  const latestPod = await db
    .select({
      imageTag: pullRequestPods.imageTag,
    })
    .from(pullRequestPods)
    .innerJoin(pullRequests, eq(pullRequestPods.pullRequestId, pullRequests.id))
    .where(eq(pullRequests.repoId, repoId))
    .orderBy(desc(pullRequestPods.createdAt))
    .limit(1);

  if (latestPod.length === 0 || !latestPod[0].imageTag) {
    return { success: true, data: null };
  }

  return { success: true, data: latestPod[0].imageTag };
}

/**
 * Create a manual preview environment.
 *
 * Manual environments don't require a pull request and have a 24-hour TTL.
 * If no branch name is provided, a memorable auto-generated name is used.
 */
export async function createManualPreview(params: {
  repoId: string;
  imageUri: string;
  branchName?: string;
}): Promise<ActionResult<CreateManualPreviewResult>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await createManualPreviewEnvironment({
    repoId: params.repoId,
    imageUri: params.imageUri,
    userId: session.user.id,
    branchName: params.branchName,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to create preview environment",
    };
  }

  return { success: true, data: result };
}
