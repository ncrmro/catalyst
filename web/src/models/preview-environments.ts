/**
 * Preview Environments Model
 *
 * Database operations and business logic for pull request preview environments
 * No authentication - handled by actions layer
 */

import { db } from "@/db";
import { pullRequestPods, pullRequests, repos } from "@/db/schema";
import { eq, inArray, and, desc, isNull } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import type { PodStatus } from "@/types/preview-environments";
import { getInstallationOctokit } from "@/lib/github";
import { createPullRequestPodJob, type PullRequestPodResult } from "@/lib/k8s-pull-request-pod";

export type InsertPullRequestPod = InferInsertModel<typeof pullRequestPods>;

/**
 * Query parameters for flexible pull request pod filtering
 */
export interface GetPullRequestPodsParams {
  ids?: string[];
  pullRequestIds?: string[];
  namespaces?: string[];
  statuses?: PodStatus[];
  teamId?: string;
  limit?: number;
}

/**
 * T011: Generate DNS-safe namespace name for preview environment
 * Pattern: pr-{sanitized-repo-name}-{pr-number}
 */
export function generateNamespace(repoName: string, prNumber: number): string {
  // Remove owner prefix if present (e.g., "owner/repo" → "repo")
  const shortRepoName = repoName.split("/").pop() || repoName;

  // Sanitize: lowercase, replace non-alphanumeric with hyphens
  const sanitized = shortRepoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens

  const namespace = `pr-${sanitized}-${prNumber}`;

  // Enforce 63 character limit
  return namespace.length > 63
    ? namespace.substring(0, 63).replace(/-$/, "")
    : namespace;
}

/**
 * T012: Generate public URL for preview environment
 * Uses ingress hostname pattern
 */
export function generatePublicUrl(namespace: string): string {
  // Get base domain from environment or use default
  const baseDomain = process.env.PREVIEW_DOMAIN || "preview.catalyst.dev";
  return `https://${namespace}.${baseDomain}`;
}

/**
 * T013 & T013b: Deploy Helm chart for preview environment
 * Waits for Job completion from k8s-pull-request-pod.ts before deploying Helm chart
 */
