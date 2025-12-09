/**
 * Preview Environments Models Layer
 *
 * Business logic and database operations for PR preview environment management.
 * Orchestrates Kubernetes deployments, GitHub API calls, and database updates.
 */

import { db } from "@/db";
import {
  pullRequestPods,
  pullRequests,
  repos,
  teams,
  teamsMemberships,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type {
  PodStatus,
  PreviewEnvironmentConfig,
  ResourceAllocation,
} from "@/types/preview-environments";
import type { InferSelectModel } from "drizzle-orm";

// Type exports for use in actions layer
export type SelectPullRequestPod = InferSelectModel<typeof pullRequestPods>;
export type SelectPullRequest = InferSelectModel<typeof pullRequests>;
export type SelectRepo = InferSelectModel<typeof repos>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a DNS-safe Kubernetes namespace name from repo name and PR number.
 *
 * Namespace naming rules (DNS-1123):
 * - Must be at most 63 characters
 * - Must start with a lowercase letter
 * - Can only contain lowercase alphanumeric characters and hyphens
 * - Cannot end with a hyphen
 *
 * @param repoName - Repository name (can include owner, e.g., "owner/my-app")
 * @param prNumber - Pull request number
 * @returns DNS-safe namespace name (e.g., "pr-my-app-42")
 */
export function generateNamespace(repoName: string, prNumber: number): string {
  // Extract just the repo name if full name (owner/repo) is provided
  const name = repoName.includes("/")
    ? repoName.split("/").pop() || repoName
    : repoName;

  // Convert to lowercase and replace non-alphanumeric with hyphens
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens

  // Build namespace with pr- prefix
  const namespace = `pr-${sanitized}-${prNumber}`;

  // Ensure max 63 characters (DNS-1123 limit)
  if (namespace.length > 63) {
    // Truncate repo name to fit, keeping the pr-X-{number} suffix
    const suffix = `-${prNumber}`;
    const maxRepoLength = 63 - 3 - suffix.length; // "pr-" prefix + suffix
    const truncatedRepo = sanitized.slice(0, maxRepoLength).replace(/-$/, "");
    return `pr-${truncatedRepo}${suffix}`;
  }

  return namespace;
}

/**
 * Generate public URL for a preview environment.
 *
 * @param namespace - Kubernetes namespace name
 * @param domain - Base domain for preview environments (default: from env)
 * @returns Full HTTPS URL for the preview environment
 */
export function generatePublicUrl(namespace: string, domain?: string): string {
  const baseDomain =
    domain || process.env.PREVIEW_DOMAIN || "preview.localhost";
  return `https://${namespace}.${baseDomain}`;
}

/**
 * Generate image tag for a PR deployment.
 *
 * @param repoName - Repository name
 * @param prNumber - Pull request number
 * @param commitSha - Commit SHA (short version used)
 * @returns Image tag string
 */
export function generateImageTag(
  repoName: string,
  prNumber: number,
  commitSha: string,
): string {
  const shortSha = commitSha.slice(0, 7);
  return `pr-${prNumber}-${shortSha}`;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Create or retrieve a pull request pod record with idempotency.
 *
 * Uses unique constraint on (pullRequestId, commitSha) to prevent duplicates
 * when GitHub sends duplicate webhook events.
 *
 * @param params - Pod creation parameters
 * @returns Created or existing pod record
 */
export async function upsertPullRequestPod(params: {
  pullRequestId: string;
  commitSha: string;
  namespace: string;
  deploymentName: string;
  branch: string;
  imageTag?: string;
  publicUrl?: string;
}): Promise<{
  success: boolean;
  pod?: SelectPullRequestPod;
  isNew: boolean;
  error?: string;
}> {
  try {
    // Check for existing pod with same PR and commit (idempotency)
    const existing = await db
      .select()
      .from(pullRequestPods)
      .where(
        and(
          eq(pullRequestPods.pullRequestId, params.pullRequestId),
          eq(pullRequestPods.commitSha, params.commitSha),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: true, pod: existing[0], isNew: false };
    }

    // Create new pod record
    const [pod] = await db
      .insert(pullRequestPods)
      .values({
        pullRequestId: params.pullRequestId,
        commitSha: params.commitSha,
        namespace: params.namespace,
        deploymentName: params.deploymentName,
        branch: params.branch,
        imageTag: params.imageTag,
        publicUrl: params.publicUrl,
        status: "pending" as PodStatus,
      })
      .returning();

    return { success: true, pod, isNew: true };
  } catch (error) {
    // Handle unique constraint violation (race condition)
    if (error instanceof Error && error.message.includes("unique constraint")) {
      const existing = await db
        .select()
        .from(pullRequestPods)
        .where(
          and(
            eq(pullRequestPods.pullRequestId, params.pullRequestId),
            eq(pullRequestPods.commitSha, params.commitSha),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: true, pod: existing[0], isNew: false };
      }
    }

    console.error("Error upserting pull request pod:", error);
    return {
      success: false,
      isNew: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update pod status in database.
 *
 * @param podId - Pod ID
 * @param status - New status
 * @param options - Optional fields to update
 */
export async function updatePodStatus(
  podId: string,
  status: PodStatus,
  options?: {
    errorMessage?: string;
    publicUrl?: string;
    resourcesAllocated?: ResourceAllocation;
    lastDeployedAt?: Date;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(pullRequestPods)
      .set({
        status,
        updatedAt: new Date(),
        ...(options?.errorMessage !== undefined && {
          errorMessage: options.errorMessage,
        }),
        ...(options?.publicUrl && { publicUrl: options.publicUrl }),
        ...(options?.resourcesAllocated && {
          resourcesAllocated: options.resourcesAllocated,
        }),
        ...(options?.lastDeployedAt && {
          lastDeployedAt: options.lastDeployedAt,
        }),
      })
      .where(eq(pullRequestPods.id, podId));

    return { success: true };
  } catch (error) {
    console.error("Error updating pod status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a pod by ID with related PR and repo data.
 */
export async function getPodById(podId: string): Promise<{
  success: boolean;
  pod?: SelectPullRequestPod & {
    pullRequest: SelectPullRequest;
    repo: SelectRepo;
  };
  error?: string;
}> {
  try {
    const result = await db
      .select({
        pod: pullRequestPods,
        pullRequest: pullRequests,
        repo: repos,
      })
      .from(pullRequestPods)
      .innerJoin(
        pullRequests,
        eq(pullRequestPods.pullRequestId, pullRequests.id),
      )
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(eq(pullRequestPods.id, podId))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Pod not found" };
    }

    return {
      success: true,
      pod: {
        ...result[0].pod,
        pullRequest: result[0].pullRequest,
        repo: result[0].repo,
      },
    };
  } catch (error) {
    console.error("Error getting pod by ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all active preview pods for a user's accessible repos.
 *
 * @param userId - User ID to check team membership
 * @returns Array of active pods with related data
 */
export async function listActivePreviewPods(userId: string): Promise<{
  success: boolean;
  pods?: Array<
    SelectPullRequestPod & {
      pullRequest: SelectPullRequest;
      repo: SelectRepo;
    }
  >;
  error?: string;
}> {
  try {
    // Get user's team IDs
    const userTeams = await db
      .select({ teamId: teamsMemberships.teamId })
      .from(teamsMemberships)
      .where(eq(teamsMemberships.userId, userId));

    if (userTeams.length === 0) {
      return { success: true, pods: [] };
    }

    const teamIds = userTeams.map((t) => t.teamId);

    // Get repos in user's teams
    const teamRepos = await db
      .select({ id: repos.id })
      .from(repos)
      .where(inArray(repos.teamId, teamIds));

    if (teamRepos.length === 0) {
      return { success: true, pods: [] };
    }

    const repoIds = teamRepos.map((r) => r.id);

    // Get PRs for those repos
    const repoPRs = await db
      .select({ id: pullRequests.id })
      .from(pullRequests)
      .where(inArray(pullRequests.repoId, repoIds));

    if (repoPRs.length === 0) {
      return { success: true, pods: [] };
    }

    const prIds = repoPRs.map((pr) => pr.id);

    // Get active pods for those PRs
    const result = await db
      .select({
        pod: pullRequestPods,
        pullRequest: pullRequests,
        repo: repos,
      })
      .from(pullRequestPods)
      .innerJoin(
        pullRequests,
        eq(pullRequestPods.pullRequestId, pullRequests.id),
      )
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(
        and(
          inArray(pullRequestPods.pullRequestId, prIds),
          inArray(pullRequestPods.status, ["pending", "deploying", "running"]),
        ),
      );

    const pods = result.map((r) => ({
      ...r.pod,
      pullRequest: r.pullRequest,
      repo: r.repo,
    }));

    return { success: true, pods };
  } catch (error) {
    console.error("Error listing active preview pods:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user has access to a specific pod through team membership.
 */
export async function userHasAccessToPod(
  userId: string,
  podId: string,
): Promise<boolean> {
  try {
    const result = await db
      .select({ teamId: teams.id })
      .from(pullRequestPods)
      .innerJoin(
        pullRequests,
        eq(pullRequestPods.pullRequestId, pullRequests.id),
      )
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .innerJoin(teams, eq(repos.teamId, teams.id))
      .innerJoin(teamsMemberships, eq(teams.id, teamsMemberships.teamId))
      .where(
        and(eq(pullRequestPods.id, podId), eq(teamsMemberships.userId, userId)),
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("Error checking pod access:", error);
    return false;
  }
}

/**
 * Delete a pod record from the database.
 */
export async function deletePodRecord(
  podId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(pullRequestPods).where(eq(pullRequestPods.id, podId));

    return { success: true };
  } catch (error) {
    console.error("Error deleting pod record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Orchestration Functions
// ============================================================================

// Import lib functions for orchestration
import {
  deployPreviewApplication,
  watchDeploymentUntilReady,
  deletePreviewDeployment as deleteK8sDeployment,
  getPreviewDeploymentStatus,
  getPreviewPodLogs,
} from "@/lib/k8s-preview-deployment";
import {
  upsertDeploymentComment,
  deleteDeploymentComment,
} from "@/lib/github-pr-comments";

export interface CreatePreviewDeploymentParams {
  pullRequestId: string;
  prNumber: number;
  branch: string;
  commitSha: string;
  repoFullName: string;
  imageUri: string;
  installationId: number;
  owner: string;
  repoName: string;
}

export interface CreatePreviewDeploymentResult {
  success: boolean;
  podId?: string;
  publicUrl?: string;
  error?: string;
  isExisting?: boolean;
}

/**
 * Create a preview deployment for a pull request.
 *
 * Orchestrates:
 * 1. Database record creation (idempotent)
 * 2. GitHub PR comment (pending status)
 * 3. Kubernetes deployment creation
 * 4. Status updates as deployment progresses
 * 5. Final GitHub PR comment with URL
 *
 * @param params - Deployment parameters
 * @returns Deployment result
 */
export async function createPreviewDeployment(
  params: CreatePreviewDeploymentParams,
): Promise<CreatePreviewDeploymentResult> {
  const {
    pullRequestId,
    prNumber,
    branch,
    commitSha,
    repoFullName,
    imageUri,
    installationId,
    owner,
    repoName,
  } = params;

  // Generate identifiers
  const namespace = generateNamespace(repoFullName, prNumber);
  const deploymentName = `preview-${prNumber}`;
  const publicUrl = generatePublicUrl(namespace);
  const imageTag = generateImageTag(repoFullName, prNumber, commitSha);

  // Step 1: Create database record (idempotent)
  const podResult = await upsertPullRequestPod({
    pullRequestId,
    commitSha,
    namespace,
    deploymentName,
    branch,
    imageTag,
    publicUrl,
  });

  if (!podResult.success || !podResult.pod) {
    return {
      success: false,
      error: podResult.error || "Failed to create pod record",
    };
  }

  // If pod already exists (duplicate webhook), return early
  if (!podResult.isNew) {
    return {
      success: true,
      podId: podResult.pod.id,
      publicUrl: podResult.pod.publicUrl || undefined,
      isExisting: true,
    };
  }

  const podId = podResult.pod.id;

  // Step 2: Post initial GitHub comment (pending status)
  await upsertDeploymentComment({
    installationId,
    owner,
    repo: repoName,
    prNumber,
    status: "pending",
    commitSha,
    namespace,
  });

  // Step 3: Update status to deploying
  await updatePodStatus(podId, "deploying");
  await upsertDeploymentComment({
    installationId,
    owner,
    repo: repoName,
    prNumber,
    status: "deploying",
    commitSha,
    namespace,
  });

  // Step 4: Deploy to Kubernetes
  const deployResult = await deployPreviewApplication({
    namespace,
    deploymentName,
    imageUri,
    prNumber,
    commitSha,
  });

  if (!deployResult.success) {
    // Deployment failed - update status and comment
    await updatePodStatus(podId, "failed", {
      errorMessage: deployResult.error,
    });
    await upsertDeploymentComment({
      installationId,
      owner,
      repo: repoName,
      prNumber,
      status: "failed",
      commitSha,
      namespace,
      errorMessage: deployResult.error,
    });
    return { success: false, podId, error: deployResult.error };
  }

  // Step 5: Wait for deployment to be ready
  const watchResult = await watchDeploymentUntilReady(
    namespace,
    deploymentName,
  );

  if (!watchResult.ready) {
    // Deployment didn't become ready
    await updatePodStatus(podId, "failed", { errorMessage: watchResult.error });
    await upsertDeploymentComment({
      installationId,
      owner,
      repo: repoName,
      prNumber,
      status: "failed",
      commitSha,
      namespace,
      errorMessage: watchResult.error,
    });
    return { success: false, podId, error: watchResult.error };
  }

  // Step 6: Success - update database and post final comment
  await updatePodStatus(podId, "running", {
    publicUrl,
    lastDeployedAt: new Date(),
    resourcesAllocated: { cpu: "500m", memory: "512Mi", pods: 1 },
  });

  await upsertDeploymentComment({
    installationId,
    owner,
    repo: repoName,
    prNumber,
    status: "running",
    publicUrl,
    commitSha,
    namespace,
  });

  return { success: true, podId, publicUrl };
}

export interface DeletePreviewDeploymentParams {
  podId: string;
  installationId?: number;
  owner?: string;
  repoName?: string;
  prNumber?: number;
  commitSha?: string;
}

/**
 * Delete a preview deployment and clean up resources.
 *
 * Orchestrates:
 * 1. Database status update (deleting)
 * 2. Kubernetes resource deletion
 * 3. GitHub comment update/deletion
 * 4. Database record deletion
 *
 * @param params - Deletion parameters
 * @returns Deletion result
 */
export async function deletePreviewDeploymentOrchestrated(
  params: DeletePreviewDeploymentParams,
): Promise<{ success: boolean; error?: string }> {
  const { podId, installationId, owner, repoName, prNumber, commitSha } =
    params;

  // Get pod details
  const podResult = await getPodById(podId);
  if (!podResult.success || !podResult.pod) {
    return { success: false, error: podResult.error || "Pod not found" };
  }

  const pod = podResult.pod;

  // Step 1: Update status to deleting
  await updatePodStatus(podId, "deleting");

  // Step 2: Update GitHub comment if we have the necessary info
  if (installationId && owner && repoName && prNumber && commitSha) {
    await upsertDeploymentComment({
      installationId,
      owner,
      repo: repoName,
      prNumber,
      status: "deleting",
      commitSha,
      namespace: pod.namespace,
    });
  }

  // Step 3: Delete Kubernetes resources
  const deleteResult = await deleteK8sDeployment(
    pod.namespace,
    pod.deploymentName,
  );

  if (!deleteResult.success) {
    console.warn("Failed to delete K8s resources:", deleteResult.error);
    // Continue with cleanup even if K8s deletion fails
  }

  // Step 4: Delete GitHub comment if we have the necessary info
  if (installationId && owner && repoName && prNumber) {
    await deleteDeploymentComment(installationId, owner, repoName, prNumber);
  }

  // Step 5: Delete database record
  const dbResult = await deletePodRecord(podId);

  return dbResult;
}

/**
 * Get detailed status of a preview deployment.
 *
 * Combines database state with live Kubernetes status.
 *
 * @param podId - Pod ID
 * @returns Combined status information
 */
export async function getPreviewDeploymentStatusFull(podId: string): Promise<{
  success: boolean;
  status?: {
    dbStatus: PodStatus;
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
  };
  error?: string;
}> {
  // Get pod from database
  const podResult = await getPodById(podId);
  if (!podResult.success || !podResult.pod) {
    return { success: false, error: podResult.error || "Pod not found" };
  }

  const pod = podResult.pod;

  // Get live K8s status
  const k8sStatus = await getPreviewDeploymentStatus(
    pod.namespace,
    pod.deploymentName,
  );

  return {
    success: true,
    status: {
      dbStatus: pod.status as PodStatus,
      k8sStatus: {
        ready: k8sStatus.ready,
        status: k8sStatus.status,
        replicas: k8sStatus.replicas,
        readyReplicas: k8sStatus.readyReplicas,
        error: k8sStatus.error,
      },
      publicUrl: pod.publicUrl || undefined,
      namespace: pod.namespace,
      deploymentName: pod.deploymentName,
      branch: pod.branch,
      commitSha: pod.commitSha,
      createdAt: pod.createdAt,
      updatedAt: pod.updatedAt,
    },
  };
}

/**
 * Get logs from a preview deployment.
 *
 * @param podId - Pod ID
 * @param options - Log options
 * @returns Log content
 */
export async function getPreviewDeploymentLogs(
  podId: string,
  options?: { tailLines?: number; timestamps?: boolean },
): Promise<{ success: boolean; logs?: string; error?: string }> {
  // Get pod from database
  const podResult = await getPodById(podId);
  if (!podResult.success || !podResult.pod) {
    return { success: false, error: podResult.error || "Pod not found" };
  }

  const pod = podResult.pod;
  const pr = pod.pullRequest;

  // Get logs from K8s
  return getPreviewPodLogs(pod.namespace, pr.number, options);
}
