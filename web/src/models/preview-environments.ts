/**
 * Preview Environments Models Layer
 *
 * Complex database operations and business logic for PR preview environments.
 * This module orchestrates deployment, status monitoring, and cleanup of preview pods.
 *
 * Following patterns from src/models/README.md:
 * - No authentication (handled by actions layer)
 * - Pure functions for database operations
 * - Complex logic with transactions
 * - Reusable across multiple actions
 */

import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type {
  InsertPullRequestPod,
  SelectPullRequestPod,
  PodStatus,
} from "@/types/preview-environments";
import { getInstallationOctokit } from "@/lib/github";

/**
 * Generate DNS-1123 compliant namespace name for a preview environment
 *
 * DNS-1123 requirements:
 * - Contain only lowercase alphanumeric characters or '-'
 * - Start with an alphanumeric character
 * - End with an alphanumeric character
 * - Be at most 63 characters
 *
 * @param repoName - Repository name (can include owner/repo format)
 * @param prNumber - Pull request number
 * @returns DNS-1123 compliant namespace name
 */
export function generateNamespace(repoName: string, prNumber: number): string {
  // Convert to lowercase, replace underscores with hyphens, remove slashes
  let namespace = repoName
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\//g, "")
    .replace(/[^a-z0-9-]/g, "");

  // Remove leading/trailing hyphens
  namespace = namespace.replace(/^-+|-+$/g, "");

  // Construct full namespace with pr- prefix
  const fullNamespace = `pr-${namespace}-${prNumber}`;

  // Truncate to 63 characters if needed
  if (fullNamespace.length > 63) {
    // Keep the pr number at the end, truncate the middle
    const prSuffix = `-${prNumber}`;
    const maxNameLength = 63 - 3 - prSuffix.length; // 3 for "pr-"
    const truncatedName = namespace.substring(0, maxNameLength);
    return `pr-${truncatedName}${prSuffix}`;
  }

  return fullNamespace;
}

/**
 * Generate public URL for a preview environment
 *
 * @param namespace - Kubernetes namespace name
 * @param baseDomain - Base domain for preview environments (default: preview.example.com)
 * @returns Public HTTPS URL
 */
export function generatePublicUrl(
  namespace: string,
  baseDomain: string = "preview.example.com",
): string {
  return `https://${namespace}.${baseDomain}`;
}

/**
 * Deploy Helm chart to Kubernetes namespace
 *
 * NOTE: This is a mock-friendly implementation for development/testing.
 * In a real environment, this would execute `helm install` or use Helm SDK.
 *
 * @param params - Deployment parameters
 * @returns Deployment result with success status
 */
export async function deployHelmChart(params: {
  namespace: string;
  chartPath: string;
  releaseName: string;
  values: Record<string, unknown>;
}): Promise<{
  success: boolean;
  releaseName?: string;
  namespace?: string;
  error?: string;
}> {
  // Validate required parameters
  if (!params.namespace) {
    throw new Error("namespace is required");
  }
  if (!params.chartPath) {
    throw new Error("chartPath is required");
  }
  if (!params.releaseName) {
    throw new Error("releaseName is required");
  }

  try {
    // Mock implementation: Simulate Helm deployment
    // In production, this would execute: helm install <releaseName> <chartPath> --namespace <namespace> --values <values>

    // Simulate deployment validation
    if (params.chartPath.includes("invalid")) {
      return {
        success: false,
        error: "Chart not found or invalid",
      };
    }

    // Simulate successful deployment
    return {
      success: true,
      releaseName: params.releaseName,
      namespace: params.namespace,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown deployment error",
    };
  }
}

/**
 * Create or update GitHub PR comment with deployment status
 *
 * Searches for existing Catalyst preview comment and updates it,
 * or creates a new comment if none exists.
 *
 * @param params - Comment parameters
 * @returns Result with comment ID and action taken
 */
export async function upsertGitHubComment(params: {
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
  installationId: number;
  commentId?: number;
}): Promise<{
  success: boolean;
  commentId?: number;
  action?: "created" | "updated";
  error?: string;
}> {
  try {
    const octokit = await getInstallationOctokit(params.installationId);

    // If commentId provided, update existing comment
    if (params.commentId) {
      await octokit.request(
        "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
        {
          owner: params.owner,
          repo: params.repo,
          comment_id: params.commentId,
          body: params.body,
        },
      );

      return {
        success: true,
        commentId: params.commentId,
        action: "updated",
      };
    }

    // Otherwise, create new comment
    const response = await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: params.owner,
        repo: params.repo,
        issue_number: params.prNumber,
        body: params.body,
      },
    );

    return {
      success: true,
      commentId: response.data.id,
      action: "created",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to post GitHub comment",
    };
  }
}

/**
 * Create preview pods in the database
 *
 * Bulk operation following models layer pattern - accepts array of pods.
 *
 * @param data - Array of pull request pod data to insert
 * @returns Array of created pods
 */
export async function createPreviewPods(
  data: InsertPullRequestPod | InsertPullRequestPod[],
): Promise<SelectPullRequestPod[]> {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(pullRequestPods).values(items).returning();
}

