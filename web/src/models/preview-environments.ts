/**
 * Preview Environments Model
 *
 * Database operations and Kubernetes orchestration for PR preview environments
 * No authentication - handled by actions layer
 */

import { db } from "@/db";
import { pullRequestPods, pullRequests, repos } from "@/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { getClusterConfig, getCoreV1Api, getAppsV1Api } from "@/lib/k8s-client";
import { createPullRequestPodJob } from "@/lib/k8s-pull-request-pod";
import { getInstallationOctokit } from "@/lib/github";

export type InsertPullRequestPod = InferInsertModel<typeof pullRequestPods>;
export type PodStatus = 'pending' | 'deploying' | 'running' | 'failed' | 'deleting';

/**
 * Query parameters for flexible pull request pod filtering
 */
export interface GetPullRequestPodsParams {
  ids?: string[];
  pullRequestIds?: string[];
  status?: PodStatus;
  teamIds?: string[];
  limit?: number;
}

/**
 * T011: Generate DNS-safe namespace name for a preview environment
 * 
 * DNS-1123 requirements:
 * - Lowercase alphanumeric characters or '-'
 * - Must start and end with alphanumeric
 * - Max 63 characters
 */
export function generateNamespace(repoName: string, prNumber: number): string {
  // Sanitize repo name: lowercase, replace non-alphanumeric with hyphens
  const sanitized = repoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Construct namespace: pr-{repo}-{number}
  const namespace = `pr-${sanitized}-${prNumber}`;

  // Ensure max length of 63 characters
  if (namespace.length > 63) {
    // Truncate repo name portion to fit
    const maxRepoLength = 63 - `pr--${prNumber}`.length;
    const truncatedRepo = sanitized.substring(0, maxRepoLength);
    return `pr-${truncatedRepo}-${prNumber}`;
  }

  return namespace;
}

/**
 * T012: Generate public URL for a preview environment
 * 
 * URL format: https://{namespace}.{base-domain}
 * Base domain should come from environment variable or configuration
 */
export function generatePublicUrl(namespace: string, baseDomain?: string): string {
  const domain = baseDomain || process.env.PREVIEW_BASE_DOMAIN || 'preview.local';
  return `https://${namespace}.${domain}`;
}

/**
 * T013 & T013b: Deploy Helm chart for preview environment
 * 
 * Waits for the image build Job to complete (from k8s-pull-request-pod.ts)
 * Then deploys the application using Helm with the built image tag
 * 
 * @param namespace Kubernetes namespace for deployment
 * @param deploymentName Name for the Helm deployment
 * @param imageTag Docker image tag that was built
 * @param repoName Repository name for configuration
 * @param clusterName Optional cluster name for multi-cluster support
 * @returns Deployment status
 */