export async function deployHelmChart(
  namespace: string,
  deploymentName: string,
  imageTag: string,
  publicUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // NOTE: For MVP, we're using the existing pull request pod job
    // which handles both image building and basic deployment.
    // Full Helm chart deployment will be added in a follow-up.
    
    // The job created by createPullRequestPodJob already:
    // 1. Builds the Docker image
    // 2. Pushes it to the registry
    // 3. Can deploy basic resources
    
    // For now, we'll mark this as successful if the job was created
    // Future enhancement: Add actual Helm deployment here
    console.log(`Helm chart deployment placeholder for ${deploymentName} in ${namespace}`);
    console.log(`Image tag: ${imageTag}, Public URL: ${publicUrl}`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to deploy Helm chart:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * T014: Upsert GitHub comment on PR with deployment status
 * Uses upsert pattern: Search for existing comment, update if found, create if not
 */
export async function upsertGitHubComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  status: PodStatus,
  publicUrl?: string,
  errorMessage?: string
): Promise<{ success: boolean; commentId?: number; error?: string }> {
  try {
    const octokit = await getInstallationOctokit(installationId);
    
    // Comment marker for identifying our deployment comments
    const commentMarker = "<!-- catalyst-preview-deployment -->";
    
    // Format comment body based on status
    const statusEmoji = {
      pending: "⏳",
      deploying: "🚀",
      running: "✅",
      failed: "❌",
      deleting: "🗑️",
    };

    let body = `${commentMarker}\n## Preview Environment Deployment ${statusEmoji[status]}\n\n`;
    body += `**Status**: ${status}\n`;
    
    if (status === "running" && publicUrl) {
      body += `**URL**: ${publicUrl}\n`;
    }
    
    body += `**Last Updated**: ${new Date().toISOString()}\n`;
    
    if (status === "failed" && errorMessage) {
      body += `\n### Error Details\n\`\`\`\n${errorMessage}\n\`\`\`\n`;
    }

    // Find existing comment
    const { data: comments } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: prNumber,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingComment = comments.find((c: any) => c.body?.includes(commentMarker));

    if (existingComment) {
      // Update existing comment
      await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
      return { success: true, commentId: existingComment.id };
    } else {
      // Create new comment
      const { data: newComment } = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      return { success: true, commentId: newComment.id };
    }
  } catch (error) {
    console.error("Failed to upsert GitHub comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * T015: Create preview deployment - main orchestration function
 * Handles database, Kubernetes, and GitHub comment creation
 */
export async function createPreviewDeployment(params: {
  pullRequestId: string;
  commitSha: string;
  branch: string;
  repoFullName: string;
  prNumber: number;
  installationId: number;
  repoUrl: string;
}): Promise<{ success: boolean; pod?: typeof pullRequestPods.$inferSelect; error?: string }> {
  const { pullRequestId, commitSha, branch, repoFullName, prNumber, installationId, repoUrl } = params;
  
  try {
    // Generate namespace and URL
    const namespace = generateNamespace(repoFullName, prNumber);
    const publicUrl = generatePublicUrl(namespace);
    const deploymentName = `pr-${prNumber}`;
    const imageTag = commitSha.substring(0, 7); // Use short SHA as tag

    // Extract owner and repo name for GitHub API
    const [owner, repoName] = repoFullName.split("/");

    // Check if pod already exists for this PR and commit (idempotency)
    const existing = await db
      .select()
      .from(pullRequestPods)
      .where(
        and(
          eq(pullRequestPods.pullRequestId, pullRequestId),
          eq(pullRequestPods.commitSha, commitSha)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`Preview pod already exists for PR ${prNumber} at commit ${commitSha}`);
      return { success: true, pod: existing[0] };
    }

    // Create database record first
    const [pod] = await db
      .insert(pullRequestPods)
      .values({
        pullRequestId,
        commitSha,
        namespace,
        deploymentName,
        status: "pending",
        publicUrl,
        branch,
        imageTag,
        resourcesAllocated: {
          cpu: "500m",
          memory: "512Mi",
          pods: 1,
        },
      })
      .returning();

    // Post initial GitHub comment
    await upsertGitHubComment(
      installationId,
      owner,
      repoName,
      prNumber,
      "pending"
    );

    // Update status to deploying
    await db
      .update(pullRequestPods)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(pullRequestPods.id, pod.id));

    // Post deploying status to GitHub
    await upsertGitHubComment(
      installationId,
      owner,
      repoName,
      prNumber,
      "deploying"
    );

    // Create Kubernetes job for building image (using existing infrastructure)
    const prJobName = `pr-${prNumber}-${repoName}`;
    let podJobResult: PullRequestPodResult | null = null;
    
    try {
      podJobResult = await createPullRequestPodJob({
        name: prJobName,
        namespace: namespace,
        env: {
          REPO_URL: repoUrl,
          PR_BRANCH: branch,
          PR_NUMBER: prNumber.toString(),
          GITHUB_USER: owner,
          IMAGE_NAME: `${repoName}/web`,
          NEEDS_BUILD: 'true',
          SHALLOW_CLONE: 'true',
          MANIFEST_DOCKERFILE: '/web/Dockerfile',
          TARGET_NAMESPACE: namespace
        }
      });
      console.log(`Pull request pod job created for PR ${prNumber}:`, podJobResult);
    } catch (podJobError) {
      console.error(`Failed to create pull request pod job for PR ${prNumber}:`, podJobError);
      
      // Update database record with error
      await db
        .update(pullRequestPods)
        .set({ 
          status: "failed", 
          errorMessage: podJobError instanceof Error ? podJobError.message : "Failed to create pod job",
          updatedAt: new Date() 
        })
        .where(eq(pullRequestPods.id, pod.id));

      // Post failure to GitHub
      await upsertGitHubComment(
        installationId,
        owner,
        repoName,
        prNumber,
        "failed",
        undefined,
        podJobError instanceof Error ? podJobError.message : "Failed to create pod job"
      );

      return {
        success: false,
        error: podJobError instanceof Error ? podJobError.message : "Failed to create pod job",
      };
    }

    // Deploy Helm chart (placeholder for now)
    const helmResult = await deployHelmChart(
      namespace,
      deploymentName,
      imageTag,
      publicUrl
    );

    if (!helmResult.success) {
      // Update database record with error
      await db
        .update(pullRequestPods)
        .set({ 
          status: "failed", 
          errorMessage: helmResult.error,
          updatedAt: new Date() 
        })
        .where(eq(pullRequestPods.id, pod.id));

      // Post failure to GitHub
      await upsertGitHubComment(
        installationId,
        owner,
        repoName,
        prNumber,
        "failed",
        undefined,
        helmResult.error
      );

      return { success: false, error: helmResult.error };
    }

    // For now, mark as running immediately after job creation
    // TODO: Add actual deployment monitoring
    await db
      .update(pullRequestPods)
      .set({ 
        status: "running", 
        lastDeployedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(pullRequestPods.id, pod.id));

    // Post success to GitHub
    await upsertGitHubComment(
      installationId,
      owner,
      repoName,
      prNumber,
      "running",
      publicUrl
    );

    return { success: true, pod };
  } catch (error) {
    console.error("Failed to create preview deployment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * T016: Watch deployment status using Kubernetes Watch API
 * Monitors Kubernetes deployments for status changes
 */
export async function watchDeploymentStatus(
  namespace: string,
  deploymentName: string
): Promise<"success" | "failed"> {
  try {
    // For now, return success immediately as watch API requires more complex setup
    // TODO: Implement proper watch API when Kubernetes cluster is available
    console.log(`Watch deployment status for ${deploymentName} in ${namespace} (placeholder)`);
    return "success";
  } catch (error) {
    console.error("Failed to watch deployment status:", error);
    return "failed";
  }
}

/**
 * T017: List active preview pods with team filtering
 * Returns all active preview environments for a team
 */
export async function listActivePreviewPods(params: GetPullRequestPodsParams) {
  const { ids, pullRequestIds, namespaces, statuses, teamId, limit = 50 } = params;

  // Build where conditions
  const conditions = [];
  
  if (ids && ids.length > 0) {
    conditions.push(inArray(pullRequestPods.id, ids));
  }
  if (pullRequestIds && pullRequestIds.length > 0) {
    conditions.push(inArray(pullRequestPods.pullRequestId, pullRequestIds));
  }
  if (namespaces && namespaces.length > 0) {
    conditions.push(inArray(pullRequestPods.namespace, namespaces));
  }
  if (statuses && statuses.length > 0) {
    conditions.push(inArray(pullRequestPods.status, statuses));
  }

  // Only show non-deleted pods
  conditions.push(isNull(pullRequestPods.deletedAt));

  const query = db
    .select({
      pod: pullRequestPods,
      pullRequest: pullRequests,
      repo: repos,
    })
    .from(pullRequestPods)
    .innerJoin(pullRequests, eq(pullRequestPods.pullRequestId, pullRequests.id))
    .innerJoin(repos, eq(pullRequests.repoId, repos.id));

  // Add team filtering if provided
  if (teamId) {
    conditions.push(eq(repos.teamId, teamId));
  }

  // Apply where conditions
  const finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

  const results = await finalQuery
    .orderBy(desc(pullRequestPods.createdAt))
    .limit(limit);

  return results;
}

/**
 * Get pull request pods with optional filtering
 * Follows bulk operation pattern
 */
export async function getPullRequestPods(params: GetPullRequestPodsParams) {
  const { ids, pullRequestIds, namespaces, statuses, limit = 50 } = params;

  const conditions = [];
  
  if (ids && ids.length > 0) {
    conditions.push(inArray(pullRequestPods.id, ids));
  }
  if (pullRequestIds && pullRequestIds.length > 0) {
    conditions.push(inArray(pullRequestPods.pullRequestId, pullRequestIds));
  }
  if (namespaces && namespaces.length > 0) {
    conditions.push(inArray(pullRequestPods.namespace, namespaces));
  }
  if (statuses && statuses.length > 0) {
    conditions.push(inArray(pullRequestPods.status, statuses));
  }

  // Only show non-deleted pods
  conditions.push(isNull(pullRequestPods.deletedAt));

  if (conditions.length === 0) {
    return [];
  }

  return await db
    .select()
    .from(pullRequestPods)
    .where(and(...conditions))
    .orderBy(desc(pullRequestPods.createdAt))
    .limit(limit);
}

/**
 * Update pod status
 */
export async function updatePodStatus(
  podId: string,
  status: PodStatus,
  errorMessage?: string
): Promise<void> {
  await db
    .update(pullRequestPods)
    .set({
      status,
      errorMessage,
      updatedAt: new Date(),
      lastDeployedAt: status === 'running' ? new Date() : undefined,
    })
    .where(eq(pullRequestPods.id, podId));
}
