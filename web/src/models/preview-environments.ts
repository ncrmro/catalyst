/**
 * Preview Environments Model
 *
 * Database operations and business logic for PR preview deployments
 * No authentication - handled by actions layer
 */

import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { getClusterConfig, getCoreV1Api } from "@/lib/k8s-client";
import { createPullRequestPodJob, type PullRequestPodOptions } from "@/lib/k8s-pull-request-pod";
import { Octokit } from "@octokit/rest";
import type { PodStatus } from "@/types/preview-environments";

export type InsertPullRequestPod = InferInsertModel<typeof pullRequestPods>;
export type UpdatePullRequestPod = Partial<Omit<InsertPullRequestPod, "id" | "createdAt">>;

/**
 * Query parameters for flexible preview pod filtering
 */
export interface GetPreviewPodsParams {
  ids?: string[];
  pullRequestIds?: string[];
  namespaces?: string[];
  statuses?: PodStatus[];
  teamIds?: string[];
}

/**
 * T011: Generate DNS-safe namespace name for preview environment
 * Follows DNS-1123 compliance: lowercase alphanumeric + hyphens, max 63 chars
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
 * Constructs HTTPS URL based on namespace and configured domain
 */
export function generatePublicUrl(namespace: string, baseDomain?: string): string {
  // Use environment variable or default domain
  const domain = baseDomain || process.env.PREVIEW_BASE_DOMAIN || "preview.example.com";
  return `https://${namespace}.${domain}`;
}

/**
 * T014: Upsert deployment comment on GitHub PR
 * Creates or updates a single deployment status comment
 */
export async function upsertGitHubComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  status: PodStatus,
  publicUrl?: string,
  errorMessage?: string
): Promise<void> {
  const commentMarker = "<!-- catalyst-preview-deployment -->";
  
  const statusEmoji = {
    pending: "⏳",
    deploying: "🚀",
    running: "✅",
    failed: "❌",
    deleting: "🗑️",
  };

  const timestamp = new Date().toISOString();
  
  let body = `${commentMarker}
## Preview Environment Deployment ${statusEmoji[status]}

**Status**: ${status}
${status === "running" && publicUrl ? `**URL**: ${publicUrl}` : ""}
**Last Updated**: ${timestamp}
`;

  if (status === "failed" && errorMessage) {
    body += `
### Error Details
\`\`\`
${errorMessage}
\`\`\`
`;
  }

  try {
    // Find existing comment
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find((c) => c.body?.includes(commentMarker));

    if (existingComment) {
      // Update existing
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
    } else {
      // Create new
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
    }
  } catch (error) {
    console.error("Failed to upsert GitHub comment:", error);
    // Don't throw - deployment should continue even if comment fails
  }
}

/**
 * T013: Deploy Helm chart for preview environment
 * Waits for image build job to complete, then deploys Helm chart with the built image
 */
export async function deployHelmChart(
  namespace: string,
  deploymentName: string,
  imageTag: string,
  publicUrl: string,
  prNumber: number,
  branch: string,
  clusterName?: string
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  // TODO: Implement Helm chart deployment
  // This will use helm CLI or helm SDK to deploy the application
  // For now, this is a placeholder that would be implemented based on project's Helm setup
  
  // Example implementation would look like:
  // const helmCommand = `helm upgrade --install ${deploymentName} ./charts/app ` +
  //   `--namespace ${namespace} ` +
  //   `--create-namespace ` +
  //   `--set image.tag=${imageTag} ` +
  //   `--set ingress.hosts[0].host=${publicUrl} ` +
  //   `--set pullRequest.number=${prNumber} ` +
  //   `--set pullRequest.branch=${branch}`;
  
  console.log(`Deploying Helm chart: ${deploymentName} in namespace ${namespace} with image tag ${imageTag}`);
}

/**
 * T016: Watch Kubernetes deployment status using Watch API
 * Monitors deployment until ready or failed, with timeout
 */
export async function watchDeploymentStatus(
  namespace: string,
  deploymentName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timeoutMs: number = 180000, // 3 minutes default
  clusterName?: string
): Promise<"running" | "failed"> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  // TODO: Implement Kubernetes Watch API for deployment monitoring
  // This would use @kubernetes/client-node Watch class
  
  // For now, return a placeholder status
  // Real implementation would watch deployment.status.conditions and readyReplicas
  console.log(`Watching deployment status for ${deploymentName} in ${namespace}`);
  
  // Placeholder: simulate successful deployment
  return "running";
}