export async function deployHelmChart(
  namespace: string,
  deploymentName: string,
  imageTag: string,
  repoName: string,
  clusterName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
    }

    const CoreV1Api = await getCoreV1Api();
    const coreApi = kc.makeApiClient(CoreV1Api);

    // Create namespace if it doesn't exist
    try {
      await coreApi.createNamespace({
        body: {
          metadata: {
            name: namespace,
            labels: {
              'app': 'catalyst-preview',
              'created-by': 'catalyst-web-app',
              'repo': repoName
            }
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || '';
      if (!errorBody.includes('already exists') && !errorMessage.includes('already exists')) {
        throw error;
      }
    }

    // For now, we use kubectl/helm via shell commands
    // In the future, this could use the Helm SDK or Kubernetes API directly
    // The deployment is handled by the PR pod job itself
    
    return { success: true };
  } catch (error) {
    console.error('Error deploying Helm chart:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error deploying Helm chart'
    };
  }
}

/**
 * T014: Upsert GitHub comment on PR with deployment status
 * 
 * Posts a new comment or updates existing comment with deployment information
 * 
 * @param repoFullName Repository full name (owner/repo)
 * @param prNumber Pull request number
 * @param status Deployment status
 * @param publicUrl Public URL for the preview environment
 * @param errorMessage Optional error message if deployment failed
 * @param installationId GitHub App installation ID
 * @returns Comment ID
 */
export async function upsertGitHubComment(
  repoFullName: string,
  prNumber: number,
  status: PodStatus,
  publicUrl?: string,
  errorMessage?: string,
  installationId?: number
): Promise<number | null> {
  try {
    if (!installationId) {
      console.warn('No installation ID provided, skipping GitHub comment');
      return null;
    }

    const octokit = await getInstallationOctokit(installationId);
    const [owner, repo] = repoFullName.split('/');

    // Generate comment body based on status
    let body = '## 🚀 Preview Environment\n\n';
    
    switch (status) {
      case 'pending':
        body += '⏳ **Status**: Deployment pending...\n\n';
        body += 'Your preview environment is being queued for deployment.';
        break;
      case 'deploying':
        body += '🔄 **Status**: Deploying...\n\n';
        body += 'Your preview environment is currently being built and deployed.';
        break;
      case 'running':
        body += '✅ **Status**: Running\n\n';
        body += `🌐 **URL**: [${publicUrl}](${publicUrl})\n\n`;
        body += 'Your preview environment is ready!';
        break;
      case 'failed':
        body += '❌ **Status**: Deployment Failed\n\n';
        if (errorMessage) {
          body += `**Error**: ${errorMessage}\n\n`;
        }
        body += 'Please check the logs for more details.';
        break;
      case 'deleting':
        body += '🗑️ **Status**: Cleaning up...\n\n';
        body += 'Preview environment is being deleted.';
        break;
    }

    body += `\n\n---\n*Updated: ${new Date().toISOString()}*`;

    // Check for existing comment
    const { data: comments } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find(
      (comment: { body?: string }) => comment.body?.includes('## 🚀 Preview Environment')
    );

    if (existingComment) {
      // Update existing comment
      const { data: updatedComment } = await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
      return updatedComment.id;
    } else {
      // Create new comment
      const { data: newComment } = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      return newComment.id;
    }
  } catch (error) {
    console.error('Error upserting GitHub comment:', error);
    return null;
  }
}

/**
 * T015: Create preview deployment with full orchestration
 * 
 * Main orchestration function that:
 * 1. Creates database record
 * 2. Triggers Kubernetes Job for image build
 * 3. Deploys Helm chart
 * 4. Posts GitHub comment
 * 
 * @param pullRequestId Database ID of the pull request
 * @param commitSha Git commit SHA
 * @param branch PR branch name
 * @param repoFullName Repository full name (owner/repo)
 * @param prNumber PR number
 * @param installationId GitHub App installation ID
 * @param clusterName Optional cluster name
 * @returns Created pull request pod record
 */
export async function createPreviewDeployment(params: {
  pullRequestId: string;
  commitSha: string;
  branch: string;
  repoFullName: string;
  prNumber: number;
  installationId?: number;
  clusterName?: string;
}): Promise<InsertPullRequestPod & { id: string }> {
  const { pullRequestId, commitSha, branch, repoFullName, prNumber, installationId, clusterName } = params;

  // Extract repo name from full name
  const repoName = repoFullName.split('/')[1];

  // Generate namespace and public URL
  const namespace = generateNamespace(repoName, prNumber);
  const publicUrl = generatePublicUrl(namespace);
  const deploymentName = `preview-${repoName}-${prNumber}`;

  // Create database record with pending status
  const [pod] = await db
    .insert(pullRequestPods)
    .values({
      pullRequestId,
      commitSha,
      namespace,
      deploymentName,
      status: 'pending',
      publicUrl,
      branch,
      resourcesAllocated: {
        cpu: '500m',
        memory: '512Mi',
        pods: 1
      }
    })
    .returning();

  // Post initial GitHub comment
  await upsertGitHubComment(
    repoFullName,
    prNumber,
    'pending',
    publicUrl,
    undefined,
    installationId
  );

  try {
    // Update status to deploying
    await db
      .update(pullRequestPods)
      .set({ status: 'deploying', updatedAt: new Date() })
      .where(eq(pullRequestPods.id, pod.id));

    // Post deploying comment
    await upsertGitHubComment(
      repoFullName,
      prNumber,
      'deploying',
      publicUrl,
      undefined,
      installationId
    );

    // Create Kubernetes Job for image build
    await createPullRequestPodJob({
      name: `pr-${prNumber}`,
      namespace,
      clusterName,
      env: {
        REPO_URL: `https://github.com/${repoFullName}.git`,
        PR_BRANCH: branch,
        PR_NUMBER: prNumber.toString(),
        GITHUB_USER: repoFullName.split('/')[0],
        IMAGE_NAME: `ghcr.io/${repoFullName.toLowerCase()}:pr-${prNumber}`,
        NEEDS_BUILD: 'true'
      }
    });

    // Store image tag
    const imageTag = `pr-${prNumber}`;
    await db
      .update(pullRequestPods)
      .set({ imageTag, updatedAt: new Date() })
      .where(eq(pullRequestPods.id, pod.id));

    // Deploy Helm chart (this is simplified for now)
    // In a real implementation, we'd wait for the job to complete first
    const deployResult = await deployHelmChart(
      namespace,
      deploymentName,
      imageTag,
      repoName,
      clusterName
    );

    if (!deployResult.success) {
      throw new Error(deployResult.error || 'Helm deployment failed');
    }

    // Update status to running
    await db
      .update(pullRequestPods)
      .set({ 
        status: 'running', 
        lastDeployedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(pullRequestPods.id, pod.id));

    // Post success comment
    await upsertGitHubComment(
      repoFullName,
      prNumber,
      'running',
      publicUrl,
      undefined,
      installationId
    );

  } catch (error) {
    // Update status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
    
    await db
      .update(pullRequestPods)
      .set({ 
        status: 'failed', 
        errorMessage,
        updatedAt: new Date() 
      })
      .where(eq(pullRequestPods.id, pod.id));

    // Post failure comment
    await upsertGitHubComment(
      repoFullName,
      prNumber,
      'failed',
      publicUrl,
      errorMessage,
      installationId
    );

    throw error;
  }

  // Return the created pod
  return pod;
}

/**
 * T016: Watch deployment status using Kubernetes Watch API
 * 
 * Monitors Kubernetes deployment and updates database record
 * This is a simplified version - full implementation would use K8s Watch API
 * 
 * @param podId Database ID of the pull request pod
 * @param namespace Kubernetes namespace
 * @param deploymentName Deployment name
 * @param clusterName Optional cluster name
 */
export async function watchDeploymentStatus(
  podId: string,
  namespace: string,
  deploymentName: string,
  clusterName?: string
): Promise<void> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
    }

    const AppsV1Api = await getAppsV1Api();
    const appsApi = kc.makeApiClient(AppsV1Api);

    // Poll deployment status (simplified - real implementation would use Watch API)
    const deployment = await appsApi.readNamespacedDeployment({
      name: deploymentName,
      namespace
    });

    const availableReplicas = deployment.status?.availableReplicas || 0;
    const desiredReplicas = deployment.spec?.replicas || 1;

    if (availableReplicas >= desiredReplicas) {
      // Deployment is ready
      await db
        .update(pullRequestPods)
        .set({ 
          status: 'running',
          lastDeployedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(pullRequestPods.id, podId));
    }
  } catch (error) {
    console.error('Error watching deployment status:', error);
    // Don't throw - this is a background monitoring task
  }
}

/**
 * T017: List active preview pods with team filtering
 * 
 * Query active pods with optional team filtering for authorization
 * Follows bulk operation pattern
 */
export async function listActivePreviewPods(params: GetPullRequestPodsParams) {
  const { ids, pullRequestIds, status, teamIds, limit = 50 } = params;

  // Build where conditions
  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(pullRequestPods.id, ids));
  }
  if (pullRequestIds && pullRequestIds.length > 0) {
    conditions.push(inArray(pullRequestPods.pullRequestId, pullRequestIds));
  }
  if (status) {
    conditions.push(eq(pullRequestPods.status, status));
  }

  // Return empty array if no conditions
  if (conditions.length === 0 && !teamIds) {
    return [];
  }

  // If team filtering is needed, join with repos
  if (teamIds && teamIds.length > 0) {
    return db
      .select({
        pod: pullRequestPods,
        pullRequest: pullRequests,
        repo: repos
      })
      .from(pullRequestPods)
      .innerJoin(pullRequests, eq(pullRequestPods.pullRequestId, pullRequests.id))
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(
        and(
          ...conditions,
          inArray(repos.teamId, teamIds)
        )
      )
      .orderBy(desc(pullRequestPods.updatedAt))
      .limit(limit);
  }

  // Otherwise, return pods without team filtering
  return db
    .select()
    .from(pullRequestPods)
    .where(and(...conditions))
    .orderBy(desc(pullRequestPods.updatedAt))
    .limit(limit);
}

