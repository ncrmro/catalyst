"use server";

/**
 * Preview Environments Actions Layer
 *
 * Boundary layer between React components/webhooks and backend models.
 * Provides authentication, type re-exports, and clean interfaces.
 */

import { auth } from "@/auth";
import {
  createPreviewDeployment as createDeployment,
  generateNamespace as genNamespace,
  generatePublicUrl as genPublicUrl,
  deployHelmChart as deployChart,
  upsertGitHubComment as upsertComment,
  createPreviewPods as createPods,
  updatePodStatus as updateStatus,
  listActivePreviewPods as listPods,
} from "@/models/preview-environments";

// Re-export types for React components and webhooks
export type {
  InsertPullRequestPod,
  SelectPullRequestPod,
  PodStatus,
  ResourceAllocation,
  DeploymentComment,
  PreviewEnvironmentConfig,
  PullRequestPodWithRelations,
} from "@/types/preview-environments";

/**
 * Create preview deployment - Full orchestration
 *
 * NOTE: This action is typically called from GitHub webhooks,
 * so authentication is handled via webhook signature verification
 * rather than NextAuth session.
 *
 * @param params - Deployment parameters
 * @returns Deployment result
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
}) {
  // Note: Authentication for webhooks is handled via signature verification
  // in the webhook route handler, not via NextAuth session
  return createDeployment(params);
}

/**
 * Generate DNS-1123 compliant namespace name
 * Utility function for frontend/testing
 */
export function generateNamespace(repoName: string, prNumber: number): string {
  return genNamespace(repoName, prNumber);
}

/**
 * Generate public URL for preview environment
 * Utility function for frontend/testing
 */
export function generatePublicUrl(
  namespace: string,
  baseDomain?: string,
): string {
  return genPublicUrl(namespace, baseDomain);
}

/**
 * Deploy Helm chart to Kubernetes
 *
 * NOTE: Typically called internally by createPreviewDeployment,
 * but exposed for manual deployments or retries.
 */
export async function deployHelmChart(params: {
  namespace: string;
  chartPath: string;
  releaseName: string;
  values: Record<string, unknown>;
}) {
  // No auth required - internal utility
  return deployChart(params);
}

/**
 * Post or update GitHub PR comment
 *
 * NOTE: Authentication via GitHub App installation ID,
 * not NextAuth session.
 */
export async function upsertGitHubComment(params: {
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
  installationId: number;
  commentId?: number;
}) {
  return upsertComment(params);
}

/**
 * Create preview pods in database
 *
 * Requires authentication for manual creation.
 * Webhooks bypass auth via signature verification.
 */
export async function createPreviewPods(
  data:
    | Parameters<typeof createPods>[0]
    | Array<Parameters<typeof createPods>[0]>,
) {
  // Check auth for manual operations
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized: Must be authenticated to create pods manually");
  }

  return createPods(data);
}

/**
 * Update pod deployment status
 *
 * Requires authentication.
 */
export async function updatePodStatus(
  podId: string,
  status: Parameters<typeof updateStatus>[1],
  errorMessage?: string,
) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized: Must be authenticated to update pod status");
  }

  return updateStatus(podId, status, errorMessage);
}

/**
 * List active preview pods
 *
 * Requires authentication to view pods.
 */
export async function listActivePreviewPods(params: {
  teamId?: string;
  statuses?: Parameters<typeof listPods>[0]["statuses"];
}) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized: Must be authenticated to list pods");
  }

  return listPods(params);
}
