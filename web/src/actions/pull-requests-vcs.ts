"use server";

/**
 * Server actions for fetching pull request data from VCS providers
 * Part of spec 009-projects - US2: View Current Work (PRs)
 */

import { auth } from "@/auth";
import { providerRegistry } from "@/lib/vcs-providers";
import { fetchProjectBySlug } from "@/actions/projects";
import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { PullRequest } from "@catalyst/vcs-provider";

/**
 * Extended PR type with preview environment information
 */
export interface PullRequestWithPreview extends PullRequest {
  repository: string; // repo name only
  repositoryFullName: string; // owner/repo
  previewEnvironmentId?: string;
  previewUrl?: string;
  previewStatus?: "pending" | "deploying" | "running" | "failed" | "deleted";
}

/**
 * Get a single pull request by number from a project's repository
 * T018: getPullRequest action for single PR detail
 */
export async function getPullRequest(
  projectSlug: string,
  prNumber: number,
): Promise<PullRequestWithPreview | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[getPullRequest] Not authenticated");
      return null;
    }

    const project = await fetchProjectBySlug(projectSlug);
    if (!project) {
      console.log("[getPullRequest] Project not found:", projectSlug);
      return null;
    }

    const repo = project.repositories[0]?.repo;
    if (!repo) {
      console.log("[getPullRequest] No repository found for project");
      return null;
    }

    const [owner, repoName] = repo.fullName.split("/");
    if (!owner || !repoName) {
      console.log("[getPullRequest] Invalid repository name:", repo.fullName);
      return null;
    }

    // Fetch PR from VCS provider
    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);
    const pr = await provider.getPullRequest(client, owner, repoName, prNumber);

    // Enrich with preview environment data
    return await enrichPRWithPreviewEnv(pr, repoName, repo.fullName);
  } catch (error) {
    console.error("[getPullRequest] Error:", error);
    return null;
  }
}

/**
 * Get all pull requests for a project
 * Uses existing fetchProjectPullRequests but enriches with preview env data
 * T019: Implement preview environment linking
 */
export async function getProjectPullRequests(
  projectSlug: string,
  state: "open" | "closed" | "all" = "open",
): Promise<PullRequestWithPreview[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[getProjectPullRequests] Not authenticated");
      return [];
    }

    const project = await fetchProjectBySlug(projectSlug);
    if (!project) {
      console.log("[getProjectPullRequests] Project not found:", projectSlug);
      return [];
    }

    const repo = project.repositories[0]?.repo;
    if (!repo) {
      console.log("[getProjectPullRequests] No repository found for project");
      return [];
    }

    const [owner, repoName] = repo.fullName.split("/");
    if (!owner || !repoName) {
      console.log(
        "[getProjectPullRequests] Invalid repository name:",
        repo.fullName,
      );
      return [];
    }

    // Fetch PRs from VCS provider
    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);
    const prs = await provider.listPullRequests(client, owner, repoName, {
      state,
    });

    // Enrich all PRs with preview environment data
    const enrichedPRs = await Promise.all(
      prs.map((pr) => enrichPRWithPreviewEnv(pr, repoName, repo.fullName)),
    );

    return enrichedPRs;
  } catch (error) {
    console.error("[getProjectPullRequests] Error:", error);
    return [];
  }
}

/**
 * Helper function to enrich a PR with preview environment data
 * T019: Link PRs to preview environments
 */
async function enrichPRWithPreviewEnv(
  pr: PullRequest,
  repoName: string,
  repoFullName: string,
): Promise<PullRequestWithPreview> {
  try {
    // Query pullRequestPods table for matching PR
    const pods = await db
      .select()
      .from(pullRequestPods)
      .where(
        and(
          eq(pullRequestPods.pullRequestNumber, pr.number),
          // Match by repository name (stored as repoName in pullRequestPods)
          eq(pullRequestPods.repoName, repoName),
        ),
      )
      .limit(1);

    const pod = pods[0];

    if (pod) {
      return {
        ...pr,
        repository: repoName,
        repositoryFullName: repoFullName,
        previewEnvironmentId: pod.id,
        previewUrl: pod.publicUrl || undefined,
        previewStatus: pod.status as
          | "pending"
          | "deploying"
          | "running"
          | "failed"
          | "deleted",
      };
    }

    return {
      ...pr,
      repository: repoName,
      repositoryFullName: repoFullName,
    };
  } catch (error) {
    console.error("[enrichPRWithPreviewEnv] Error:", error);
    return {
      ...pr,
      repository: repoName,
      repositoryFullName: repoFullName,
    };
  }
}