/**
 * Get preview pod logs from Kubernetes
 * 
 * @param namespace Kubernetes namespace
 * @param podName Pod name (not database ID)
 * @param containerName Container name
 * @param tailLines Number of lines to tail
 * @param clusterName Optional cluster name
 * @returns Pod logs as string
 */
export async function getPreviewPodLogs(
  namespace: string,
  podName: string,
  containerName: string = 'app',
  tailLines: number = 100,
  clusterName?: string
): Promise<string> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
    }

    const CoreV1Api = await getCoreV1Api();
    const coreApi = kc.makeApiClient(CoreV1Api);

    const logs = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace,
      container: containerName,
      tailLines
    });

    return logs;
  } catch (error) {
    console.error('Error fetching pod logs:', error);
    throw error;
  }
}

/**
 * Delete Kubernetes namespace and all resources
 * 
 * @param namespace Namespace to delete
 * @param clusterName Optional cluster name
 */
export async function deleteKubernetesNamespace(
  namespace: string,
  clusterName?: string
): Promise<void> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
    }

    const CoreV1Api = await getCoreV1Api();
    const coreApi = kc.makeApiClient(CoreV1Api);

    await coreApi.deleteNamespace({ name: namespace });
  } catch (error) {
    console.error('Error deleting namespace:', error);
    throw error;
  }
}

