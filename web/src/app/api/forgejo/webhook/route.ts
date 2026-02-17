import { NextRequest, NextResponse } from "next/server";
import { FORGEJO_CONFIG } from "@/lib/forgejo-provider";
import {
  upsertPullRequest,
} from "@/actions/pull-requests-db";
import {
  createPreviewDeployment,
  deletePreviewDeploymentOrchestrated,
} from "@/models/preview-environments";
import { db } from "@/db";
import { pullRequestPods, pullRequests, repos } from "@/db/schema";
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
  return \`sha256=\${bufferToHex(signature)}\`;
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
 * Find repository by Forgejo ID and provider
 */
async function findRepoByForejoData(
  repoId: number,
): Promise<{ success: boolean; repo?: typeof repos.\$inferSelect }> {
  try {
    const repoRecord = await db
      .select()
      .from(repos)
      .where(
        and(
          eq(repos.provider, "forgejo"),
          eq(repos.providerId, String(repoId)),
        ),
      )
      .limit(1);

    if (repoRecord.length === 0) {
      return { success: false };
    }

    return { success: true, repo: repoRecord[0] };
  } catch (error) {
    console.error("Error finding Forgejo repository:", error);
    return { success: false };
  }
}

/**
 * Forgejo Webhook Endpoint
 *
 * Handles webhook events from Forgejo instances.
 * This includes push events, pull request events, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-forgejo-signature") || request.headers.get("x-gitea-signature");
    const event = request.headers.get("x-forgejo-event") || request.headers.get("x-gitea-event");
    const delivery = request.headers.get("x-forgejo-delivery") || request.headers.get("x-gitea-delivery");

    const validSignature = await isValidSignature({
      body,
      signature,
      secret: FORGEJO_CONFIG.WEBHOOK_SECRET,
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
      case "push":
        return handlePushEvent(payload);
      case "pull_request":
        return await handlePullRequestEvent(payload);
      default:
        console.log(\`Received unhandled Forgejo event: \${event}\`);
        return NextResponse.json({
          success: true,
          message: \`Event \${event} received but not handled\`,
          delivery_id: delivery,
        });
    }
  } catch (error) {
    console.error("Forgejo webhook processing error:", error);
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
 * Handle push events
 */
function handlePushEvent(payload: {
  repository: { full_name: string };
  commits: Array<{ id: string }>;
  pusher: { login?: string; username?: string };
  ref: string;
}) {
  const { repository, commits, pusher } = payload;

  console.log(\`Push to \${repository.full_name}\`, {
    commits_count: commits.length,
    pusher: pusher.login || pusher.username,
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
async function handlePullRequestEvent(payload: any) {
  const { action, pull_request, repository } = payload;

  console.log(\`Pull request \${action} in \${repository.full_name}\`, {
    pr_number: pull_request.number,
    title: pull_request.title,
    author: pull_request.user.login || pull_request.user.username,
  });

  // Find the repository in our database
  const repoResult = await findRepoByForejoData(repository.id);

  // Create/update pull request record in database
  if (repoResult.success && repoResult.repo) {
    try {
      // Determine status based on draft and state
      let status: "draft" | "ready" | "changes_requested" = "ready";
      if (pull_request.draft) {
        status = "draft";
      }

      // Determine state - Forgejo uses 'open'/'closed', check if merged
      let state: "open" | "closed" | "merged" = pull_request.state;
      if (pull_request.state === "closed" && (pull_request.merged_at || pull_request.merged)) {
        state = "merged";
      }

      const prData = {
        repoId: repoResult.repo.id,
        provider: "forgejo" as const,
        providerPrId: pull_request.id.toString(),
        number: pull_request.number,
        title: pull_request.title,
        description: pull_request.body || undefined,
        state,
        status,
        url: pull_request.html_url,
        authorLogin: pull_request.user.login || pull_request.user.username || "unknown",
        authorAvatarUrl: pull_request.user.avatar_url,
        headBranch: pull_request.head.ref,
        baseBranch: pull_request.base.ref,
        commentsCount: pull_request.comments || 0,
        reviewsCount: 0,
        changedFilesCount: pull_request.changed_files || 0,
        additionsCount: pull_request.additions || 0,
        deletionsCount: pull_request.deletions || 0,
        priority: "medium" as const,
        labels: pull_request.labels?.map((l: any) => l.name) || [],
        assignees: pull_request.assignees?.map((a: any) => a.login || a.username || "unknown") || [],
        reviewers: pull_request.requested_reviewers?.map((r: any) => r.login || r.username || "unknown") || [],
        mergedAt: pull_request.merged_at ? new Date(pull_request.merged_at) : undefined,
        closedAt: pull_request.closed_at ? new Date(pull_request.closed_at) : undefined,
      };

      const dbResult = await upsertPullRequest(prData);
      if (dbResult.success) {
        console.log(\`Pull request \${dbResult.operation}d in database\`, {
          pr_id: dbResult.pullRequest?.id,
          provider_pr_id: pull_request.id,
          number: pull_request.number,
        });
      }
    } catch (error) {
      console.error("Error processing pull request for database:", error);
    }
  }

  // Handle preview environment creation
  if (action === "opened" || action === "synchronize" || action === "reopened") {
    const prRecord = repoResult.success && repoResult.repo
      ? await db.select().from(pullRequests)
          .where(and(
            eq(pullRequests.repoId, repoResult.repo.id),
            eq(pullRequests.providerPrId, pull_request.id.toString()),
          ))
          .limit(1)
          .then((rows) => rows[0])
      : null;

    if (prRecord) {
      const imageUri = \`registry.example.com/\${repository.owner.login || repository.owner.username}/\${repository.name}:pr-\${pull_request.number}-\${pull_request.head.sha.slice(0, 7)}\`;

      createPreviewDeployment({
        pullRequestId: prRecord.id,
        prNumber: pull_request.number,
        branch: pull_request.head.ref,
        commitSha: pull_request.head.sha,
        repoFullName: repository.full_name,
        imageUri,
        installationId: 0,
        owner: repository.owner.login || repository.owner.username || "unknown",
        repoName: repository.name,
      }).catch((err) => {
        console.error(\`Preview deployment failed for PR \${pull_request.number}:\`, err);
      });
    }

    return NextResponse.json({
      success: true,
      message: \`Pull request \${action} processed with preview deployment\`,
      pr_number: pull_request.number,
      commit_sha: pull_request.head.sha,
      preview_deployment: "initiated",
    });
  }

  // Handle PR closure
  if (action === "closed") {
    if (repoResult.success && repoResult.repo) {
      const prRecord = await db.select().from(pullRequests)
        .where(and(
          eq(pullRequests.repoId, repoResult.repo.id),
          eq(pullRequests.providerPrId, pull_request.id.toString()),
        ))
        .limit(1)
        .then((rows) => rows[0]);

      if (prRecord) {
        const pods = await db.select().from(pullRequestPods)
          .where(eq(pullRequestPods.pullRequestId, prRecord.id));

        for (const pod of pods) {
          deletePreviewDeploymentOrchestrated({
            podId: pod.id,
            installationId: 0,
            owner: repository.owner.login || repository.owner.username || "unknown",
            repoName: repository.name,
            prNumber: pull_request.number,
            commitSha: pod.commitSha,
          }).catch((err) => {
            console.error(\`Failed to delete preview pod \${pod.id}:\`, err);
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: \`Pull request \${action} processed\`,
      pr_number: pull_request.number,
      preview_deployment: "cleanup_initiated",
    });
  }

  return NextResponse.json({
    success: true,
    message: \`Pull request \${action} processed\`,
    pr_number: pull_request.number,
  });
}