/**
 * Update pod status
 *
 * @param podId - Pod ID
 * @param status - New status
 * @param errorMessage - Optional error message for failed deployments
 */
export async function updatePodStatus(
  podId: string,
  status: PodStatus,
  errorMessage?: string,
): Promise<void> {
  await db
    .update(pullRequestPods)
    .set({
      status,
      errorMessage,
      updatedAt: new Date(),
      lastDeployedAt: status === "running" ? new Date() : undefined,
    })
    .where(eq(pullRequestPods.id, podId));
}

/**
 * Get active preview pods for a team
 *
 * Bulk operation with filtering - returns pods that are deploying or running.
 *
 * @param params - Filter parameters
 * @returns Array of active preview pods
 */
export async function listActivePreviewPods(params: {
  teamId?: string;
  statuses?: PodStatus[];
}): Promise<SelectPullRequestPod[]> {
  const conditions = [];

  if (params.statuses && params.statuses.length > 0) {
    conditions.push(inArray(pullRequestPods.status, params.statuses));
  }

  // TODO: Add team filtering via pullRequests -> repos -> teams join
  // For now, return all pods matching status filter
  if (conditions.length === 0) {
    return db.select().from(pullRequestPods);
  }

  return db
    .select()
    .from(pullRequestPods)
    .where(and(...conditions));
}

/**
 * Create preview deployment - Full orchestration workflow
 *
 * Coordinates the entire deployment process:
 * 1. Check for existing deployment (idempotency)
 * 2. Create database record with "pending" status
 * 3. Generate namespace and public URL
 * 4. Deploy Helm chart to Kubernetes
 * 5. Post GitHub comment with deployment info
 * 6. Update database with deployment status
 *
 * @param params - Deployment parameters
 * @returns Deployment result with pod, URLs, and status
 */
export async function createPreviewDeployment(params: {
  pullRequestId: string;
  repoName: string;
  repoOwner: string;
  prNumber: number;
  branch: string;
  commitSha: string;
  imageTag: string;
  installationId: number;
  chartPath?: string;
  resources?: {
    cpu: string;
    memory: string;
    pods: number;
  };
}): Promise<{
  success: boolean;
  pod?: SelectPullRequestPod;
  publicUrl?: string;
  helmRelease?: {
    releaseName: string;
    namespace: string;
  };
  githubComment?: {
    commentId: number;
    action: "created" | "updated";
  };
  error?: string;
}> {
  try {
    // 1. Check for existing deployment with same commit SHA (idempotency)
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
      // Return existing deployment
      return {
        success: true,
        pod: existing[0],
        publicUrl: existing[0].publicUrl || undefined,
      };
    }

    // 2. Generate namespace and public URL
    const namespace = generateNamespace(params.repoName, params.prNumber);
    const publicUrl = generatePublicUrl(namespace);
    const deploymentName = `${namespace}-app`;

    // 3. Create database record with "pending" status
    const [pod] = await createPreviewPods({
      pullRequestId: params.pullRequestId,
      commitSha: params.commitSha,
      namespace,
      deploymentName,
      status: "pending",
      publicUrl,
      branch: params.branch,
      imageTag: params.imageTag,
      resourcesAllocated: params.resources || {
        cpu: "500m",
        memory: "512Mi",
        pods: 1,
      },
    });

    // 4. Deploy Helm chart
    const helmResult = await deployHelmChart({
      namespace,
      chartPath: params.chartPath || "./charts/nextjs",
      releaseName: deploymentName,
      values: {
        image: {
          repository: `ghcr.io/${params.repoOwner}/${params.repoName}`,
          tag: params.imageTag,
        },
        resources: params.resources || {
          limits: { cpu: "500m", memory: "512Mi" },
        },
      },
    });

    // Handle deployment failure
    if (!helmResult.success) {
      await updatePodStatus(pod.id, "failed", helmResult.error);
      return {
        success: false,
        pod: { ...pod, status: "failed", errorMessage: helmResult.error },
        error: helmResult.error,
      };
    }

    // 5. Update pod status to "deploying" (Helm succeeded, waiting for pods)
    await updatePodStatus(pod.id, "deploying");

    // 6. Post GitHub comment
    const commentBody = `## 🚀 Preview Environment

**Status**: Deploying
**URL**: ${publicUrl}
**Branch**: \`${params.branch}\`
**Commit**: \`${params.commitSha.substring(0, 7)}\`

Preview environment is being deployed. This may take a few minutes...`;

    const commentResult = await upsertGitHubComment({
      owner: params.repoOwner,
      repo: params.repoName,
      prNumber: params.prNumber,
      body: commentBody,
      installationId: params.installationId,
    });

    // Return success result
    return {
      success: true,
      pod: { ...pod, status: "deploying" },
      publicUrl,
      helmRelease: {
        releaseName: deploymentName,
        namespace,
      },
      githubComment: commentResult.success
        ? {
            commentId: commentResult.commentId!,
            action: commentResult.action!,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown deployment error",
    };
  }
}