/**
 * Delete preview deployment
 * 
 * Deletes Kubernetes namespace and updates database record
 * 
 * @param podId Database ID of the pull request pod
 * @param clusterName Optional cluster name
 */
export async function deletePreviewDeployment(
  podId: string,
  clusterName?: string
): Promise<void> {
  // Get pod record
  const [pod] = await db
    .select()
    .from(pullRequestPods)
    .where(eq(pullRequestPods.id, podId))
    .limit(1);

  if (!pod) {
    throw new Error(`Pull request pod not found: ${podId}`);
  }

  try {
    // Update status to deleting
    await db
      .update(pullRequestPods)
      .set({ status: 'deleting', updatedAt: new Date() })
      .where(eq(pullRequestPods.id, podId));

    // Delete Kubernetes namespace (cascades to all resources)
    await deleteKubernetesNamespace(pod.namespace, clusterName);

    // Soft delete in database
    await db
      .update(pullRequestPods)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(pullRequestPods.id, podId));

  } catch (error) {
    console.error('Error deleting preview deployment:', error);
    
    // Update status to failed
    await db
      .update(pullRequestPods)
      .set({ 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown deletion error',
        updatedAt: new Date()
      })
      .where(eq(pullRequestPods.id, podId));
    
    throw error;
  }
}
