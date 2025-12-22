"use server";

/**
 * Server action to fetch pull requests from multiple git providers
 * - GitHub provider: fetches real pull requests from GitHub API using GitHub App tokens
 * - gitfoobar provider: placeholder that returns empty array
 */

import { auth } from "@/auth";
import { PullRequest } from "@/types/reports";
import { getMockPullRequests } from "@/mocks/github";
import {
  refreshTokenIfNeeded,
  invalidateTokens,
  getUserOctokit,
  fetchPullRequestsFromRepos as coreFetchPullRequestsFromRepos,
  fetchUserRepositoryPullRequests,
  isGitHubTokenError,
  GITHUB_CONFIG,
} from "@/lib/vcs-providers";

/**
 * GitHub provider - fetches real pull requests from GitHub API using GitHub App tokens or PAT
 * Gets user's repositories and then fetches open pull requests from them
 */
async function fetchGitHubPullRequests(): Promise<{
  pullRequests: PullRequest[];
  authMethod: "github-app" | "pat" | "none";
}> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found for fetching pull requests");
  }

  // Determine auth method for logging
  const isPATAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.GITHUB_ALLOW_PAT_FALLBACK === "true";
  let authMethod: "github-app" | "pat" | "none" = "none";

  if (isPATAllowed && GITHUB_CONFIG.PAT) {
    console.log("Using GitHub Personal Access Token for pull requests");
    authMethod = "pat";
  } else {
    authMethod = "github-app";
  }

  try {
    // Get authenticated Octokit instance with session management
    const octokit = await getUserOctokit(session.user.id);

    // Call core function to fetch user repository PRs
    const pullRequests = await fetchUserRepositoryPullRequests(octokit);

    return { pullRequests, authMethod };
  } catch (error) {
    // Handle potential token errors
    if (isGitHubTokenError(error)) {
      console.error("Token error during pull request fetch:", error);
      // Only invalidate tokens if using GitHub App auth (not PAT)
      if (authMethod === "github-app") {
        await invalidateTokens(session.user.id);
      }
    } else {
      console.error("Error fetching GitHub pull requests:", error);
    }
    return { pullRequests: [], authMethod };
  }
}

/**
 * gitfoobar provider - placeholder provider that returns empty array
 * This acts as a placeholder for future git providers
 *
 * DOCUMENTATION: This is a placeholder git provider called "gitfoobar" that
 * always returns an empty array of pull requests. It serves as a template
 * for future git provider integrations and demonstrates the multi-provider
 * architecture of the pull requests system.
 */
async function fetchGitFoobarPullRequests(): Promise<PullRequest[]> {
  // This is a placeholder provider that returns no pull requests
  // In the future, this could be replaced with actual integration to another git provider
  console.log("gitfoobar provider: returning empty pull requests array");
  return [];
}

export interface PullRequestsResult {
  pullRequests: PullRequest[];
  hasGitHubToken: boolean;
  authMethod: "github-app" | "pat" | "none";
}

/**
 * Fetch pull requests from all configured providers
 * Combines results from GitHub and gitfoobar providers
 */
export async function fetchUserPullRequestsWithTokenStatus(): Promise<PullRequestsResult> {
  // Check if we should return mocked data (using same env var as GitHub repos)
  const mocked = process.env.MOCKED === "1";

  console.log(
    "Environment check - MOCKED:",
    mocked,
    "GITHUB_REPOS_MODE:",
    GITHUB_CONFIG.REPOS_MODE,
  );

  if (GITHUB_CONFIG.REPOS_MODE === "mocked" || mocked) {
    console.log("Returning mocked pull requests data");
    return {
      pullRequests: getMockPullRequests(),
      hasGitHubToken: true, // Assume we have token in mocked mode
      authMethod: "github-app" as const,
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  // Check for PAT first (if allowed), then GitHub App tokens
  const isPATAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.GITHUB_ALLOW_PAT_FALLBACK === "true";
  const hasGitHubToken =
    (isPATAllowed && !!GITHUB_CONFIG.PAT) ||
    !!(await refreshTokenIfNeeded(session.user.id));

  try {
    // Fetch from all providers in parallel
    const [githubResult, gitfoobarPrs] = await Promise.all([
      fetchGitHubPullRequests(),
      fetchGitFoobarPullRequests(),
    ]);

    // Combine all pull requests and sort by updated date (newest first)
    const allPullRequests = [...githubResult.pullRequests, ...gitfoobarPrs];

    return {
      pullRequests: allPullRequests.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
      hasGitHubToken,
      authMethod: githubResult.authMethod,
    };
  } catch (error) {
    console.error("Error fetching user pull requests:", error);
    return {
      pullRequests: [],
      hasGitHubToken,
      authMethod: "none" as const,
    };
  }
}

export async function fetchUserPullRequests(): Promise<PullRequest[]> {
  const result = await fetchUserPullRequestsWithTokenStatus();
  return result.pullRequests;
}

/**
 * Fetch pull requests from specific repositories using session-based authentication
 * Uses GitHub App user tokens from database with PAT fallback
 */
export async function fetchPullRequestsFromRepos(
  repositories: string[],
): Promise<PullRequest[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  // Get authenticated Octokit instance with session management
  const octokit = await getUserOctokit(session.user.id);

  // Call core function with authenticated instance
  return await coreFetchPullRequestsFromRepos(octokit, repositories);
}
