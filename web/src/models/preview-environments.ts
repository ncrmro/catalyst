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
  projects,
  projectsRepos,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type {
  PodStatus,
  ResourceAllocation,
} from "@/types/preview-environments";
import type { InferSelectModel } from "drizzle-orm";
import { nameGenerator } from "@/lib/name-generator";

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
 * Ingress configuration for a preview environment.
 * All fields are optional - defaults come from environment variables.
 */
export interface PreviewIngressConfig {
  /** Custom domain for preview URLs (e.g., "preview.mycompany.com") */
  domain?: string;
  /** TLS cluster issuer for cert-manager (e.g., "letsencrypt-prod") */
  tlsClusterIssuer?: string;
  /** Ingress class name (e.g., "nginx", "traefik") */
  ingressClassName?: string;
}

/**
 * Get ingress configuration with priority: project settings > environment variables > defaults.
 *
 * @param projectConfig - Optional project-level configuration
 * @returns Resolved ingress configuration
 */
export function resolveIngressConfig(projectConfig?: {
  customDomain?: string | null;
  tlsClusterIssuer?: string | null;
  ingressClassName?: string | null;
}): PreviewIngressConfig {
  return {
    domain:
      projectConfig?.customDomain ||
      process.env.PREVIEW_DOMAIN ||
      "preview.localhost",
    tlsClusterIssuer:
      projectConfig?.tlsClusterIssuer ||
      process.env.PREVIEW_TLS_CLUSTER_ISSUER ||
      "letsencrypt-prod",
    ingressClassName:
      projectConfig?.ingressClassName ||
      process.env.PREVIEW_INGRESS_CLASS ||
      "nginx",
  };
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

    // Cancel any pending/deploying pods for this PR (T040: cancellation logic)
    // This ensures only one active deployment per PR
    await db
      .update(pullRequestPods)
      .set({
        status: "failed" as PodStatus,
        errorMessage: "Superseded by newer commit",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pullRequestPods.pullRequestId, params.pullRequestId),
          inArray(pullRequestPods.status, [
            "pending",
            "deploying",
          ] as PodStatus[]),
        ),
      );

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

// ============================================================================
// Resource Usage and Age Calculation (T050, T051, T052)
// ============================================================================

// Re-export PodResourceUsage type for actions layer
export type { PodResourceUsage };

// Import resource quota limits from types (used in models layer)
import { RESOURCE_QUOTA_LIMITS } from "@/types/preview-environments";

/**
 * Extended pod info with resource usage and age information.
 */
export interface PreviewPodWithMetrics {
  pod: SelectPullRequestPod;
  pullRequest: SelectPullRequest;
  repo: SelectRepo;
  resourceUsage?: PodResourceUsage;
  ageDays: number;
  isExceedingQuota: boolean;
}

/**
 * Calculate age in days from a date.
 *
 * @param createdAt - Creation timestamp
 * @returns Number of days since creation
 */
