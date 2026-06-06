/**
 * GitHub PR Comments Module
 *
 * Low-level GitHub API operations for managing PR comments.
 * This module handles creating and updating deployment status comments on PRs.
 *
 * NOTE: This module contains NO database operations. Database logic lives in
 * models/preview-environments.ts which orchestrates calls to these functions.
 */

import { getOctokitForComments } from "./client";

// Pod status type for deployment comments
export type PodStatus =
  | "pending"
  | "deploying"
  | "running"
  | "failed"
  | "deleting";

// Marker to identify Catalyst deployment comments for upsert operations
const DEPLOYMENT_COMMENT_MARKER = "<!-- catalyst-preview-deployment -->";

export interface DeploymentCommentParams {
  /** Optional: If not provided, uses PAT for local development */
  installationId?: number;
  owner: string;
  repo: string;
  prNumber: number;
  status: PodStatus;
  publicUrl?: string;
  commitSha: string;
  namespace?: string;
  errorMessage?: string;
}

export interface CommentResult {
  success: boolean;
  commentId?: number;
  error?: string;
}

/**
 * Format deployment status into a GitHub comment body.
 *
 * @param params - Deployment status parameters
 * @returns Formatted markdown comment body
 */
export function formatDeploymentComment(params: {
  status: PodStatus;
  publicUrl?: string;
  commitSha: string;
  namespace?: string;
  errorMessage?: string;
}): string {
  const { status, publicUrl, commitSha, namespace, errorMessage } = params;
  const shortSha = commitSha.slice(0, 7);
  const timestamp = new Date().toISOString();

  let statusEmoji: string;
  let statusText: string;

  switch (status) {
    case "pending":
      statusEmoji = "🟡";
      statusText = "Pending";
      break;
    case "deploying":
      statusEmoji = "🔄";
      statusText = "Deploying";
      break;
    case "running":
      statusEmoji = "🟢";
      statusText = "Live";
      break;
    case "failed":
      statusEmoji = "🔴";
      statusText = "Failed";
      break;
    case "deleting":
      statusEmoji = "⏳";
      statusText = "Deleting";
      break;
    default:
      statusEmoji = "⚪";
      statusText = "Unknown";
  }

  let body = `${DEPLOYMENT_COMMENT_MARKER}
## ${statusEmoji} Preview Environment

| Property | Value |
|----------|-------|
| **Status** | ${statusText} |
| **Commit** | \`${shortSha}\` |`;

  if (namespace) {
    body += `
| **Namespace** | \`${namespace}\` |`;
  }

  if (publicUrl && status === "running") {
    body += `
| **URL** | [${publicUrl}](${publicUrl}) |`;
  }

  body += `
| **Updated** | ${timestamp} |`;

  if (status === "running" && publicUrl) {
    body += `

### Access Your Preview

Click the link above to view your preview environment. The environment will automatically update when you push new commits to this PR.`;
  }

  if (status === "deploying") {
    body += `

### Deployment in Progress

Your preview environment is being deployed. This usually takes 1-3 minutes. This comment will be updated once deployment completes.`;
  }

  if (status === "failed" && errorMessage) {
    body += `

### Deployment Failed

\`\`\`
${errorMessage}
\`\`\`

Please check the build logs for more details.`;
  }

  if (status === "deleting") {
    body += `

### Cleanup in Progress

This preview environment is being deleted. This usually happens when the PR is closed or merged.`;
  }

  body += `

---
<sub>Deployed by [Catalyst](https://github.com/ncrmro/catalyst) | Last updated: ${timestamp}</sub>`;

  return body;
}

/**
 * Find an existing deployment comment on a PR by looking for the marker.
 *
 * @param installationId - GitHub App installation ID
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - Pull request number
 * @returns Comment ID if found, null otherwise
 */
async function findExistingDeploymentComment(
  installationId: number | undefined,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<number | null> {
  try {
    const octokit = await getOctokitForComments(installationId);

    // Fetch all comments on the PR using request() API
    const { data: comments } = await octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100,
      },
    );

    // Find comment with our marker
    const deploymentComment = comments.find(
      (comment: { body?: string; id: number }) =>
        comment.body && comment.body.includes(DEPLOYMENT_COMMENT_MARKER),
    );

    return deploymentComment?.id || null;
  } catch (error) {
    console.error("Error finding existing deployment comment:", error);
    return null;
  }
}

/**
 * Create or update a deployment status comment on a PR.
 *
 * Uses a marker comment to identify existing deployment comments for upsert behavior.
 * This ensures only one deployment comment exists per PR, which is updated on each deploy.
 *
 * @param params - Deployment comment parameters
 * @returns Result of the operation
 */
export async function upsertDeploymentComment(
  params: DeploymentCommentParams,
): Promise<CommentResult> {
  const {
    installationId,
    owner,
    repo,
    prNumber,
    status,
    publicUrl,
    commitSha,
    namespace,
    errorMessage,
  } = params;

  try {
    const octokit = await getOctokitForComments(installationId);

    // Format the comment body
    const body = formatDeploymentComment({
      status,
      publicUrl,
      commitSha,
      namespace,
      errorMessage,
    });

    // Check for existing deployment comment
    const existingCommentId = await findExistingDeploymentComment(
      installationId,
      owner,
      repo,
      prNumber,
    );

    if (existingCommentId) {
      // Update existing comment
      const { data: comment } = await octokit.request(
        "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
        {
          owner,
          repo,
          comment_id: existingCommentId,
          body,
        },
      );

      return { success: true, commentId: comment.id };
    } else {
      // Create new comment
      const { data: comment } = await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo,
          issue_number: prNumber,
          body,
        },
      );

      return { success: true, commentId: comment.id };
    }
  } catch (error) {
    console.error("Error upserting deployment comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete the deployment comment from a PR.
 *
 * Called during PR cleanup to remove the deployment status comment.
 *
 * @param installationId - GitHub App installation ID
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - Pull request number
 * @returns Result of the operation
 */
export async function deleteDeploymentComment(
  installationId: number | undefined,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingCommentId = await findExistingDeploymentComment(
      installationId,
      owner,
      repo,
      prNumber,
    );

    if (!existingCommentId) {
      // No comment to delete - that's fine
      return { success: true };
    }

    const octokit = await getOctokitForComments(installationId);

    await octokit.request(
      "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}",
      {
        owner,
        repo,
        comment_id: existingCommentId,
      },
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting deployment comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
