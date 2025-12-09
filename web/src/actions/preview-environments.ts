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
  userHasAccessToPod,
  getPreviewDeploymentStatusFull,
  getPreviewDeploymentLogs,
  deletePreviewDeploymentOrchestrated,
  type SelectPullRequestPod,
  type SelectPullRequest,
  type SelectRepo,
} from "@/models/preview-environments";

// Re-export types for frontend components
export type { SelectPullRequestPod, SelectPullRequest, SelectRepo };
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