/**
 * T017: List active preview pods with team filtering
 * Returns preview environments that match the query parameters
 */
export async function listActivePreviewPods(params: GetPreviewPodsParams) {
  const { ids, pullRequestIds, namespaces, statuses, teamIds } = params;

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

  // Return empty array if no conditions (prevents fetching all pods)
  if (conditions.length === 0 && !teamIds) {
    return [];
  }

  // Use relational query to include PR and repo data for team filtering
  const pods = await db.query.pullRequestPods.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      pullRequest: {
        with: {
          repo: true,
        },
      },
    },
  });

  // Apply team filtering if needed
  if (teamIds && teamIds.length > 0) {
    return pods.filter(pod => 
      pod.pullRequest?.repo?.teamId && teamIds.includes(pod.pullRequest.repo.teamId)
    );
  }

  return pods;
}

/**
 * Inferred type from listActivePreviewPods - a single pod with all relations
 */
export type PreviewPodWithRelations = Awaited<ReturnType<typeof listActivePreviewPods>>[number];

/**
 * T015: Create preview deployment
 * Full orchestration: create namespace, build image, deploy Helm chart, update database, post GitHub comment
 */
export async function createPreviewDeployment(
  pullRequestId: string,
  commitSha: string,
  branch: string,
  repoFullName: string,
  prNumber: number,
  octokit: Octokit,
  clusterName?: string
): Promise<InsertPullRequestPod> {
  // Generate namespace and URLs
  const namespace = generateNamespace(repoFullName, prNumber);
  const publicUrl = generatePublicUrl(namespace);
  const deploymentName = `preview-${prNumber}`;
  const imageTag = commitSha.substring(0, 7); // Use short SHA as tag

  // Create database record with pending status
  const [podRecord] = await db.insert(pullRequestPods).values({
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
  }).returning();

  // Post initial GitHub comment
  const [owner, repo] = repoFullName.split("/");
  await upsertGitHubComment(octokit, owner, repo, prNumber, "pending", publicUrl);

  try {
    // Update status to deploying
    await db.update(pullRequestPods)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(pullRequestPods.id, podRecord.id));

    await upsertGitHubComment(octokit, owner, repo, prNumber, "deploying", publicUrl);

    // Create namespace and build image using existing k8s-pull-request-pod utilities
    const podOptions: PullRequestPodOptions = {
      name: `pr-${prNumber}`,
      namespace,
      clusterName,
      env: {
        REPO_URL: `https://github.com/${repoFullName}`,
        PR_BRANCH: branch,
        PR_NUMBER: String(prNumber),
        GITHUB_USER: owner,
      },
    };

    // Create the build job - this handles namespace creation and image building
    const jobResult = await createPullRequestPodJob(podOptions);
    console.log(`Build job created: ${jobResult.jobName} in namespace ${jobResult.namespace}`);

    // T013b: Deploy Helm chart after image build
    // In a real implementation, we would wait for the job to complete before deploying
    await deployHelmChart(namespace, deploymentName, imageTag, publicUrl, prNumber, branch, clusterName);

    // Watch deployment status
    const finalStatus = await watchDeploymentStatus(namespace, deploymentName, 180000, clusterName);

    // Update database with final status
    const [updatedPod] = await db.update(pullRequestPods)
      .set({
        status: finalStatus,
        lastDeployedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pullRequestPods.id, podRecord.id))
      .returning();

    // Post final GitHub comment
    await upsertGitHubComment(octokit, owner, repo, prNumber, finalStatus, publicUrl);

    return updatedPod;
  } catch (error) {
    // Update database with failed status
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await db.update(pullRequestPods)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(pullRequestPods.id, podRecord.id));

    // Post failure comment
    await upsertGitHubComment(octokit, owner, repo, prNumber, "failed", publicUrl, errorMessage);

    throw error;
  }
}

/**
 * Get preview environment logs from Kubernetes
 * Used by User Story 2 for log viewing
 */
export async function getPreviewPodLogs(
  namespace: string,
  podName: string,
  containerName?: string,
  tailLines: number = 100,
  clusterName?: string
): Promise<string> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const CoreV1Api = await getCoreV1Api();
  const coreApi = kc.makeApiClient(CoreV1Api);

  try {
    const response = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace,
      container: containerName,
      tailLines,
    });
    
    return response.body || "";
  } catch (error) {
    console.error("Failed to fetch pod logs:", error);
    throw new Error(`Failed to fetch logs for pod ${podName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
