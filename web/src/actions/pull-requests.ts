"use server";

/**
 * Server action to fetch pull requests from multiple git providers
 * - GitHub provider: fetches real pull requests from GitHub API using GitHub App tokens
 * - gitfoobar provider: placeholder that returns empty array
 */

import { auth } from "@/auth";
import { PullRequest } from "@/types/reports";
import { getMockPullRequests } from "@/mocks/github";
import { vcs } from "@/lib/vcs";

/**
 * GitHub provider - fetches real pull requests from GitHub API using Singleton
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

  // Singleton handles auth method (PAT vs App) transparently
  // We just need to know for logging/UI purposes
  const isPATAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.GITHUB_ALLOW_PAT_FALLBACK === "true";
  let authMethod: "github-app" | "pat" | "none" = "github-app";

  if (isPATAllowed && process.env.GITHUB_PAT) {
    authMethod = "pat";
  }

  try {
    const scopedVcs = vcs.getScoped(session.user.id);

    // Get user's repositories
    const repos = await scopedVcs.repos.listUser();

    // Fetch pull requests from each repository in parallel
    const prPromises = repos.map(async (repo) => {
      try {
        const prs = await scopedVcs.pullRequests.list(repo.owner, repo.name, {
          state: "open",
        });
        return prs.map((pr) => ({
          id: parseInt(pr.id),
          title: pr.title,
          number: pr.number,
          author: pr.author,
          author_avatar: pr.authorAvatarUrl || "",
          repository: repo.name,
          url: pr.htmlUrl,
          created_at: pr.createdAt.toISOString(),
          updated_at: pr.updatedAt.toISOString(),
          comments_count: 0, // Singleton doesn't return this yet
          priority: "medium" as const, // Singleton doesn't return this yet
          status: pr.draft ? ("draft" as const) : ("ready" as const),
        }));
      } catch (error) {
        console.warn(`Could not fetch PRs for ${repo.fullName}:`, error);
        return [];
      }
    });

    const prResults = await Promise.all(prPromises);
    const pullRequests = prResults.flat();

    return { pullRequests, authMethod };
  } catch (error) {
    console.error("Error fetching GitHub pull requests via Singleton:", error);
    return { pullRequests: [], authMethod: "none" };
  }
}

/**
 * gitfoobar provider - placeholder provider that returns empty array
 */
async function fetchGitFoobarPullRequests(): Promise<PullRequest[]> {
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
  // Check if we should return mocked data
  const mocked = process.env.MOCKED === "1";

  if (process.env.GITHUB_REPOS_MODE === "mocked" || mocked) {
    return {
      pullRequests: getMockPullRequests(),
      hasGitHubToken: true,
      authMethod: "github-app" as const,
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  try {
    // Check connection via Singleton
    const scopedVcs = vcs.getScoped(session.user.id);
    const connection = await scopedVcs.checkConnection();

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
      hasGitHubToken: connection.connected,
      authMethod: githubResult.authMethod,
    };
  } catch (error) {
    console.error("Error fetching user pull requests:", error);
    return {
      pullRequests: [],
      hasGitHubToken: false,
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
 */
export async function fetchPullRequestsFromRepos(
  repositories: string[],
): Promise<PullRequest[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  const scopedVcs = vcs.getScoped(session.user.id);

  // Fetch from each specified repository in parallel
  const prPromises = repositories.map(async (repoFullName) => {
    try {
      const [owner, repoName] = repoFullName.split("/");
      if (!owner || !repoName) return [];

      const prs = await scopedVcs.pullRequests.list(owner, repoName, {
        state: "open",
      });
      return prs.map((pr) => ({
        id: parseInt(pr.id),
        title: pr.title,
        number: pr.number,
        author: pr.author,
        author_avatar: pr.authorAvatarUrl || "",
        repository: repoName,
        url: pr.htmlUrl,
        created_at: pr.createdAt.toISOString(),
        updated_at: pr.updatedAt.toISOString(),
        comments_count: 0,
        priority: "medium" as const,
        status: pr.draft ? ("draft" as const) : ("ready" as const),
      }));
    } catch (error) {
      console.warn(`Could not fetch PRs for ${repoFullName}:`, error);
      return [];
    }
  });

  const results = await Promise.all(prPromises);
  return results.flat();
}