export function calculateAgeDays(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if resource usage exceeds quota limits.
 *
 * @param usage - Pod resource usage
 * @returns true if any resource exceeds limits
 */
export function isExceedingResourceQuota(usage?: PodResourceUsage): boolean {
  if (!usage) return false;

  return (
    usage.cpuMillicores > RESOURCE_QUOTA_LIMITS.cpuMillicores ||
    usage.memoryMiB > RESOURCE_QUOTA_LIMITS.memoryMiB
  );
}

/**
 * List active preview pods with resource usage metrics for a user.
 *
 * This enhanced version fetches CPU/memory metrics from Kubernetes
 * and calculates age for each pod.
 *
 * @param userId - User ID to check team membership
 * @param options - Query options
 * @returns Array of pods with metrics
 */
export async function listActivePreviewPodsWithMetrics(
  userId: string,
  options?: {
    includeMetrics?: boolean;
    statusFilter?: PodStatus[];
  },
): Promise<{
  success: boolean;
  pods?: PreviewPodWithMetrics[];
  error?: string;
}> {
  // First get basic pod list
  const basicResult = await listActivePreviewPods(userId);

  if (!basicResult.success || !basicResult.pods) {
    return { success: false, error: basicResult.error };
  }

  const pods = basicResult.pods;

  // Apply status filter if provided
  const filteredPods = options?.statusFilter
    ? pods.filter((p) => options.statusFilter!.includes(p.status as PodStatus))
    : pods;

  // Fetch resource metrics for each pod (in parallel)
  const podsWithMetrics: PreviewPodWithMetrics[] = await Promise.all(
    filteredPods.map(async (podData) => {
      let resourceUsage: PodResourceUsage | undefined;

      // Only fetch metrics if requested and pod is running
      if (options?.includeMetrics && podData.status === "running") {
        const metricsResult = await getPreviewPodResourceUsage(
          podData.namespace,
          podData.pullRequest.number,
        );
        if (metricsResult.success && metricsResult.usage) {
          resourceUsage = metricsResult.usage;
        }
      }

      const ageDays = calculateAgeDays(podData.createdAt);
      const isExceedingQuota = isExceedingResourceQuota(resourceUsage);

      return {
        pod: podData,
        pullRequest: podData.pullRequest,
        repo: podData.repo,
        resourceUsage,
        ageDays,
        isExceedingQuota,
      };
    }),
  );

  return { success: true, pods: podsWithMetrics };
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

import {
  createEnvironmentCR,
  deleteEnvironmentCR,
  getEnvironmentCR,
} from "@/lib/k8s-operator";
import {
  deployPreviewApplication,
  watchDeploymentUntilReady,
  getPreviewPodLogs,
  getPreviewPodResourceUsage,
  type PodResourceUsage,
} from "@/lib/k8s-preview-deployment";
import {
  upsertDeploymentComment,
  deleteDeploymentComment,
} from "@/lib/vcs-providers";
import {
  previewLogger,
  logPreviewLifecycleEvent,
  startTimer,
} from "@/lib/logging";

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
  /** Optional build job name to wait for before deploying */
  buildJobName?: string;
  /** Optional build job namespace (defaults to deployment namespace) */
  buildJobNamespace?: string;
  /** Use Helm chart deployment instead of direct K8s API (default: false) */
  useHelmDeployment?: boolean;
}

export interface CreatePreviewDeploymentResult {
  success: boolean;
  podId?: string;
  publicUrl?: string;
  error?: string;
  isExisting?: boolean;
}

/**
 * Look up project configuration for a repository.
 * Returns the project's ingress settings if found.
 */
async function getProjectConfigForRepo(repoFullName: string): Promise<{
  customDomain?: string | null;
  tlsClusterIssuer?: string | null;
  ingressClassName?: string | null;
} | null> {
  try {
    // Find repo by full name
    const repo = await db.query.repos.findFirst({
      where: eq(repos.fullName, repoFullName),
    });

    if (!repo) return null;

    // Find project connected to this repo
    const projectRepo = await db.query.projectsRepos.findFirst({
      where: eq(projectsRepos.repoId, repo.id),
      with: {
        project: true,
      },
    });

    if (!projectRepo?.project) return null;

    return {
      customDomain: projectRepo.project.customDomain,
      tlsClusterIssuer: projectRepo.project.tlsClusterIssuer,
      ingressClassName: projectRepo.project.ingressClassName,
    };
  } catch (error) {
    previewLogger.warn("Failed to fetch project config for repo", {
      repoFullName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Create a preview deployment for a pull request.
 *
 * Orchestrates:
 * 1. Database record creation (idempotent)
 * 2. GitHub PR comment (pending status)
 * 3. Kubernetes Environment CR creation (declarative)
 * 4. Status updates as deployment progresses (via operator)
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
    installationId,
    owner,
    repoName,
  } = params;

  // Generate identifiers
  // CR Name: preview-<prNumber>
  const crName = `preview-${prNumber}`;
  // Target Namespace (managed by operator): env-preview-<prNumber>
  const targetNamespace = `env-${crName}`;
  // CR Namespace: default (control plane)
  const crNamespace = "default";

  // Look up project-level ingress configuration
  const projectConfig = await getProjectConfigForRepo(repoFullName);
  const ingressConfig = resolveIngressConfig(projectConfig ?? undefined);

  // Generate public URL using resolved domain
  const publicUrl = generatePublicUrl(targetNamespace, ingressConfig.domain);
  const imageTag = generateImageTag(repoFullName, prNumber, commitSha);

  // Start deployment timer for performance tracking
  void startTimer("preview-deployment-creation");

  // Log deployment initiation
  logPreviewLifecycleEvent("deployment-initiated", {
    phase: "created",
    namespace: targetNamespace,
    prNumber,
    commitSha,
    branch,
    repoFullName,
    ingressDomain: ingressConfig.domain,
  });

  // Step 1: Create database record (idempotent)
  const podResult = await upsertPullRequestPod({
    pullRequestId,
    commitSha,
    namespace: targetNamespace,
    deploymentName: crName,
    branch,
    imageTag,
    publicUrl,
  });

  if (!podResult.success || !podResult.pod) {
    previewLogger.error("Failed to create pod record", {
      prNumber,
      commitSha,
      namespace: targetNamespace,
      error: podResult.error,
    });
    return {
      success: false,
      error: podResult.error || "Failed to create pod record",
    };
  }

  const podId = podResult.pod.id;

  // If pod already exists (duplicate webhook), return early
  if (!podResult.isNew) {
    logPreviewLifecycleEvent("deployment-duplicate-detected", {
      podId,
      namespace: targetNamespace,
      prNumber,
      commitSha,
      status: podResult.pod.status,
    });
    return {
      success: true,
      podId: podResult.pod.id,
      publicUrl: podResult.pod.publicUrl || undefined,
      isExisting: true,
    };
  }

  logPreviewLifecycleEvent("pod-record-created", {
    podId,
    namespace: targetNamespace,
    prNumber,
    commitSha,
    phase: "created",
  });

  // Step 2: Post initial GitHub comment (pending status)
  await upsertDeploymentComment({
    installationId,
    owner,
    repo: repoName,
    prNumber,
    status: "pending",
    commitSha,
    namespace: targetNamespace,
  });

  // Step 3: Create Environment CR with ingress configuration
  await updatePodStatus(podId, "deploying");

  logPreviewLifecycleEvent("k8s-cr-creation-started", {
    podId,
    namespace: crNamespace,
    prNumber,
    commitSha,
  });

  const crResult = await createEnvironmentCR(crNamespace, crName, {
    projectRef: { name: repoName }, // Assuming Project CR named after repo or we need to map it
    type: "development",
    source: {
      commitSha,
      branch,
      prNumber,
    },
    config: {
      envVars: [], // Add any default env vars
    },
    // Pass ingress configuration to the operator
    ingress: {
      domain: ingressConfig.domain,
      tlsClusterIssuer: ingressConfig.tlsClusterIssuer,
      ingressClassName: ingressConfig.ingressClassName,
    },
  });

  if (!crResult.success) {
    const errorMsg = crResult.error || "Failed to create Environment CR";
    await updatePodStatus(podId, "failed", { errorMessage: errorMsg });
    return { success: false, podId, error: errorMsg };
  }

  // Operator will handle the rest (Building -> Ready)
  // We can return early or optionally wait/poll status here if we want synchronous behavior
  // For MVP, we return "success" that the *request* was submitted.
  // The UI will poll the DB/K8s for status updates.

  // Note: We are skipping the explicit wait here as the Operator is async.
  // The Frontend should poll.

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

  const deleteTimer = startTimer("preview-deployment-deletion");

  // Get pod details
  const podResult = await getPodById(podId);
  if (!podResult.success || !podResult.pod) {
    previewLogger.error("Failed to get pod for deletion", {
      podId,
      error: podResult.error,
    });
    return { success: false, error: podResult.error || "Pod not found" };
  }

  const pod = podResult.pod;

  logPreviewLifecycleEvent("deletion-started", {
    podId,
    namespace: pod.namespace,
    prNumber: pod.pullRequest.number,
    commitSha: pod.commitSha,
    phase: "deleted",
  });

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

  // Step 3: Delete Kubernetes resources (Environment CR)
  // CR Name: preview-<prNumber>
  const crName = pod.deploymentName;
  const crNamespace = "default";

  const deleteResult = await deleteEnvironmentCR(crNamespace, crName);

  if (!deleteResult.success) {
    previewLogger.warn("Failed to delete Environment CR", {
      podId,
      error: deleteResult.error,
    });
    // Continue with cleanup even if K8s deletion fails
  } else {
    logPreviewLifecycleEvent("k8s-resources-deleted", {
      podId,
      namespace: pod.namespace,
      prNumber: pod.pullRequest.number,
    });
  }

  // Step 4: Delete GitHub comment if we have the necessary info
  if (installationId && owner && repoName && prNumber) {
    await deleteDeploymentComment(installationId, owner, repoName, prNumber);
  }

  // Step 5: Delete database record
  const dbResult = await deletePodRecord(podId);

  if (dbResult.success) {
    const duration = deleteTimer.end({ podId, namespace: pod.namespace });
    logPreviewLifecycleEvent("deletion-completed", {
      podId,
      namespace: pod.namespace,
      prNumber: pod.pullRequest.number,
      commitSha: pod.commitSha,
      phase: "deleted",
      duration,
    });
  } else {
    previewLogger.error("Failed to delete pod record", {
      podId,
      namespace: pod.namespace,
      error: dbResult.error,
    });
  }

  return dbResult;
}

/**
 * Get detailed status of a preview deployment.
 *
 * Combines database state with live Kubernetes Environment CR status.
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

  // Get live CR status
  // Namespace for CR is "default" (as per creation)
  // Name is pod.deploymentName (which is "preview-123")
  const crName = pod.deploymentName;
  const crNamespace = "default";

  try {
    const cr = await getEnvironmentCR(crNamespace, crName);

    // Map CR status to UI status
    const phase = cr?.status?.phase || "Unknown";
    const isReady = phase === "Ready";
    const url = cr?.status?.url;

    // If Ready, sync DB if needed (optional optimization)
    if (isReady && pod.status !== "running") {
      // We could trigger DB update here
      await updatePodStatus(pod.id, "running", { publicUrl: url });
    }

    return {
      success: true,
      status: {
        dbStatus: pod.status as PodStatus,
        k8sStatus: {
          ready: isReady,
          status: phase,
          replicas: 1, // Placeholder
          readyReplicas: isReady ? 1 : 0,
          error: undefined, // Could extract from conditions
        },
        publicUrl: url || pod.publicUrl || undefined,
        namespace: pod.namespace,
        deploymentName: pod.deploymentName,
        branch: pod.branch,
        commitSha: pod.commitSha,
        createdAt: pod.createdAt,
        updatedAt: pod.updatedAt,
      },
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return {
      success: true, // Return partial success if CR fetch fails
      status: {
        dbStatus: pod.status as PodStatus,
        namespace: pod.namespace,
        deploymentName: pod.deploymentName,
        branch: pod.branch,
        commitSha: pod.commitSha,
        createdAt: pod.createdAt,
        updatedAt: pod.updatedAt,
        k8sStatus: {
          ready: false,
          status: "Error fetching CR",
          error: errorMessage,
        },
      },
    };
  }
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

/**
 * Retry a failed deployment.
 *
 * Resets the pod status to pending and triggers a new deployment attempt.
 * Only works for pods in 'failed' status.
 *
 * @param podId - Pod ID to retry
 * @returns Retry result
 */
export async function retryFailedDeployment(podId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const retryTimer = startTimer("deployment-retry");

  // Get pod from database
  const podResult = await getPodById(podId);
  if (!podResult.success || !podResult.pod) {
    previewLogger.error("Failed to get pod for retry", {
      podId,
      error: podResult.error,
    });
    return { success: false, error: podResult.error || "Pod not found" };
  }

  const pod = podResult.pod;

  // Only allow retry for failed pods
  if (pod.status !== "failed") {
    previewLogger.warn("Retry attempted on non-failed pod", {
      podId,
      namespace: pod.namespace,
      currentStatus: pod.status,
    });
    return {
      success: false,
      error: `Cannot retry pod in '${pod.status}' status. Only failed pods can be retried.`,
    };
  }

  logPreviewLifecycleEvent("retry-started", {
    podId,
    namespace: pod.namespace,
    prNumber: pod.pullRequest.number,
    commitSha: pod.commitSha,
    phase: "retrying",
  });

  // Reset status to pending and clear error
  const updateResult = await updatePodStatus(podId, "pending", {
    errorMessage: undefined,
  });

  if (!updateResult.success) {
    return { success: false, error: updateResult.error };
  }

  // Trigger new deployment attempt
  // Note: In a full implementation, this would trigger the actual deployment
  // For now, we just update the status - the webhook handler or a background job
  // would pick this up and process it
  const deployResult = await deployPreviewApplication({
    namespace: pod.namespace,
    deploymentName: pod.deploymentName,
    imageUri: `${pod.imageTag}`, // This would need full image URI in production
    prNumber: pod.pullRequest.number,
    commitSha: pod.commitSha,
  });

  if (!deployResult.success) {
    const duration = retryTimer.end({ podId, namespace: pod.namespace });
    logPreviewLifecycleEvent("retry-failed", {
      podId,
      namespace: pod.namespace,
      prNumber: pod.pullRequest.number,
      commitSha: pod.commitSha,
      phase: "failed",
      errorMessage: deployResult.error,
      duration,
    });

    await updatePodStatus(podId, "failed", {
      errorMessage: deployResult.error,
    });
    return { success: false, error: deployResult.error };
  }

  // Watch deployment status
  const watchResult = await watchDeploymentUntilReady(
    pod.namespace,
    pod.deploymentName,
    180000, // 3 minute timeout
  );

  if (!watchResult.ready) {
    const duration = retryTimer.end({ podId, namespace: pod.namespace });
    logPreviewLifecycleEvent("retry-watch-failed", {
      podId,
      namespace: pod.namespace,
      prNumber: pod.pullRequest.number,
      commitSha: pod.commitSha,
      phase: "failed",
      errorMessage: watchResult.error,
      duration,
    });

    await updatePodStatus(podId, "failed", {
      errorMessage: watchResult.error,
    });
    return { success: false, error: watchResult.error };
  }

  // Update to running
  await updatePodStatus(podId, "running", {
    lastDeployedAt: new Date(),
  });

  const duration = retryTimer.end({ podId, namespace: pod.namespace });
  logPreviewLifecycleEvent("retry-completed", {
    podId,
    namespace: pod.namespace,
    prNumber: pod.pullRequest.number,
    commitSha: pod.commitSha,
    phase: "running",
    duration,
  });

  return { success: true };
}

// ============================================================================
// Manual Preview Environment Creation
// ============================================================================

export interface CreateManualPreviewParams {
  repoId: string;
  imageUri: string;
  userId: string;
  branchName?: string;
  onProgress?: (message: string) => void;
}

export interface CreateManualPreviewResult {
  success: boolean;
  podId?: string;
  namespace?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Create a manual preview environment.
 *
 * Unlike PR-based previews, manual environments:
 * - Don't require a pull request
 * - Have a 24-hour TTL
 * - Use memorable auto-generated names (if no branch specified)
 * - Are tracked by the creating user
 *
 * @param params - Parameters for manual preview creation
 * @returns Result with pod ID, namespace, and public URL
 */
export async function createManualPreviewEnvironment(
  params: CreateManualPreviewParams,
): Promise<CreateManualPreviewResult> {
  const { repoId, imageUri, userId, branchName, onProgress } = params;

  const reportProgress = (msg: string) => {
    if (onProgress) onProgress(msg);
  };

  const deploymentTimer = startTimer("manual-preview-deployment-creation");

  // Step 1: Get repo information
  reportProgress("Validating repository...");
  const repo = await db.query.repos.findFirst({
    where: eq(repos.id, repoId),
  });

  if (!repo) {
    previewLogger.error("Repo not found for manual preview", {
      repoId,
      userId,
    });
    return {
      success: false,
      error: "Repository not found",
    };
  }

  // Step 2: Generate namespace name
  reportProgress("Generating namespace...");
  let namespace: string;

  if (branchName) {
    // Use branch name if provided (sanitize for DNS-1123)
    const sanitized = branchName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    namespace = `manual-${sanitized}`.slice(0, 63);
  } else {
    // Auto-generate memorable name
    const checkExists = async (name: string) => {
      const existing = await db
        .select()
        .from(pullRequestPods)
        .where(eq(pullRequestPods.namespace, name))
        .limit(1);

      return existing.length > 0;
    };

    const result = await nameGenerator.generateUnique(checkExists);
    namespace = result.name;

    if (result.retries > 0) {
      previewLogger.info("Generated unique namespace after retries", {
        namespace,
        retries: result.retries,
        userId,
        repoId,
      });
    }
  }

  const deploymentName = `preview-${namespace}`;
  const publicUrl = generatePublicUrl(namespace);

  // Calculate expiration (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  logPreviewLifecycleEvent("manual-deployment-initiated", {
    phase: "created",
    namespace,
    branch: branchName || "auto-generated",
    repoFullName: repo.fullName,
    userId,
  });

  // Step 3: Create database record
  reportProgress("Creating database record...");
  try {
    const [pod] = await db
      .insert(pullRequestPods)
      .values({
        pullRequestId: null, // Manual environments don't have PRs
        namespace,
        deploymentName,
        branch: branchName || "main",
        commitSha: "manual-deployment",
        imageTag: imageUri.split(":")[1] || "latest",
        status: "pending",
        publicUrl,
        source: "manual",
        createdBy: userId,
        expiresAt,
      })
      .returning();

    logPreviewLifecycleEvent("manual-pod-record-created", {
      podId: pod.id,
      namespace,
      phase: "created",
      expiresAt: expiresAt.toISOString(),
      userId,
    });

    // Step 4: Update status to deploying
    await updatePodStatus(pod.id, "deploying");

    logPreviewLifecycleEvent("manual-deployment-started", {
      podId: pod.id,
      namespace,
      phase: "deploying",
    });

    // Step 5: Deploy to Kubernetes
    reportProgress("Deploying to Kubernetes...");
    const { deployPreviewApplication } =
      await import("@/lib/k8s-preview-deployment");
    const deployResult = await deployPreviewApplication({
      namespace,
      deploymentName,
      imageUri,
      prNumber: 0, // Manual environments don't have PR numbers
      commitSha: "manual",
    });

    if (!deployResult.success) {
      const errorMsg = deployResult.error || "Kubernetes deployment failed";
      const duration = deploymentTimer.end({
        podId: pod.id,
        namespace,
        status: "failed",
      });

      logPreviewLifecycleEvent("manual-deployment-failed", {
        podId: pod.id,
        namespace,
        phase: "failed",
        errorMessage: errorMsg,
        duration,
      });

      await updatePodStatus(pod.id, "failed", { errorMessage: errorMsg });

      return {
        success: false,
        error: errorMsg,
      };
    }

    logPreviewLifecycleEvent("manual-k8s-deployment-created", {
      podId: pod.id,
      namespace,
      phase: "deploying",
    });

    // Step 6: Wait for deployment to be ready
    reportProgress("Waiting for deployment to be ready...");
    const { watchDeploymentUntilReady } =
      await import("@/lib/k8s-preview-deployment");
    const watchResult = await watchDeploymentUntilReady(
      namespace,
      deploymentName,
      180000, // Timeout
      reportProgress, // Pass progress callback
    );

    if (!watchResult.ready) {
      const errorMsg =
        watchResult.error || `Deployment not ready: ${watchResult.status}`;
      const duration = deploymentTimer.end({
        podId: pod.id,
        namespace,
        status: "failed",
      });

      logPreviewLifecycleEvent("manual-deployment-watch-failed", {
        podId: pod.id,
        namespace,
        phase: "failed",
        errorMessage: errorMsg,
        duration,
      });

      await updatePodStatus(pod.id, "failed", { errorMessage: errorMsg });

      return {
        success: false,
        error: errorMsg,
      };
    }

    // Step 7: Update to running
    reportProgress("Finalizing setup...");
    await updatePodStatus(pod.id, "running", {
      lastDeployedAt: new Date(),
    });

    const duration = deploymentTimer.end({
      podId: pod.id,
      namespace,
      status: "running",
    });

    logPreviewLifecycleEvent("manual-deployment-completed", {
      podId: pod.id,
      namespace,
      phase: "running",
      publicUrl,
      duration,
      expiresAt: expiresAt.toISOString(),
    });

    reportProgress("Done!");
    return {
      success: true,
      podId: pod.id,
      namespace,
      publicUrl,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown database error";

    previewLogger.error("Failed to create manual preview environment", {
      namespace,
      userId,
      repoId,
      error: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}
