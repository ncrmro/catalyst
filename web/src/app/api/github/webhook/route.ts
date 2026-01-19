import { NextRequest, NextResponse } from "next/server";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";
import {
  upsertPullRequest,
  findRepoByGitHubData,
} from "@/actions/pull-requests-db";
import {
  createPreviewDeployment,
  deletePreviewDeploymentOrchestrated,
} from "@/models/preview-environments";
import { db } from "@/db";
import { githubUserTokens, pullRequestPods, pullRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x: number) =>
      x.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function createHmacSha256(
  secret: string,
  payload: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return `sha256=${bufferToHex(signature)}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isValidSignature({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string | null;
  secret: string;
}): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const expectedSignature = await createHmacSha256(secret, body);
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * GitHub App Webhook Endpoint
 *
 * Handles webhook events from GitHub for the GitHub App.
 * This includes installation events, push events, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const delivery = request.headers.get("x-github-delivery");

    const validSignature = await isValidSignature({
      body,
      signature,
      secret: GITHUB_CONFIG.WEBHOOK_SECRET,
    });

    if (!validSignature) {
      return NextResponse.json(
        { error: "Invalid or missing signature" },
        { status: 401 },
      );
    }

    const payload = JSON.parse(body);

    // Handle different webhook events
    switch (event) {
      case "installation":
        return await handleInstallationEvent(payload);
      case "installation_repositories":
        return handleInstallationRepositoriesEvent(payload);
      case "push":
        return handlePushEvent(payload);
      case "pull_request":
        return await handlePullRequestEvent(payload);
      default:
        console.log(`Received unhandled event: ${event}`);
        return NextResponse.json({
          success: true,
          message: `Event ${event} received but not handled`,
          delivery_id: delivery,
        });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Handle GitHub App installation events
 *
 * When an installation is deleted, clear the installation_id from
 * github_user_tokens so the banner prompts users to reinstall.
 */
async function handleInstallationEvent(payload: {
  action: string;
  installation: {
    id: number;
    account: { login: string };
    permissions: Record<string, string>;
  };
  sender: { login: string };
}) {
  const { action, installation, sender } = payload;

  console.log(`Installation ${action} by ${sender.login}`, {
    installation_id: installation.id,
    account: installation.account.login,
    permissions: installation.permissions,
  });

  // When app is uninstalled, clear the installation_id from user tokens
  if (action === "deleted") {
    const result = await db
      .update(githubUserTokens)
      .set({ installationId: null, updatedAt: new Date() })
      .where(eq(githubUserTokens.installationId, String(installation.id)))
      .returning({ userId: githubUserTokens.userId });

    console.log(`Cleared installation_id for ${result.length} user(s)`, {
      installation_id: installation.id,
      affected_users: result.map((r) => r.userId),
    });
  }

  return NextResponse.json({
    success: true,
    message: `Installation ${action} processed`,
    installation_id: installation.id,
  });
}

/**
 * Handle installation repositories events
 */
function handleInstallationRepositoriesEvent(payload: {
  action: string;
  installation: { id: number };
  repositories_added?: Array<{ name: string }>;
  repositories_removed?: Array<{ name: string }>;
}) {
  const { action, installation, repositories_added, repositories_removed } =
    payload;

  console.log(`Installation repositories ${action}`, {
    installation_id: installation.id,
    added: repositories_added?.length || 0,
    removed: repositories_removed?.length || 0,
  });

  return NextResponse.json({
    success: true,
    message: `Installation repositories ${action} processed`,
  });
}

/**
 * Handle push events
 */
function handlePushEvent(payload: {
  repository: { full_name: string };
  commits: Array<{ id: string }>;
  pusher: { name: string };
  ref: string;
}) {
  const { repository, commits, pusher } = payload;

  console.log(`Push to ${repository.full_name}`, {
    commits_count: commits.length,
    pusher: pusher.name,
    ref: payload.ref,
  });

  return NextResponse.json({
    success: true,
    message: "Push event processed",
    commits_processed: commits.length,
  });
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: {
  action: string;
  installation: { id: number };
  pull_request: {
    id: number;
    number: number;
    title: string;
    body?: string;
    state: "open" | "closed";
    draft: boolean;
    html_url: string;
    user: {
      login: string;
      avatar_url?: string;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
    comments: number;
    changed_files?: number;
    additions?: number;
    deletions?: number;
    labels?: Array<{ name: string }>;
    assignees?: Array<{ login: string }>;
    requested_reviewers?: Array<{ login: string }>;
    merged_at?: string;
    closed_at?: string;
    created_at: string;
    updated_at: string;
  };
  repository: {
    id: number;
    full_name: string;
    owner: { login: string };
    name: string;
  };
}) {
  const { action, installation, pull_request, repository } = payload;

  console.log(`Pull request ${action} in ${repository.full_name}`, {
    pr_number: pull_request.number,
    title: pull_request.title,
    author: pull_request.user.login,
  });

  // Find the repository in our database
  const repoResult = await findRepoByGitHubData(repository.id);

  // Create/update pull request record in database
  if (repoResult.success && repoResult.repo) {
    try {
      // Determine status based on draft and state
      let status: "draft" | "ready" | "changes_requested" = "ready";
      if (pull_request.draft) {
        status = "draft";
      }
      // Note: We would need to check reviews to determine if changes are requested
      // For now, we'll use a simple heuristic based on the action

      // Determine state - GitHub uses 'open'/'closed', we need to check if it was merged
      let state: "open" | "closed" | "merged" = pull_request.state;
      if (pull_request.state === "closed" && pull_request.merged_at) {
        state = "merged";
      }

      const prData = {
        repoId: repoResult.repo.id,
        provider: "github",
        providerPrId: pull_request.id.toString(),
        number: pull_request.number,
        title: pull_request.title,
        description: pull_request.body || undefined,
        state,
        status,
        url: pull_request.html_url,
        authorLogin: pull_request.user.login,
        authorAvatarUrl: pull_request.user.avatar_url,
        headBranch: pull_request.head.ref,
        baseBranch: pull_request.base.ref,
        commentsCount: pull_request.comments || 0,
        reviewsCount: 0, // GitHub webhook doesn't provide review count directly
        changedFilesCount: pull_request.changed_files || 0,
        additionsCount: pull_request.additions || 0,
        deletionsCount: pull_request.deletions || 0,
        priority: "medium" as const, // Default priority for webhook PRs
        labels: pull_request.labels?.map((l) => l.name) || [],
        assignees: pull_request.assignees?.map((a) => a.login) || [],
        reviewers: pull_request.requested_reviewers?.map((r) => r.login) || [],
        mergedAt: pull_request.merged_at
          ? new Date(pull_request.merged_at)
          : undefined,
        closedAt: pull_request.closed_at
          ? new Date(pull_request.closed_at)
          : undefined,
      };

      const dbResult = await upsertPullRequest(prData);
      if (dbResult.success) {
        console.log(`Pull request ${dbResult.operation}d in database:`, {
          pr_id: dbResult.pullRequest?.id,
          provider_pr_id: pull_request.id,
          number: pull_request.number,
        });
      } else {
        console.error(
          `Failed to ${dbResult.operation} pull request in database:`,
          dbResult.error,
        );
      }
    } catch (error) {
      console.error("Error processing pull request for database:", error);
    }
  } else {
    console.warn(
      `Repository with GitHub ID ${repository.id} not found in database. Skipping PR database operation.`,
    );
  }

  // Handle preview environment creation for opened, synchronize, and reopened actions
  if (
    action === "opened" ||
    action === "synchronize" ||
    action === "reopened"
  ) {
    // Get the PR record from database (should have been created/updated above)
    const prRecord =
      repoResult.success && repoResult.repo
        ? await db
            .select()
            .from(pullRequests)
            .where(
              and(
                eq(pullRequests.repoId, repoResult.repo.id),
                eq(pullRequests.providerPrId, pull_request.id.toString()),
              ),
            )
            .limit(1)
            .then((rows) => rows[0])
        : null;

    if (prRecord) {
      // Generate image URI based on PR info
      const imageUri = `ghcr.io/${repository.owner.login}/${repository.name}:pr-${pull_request.number}-${pull_request.head.sha.slice(0, 7)}`;

      // Create preview deployment (fire-and-forget for webhook responsiveness)
      createPreviewDeployment({
        pullRequestId: prRecord.id,
        prNumber: pull_request.number,
        branch: pull_request.head.ref,
        commitSha: pull_request.head.sha,
        repoFullName: repository.full_name,
        imageUri,
        installationId: installation.id,
        owner: repository.owner.login,
        repoName: repository.name,
      }).catch((err) => {
        console.error(
          `Preview deployment failed for PR ${pull_request.number}:`,
          err,
        );
      });

      console.log(
        `Preview deployment initiated for PR ${pull_request.number} (${action})`,
      );
    } else {
      console.warn(
        `Cannot create preview deployment: PR record not found for ${repository.full_name}#${pull_request.number}`,
      );
    }

    // For all actions (opened, synchronize, reopened), just return success (deployment is async)
    return NextResponse.json({
      success: true,
      message: `Pull request ${action} processed with preview deployment`,
      pr_number: pull_request.number,
      commit_sha: pull_request.head.sha,
      preview_deployment: "initiated",
    });
  }

  // Delete namespace and preview deployment when PR is closed
  if (action === "closed") {
    try {
      // Clean up preview deployment pods from database
      if (repoResult.success && repoResult.repo) {
        const prRecord = await db
          .select()
          .from(pullRequests)
          .where(
            and(
              eq(pullRequests.repoId, repoResult.repo.id),
              eq(pullRequests.providerPrId, pull_request.id.toString()),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (prRecord) {
          // Get all pods for this PR and delete them
          const pods = await db
            .select()
            .from(pullRequestPods)
            .where(eq(pullRequestPods.pullRequestId, prRecord.id));

          for (const pod of pods) {
            deletePreviewDeploymentOrchestrated({
              podId: pod.id,
              installationId: installation.id,
              owner: repository.owner.login,
              repoName: repository.name,
              prNumber: pull_request.number,
              commitSha: pod.commitSha,
            }).catch((err) => {
              console.error(`Failed to delete preview pod ${pod.id}:`, err);
            });
          }

          console.log(
            `Preview deployment cleanup initiated for PR ${pull_request.number} (${pods.length} pods)`,
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: `Pull request ${action} processed`,
        pr_number: pull_request.number,
        preview_deployment: "cleanup_initiated",
      });
    } catch (error) {
      console.error(
        `Error in PR closed handler for PR ${pull_request.number}:`,
        error,
      );
      return NextResponse.json({
        success: true,
        message: `Pull request ${action} processed but cleanup had errors`,
        pr_number: pull_request.number,
        cleanup_error:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Pull request ${action} processed`,
    pr_number: pull_request.number,
  });
}
