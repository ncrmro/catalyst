/**
 * GitHub Client
 *
 * Core GitHub client functionality, configuration, and API utilities.
 */

import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Centralized GitHub environment variables configuration
 * All GitHub-related environment variables should be accessed through this module
 */

// Build the configuration object with validation at module load time
const buildGitHubConfig = () => {
  const config = {
    // GitHub App credentials for app-level authentication
    // From GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY
    APP_ID: process.env.GITHUB_APP_ID || (isNextJsBuild ? "" : undefined)!,
    APP_PRIVATE_KEY:
      process.env.GITHUB_APP_PRIVATE_KEY || (isNextJsBuild ? "" : undefined)!,

    // GitHub App OAuth credentials for user authentication flow
    // Used by both Auth.js and direct GitHub App OAuth flows
    // From GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET
    APP_CLIENT_ID:
      process.env.GITHUB_APP_CLIENT_ID || (isNextJsBuild ? "" : undefined)!,
    APP_CLIENT_SECRET:
      process.env.GITHUB_APP_CLIENT_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Webhook secret for validating GitHub webhook payloads
    // From GITHUB_WEBHOOK_SECRET
    WEBHOOK_SECRET:
      process.env.GITHUB_WEBHOOK_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Personal Access Token for fallback authentication (optional)
    // From GITHUB_PAT or GITHUB_TOKEN
    PAT: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN,

    // GitHub Container Registry PAT for Docker operations (optional)
    // From GITHUB_GHCR_PAT
    GHCR_PAT: process.env.GITHUB_GHCR_PAT,

    // MCP API key for GitHub MCP integration (optional)
    // From GITHUB_MCP_API_KEY
    MCP_API_KEY: process.env.GITHUB_MCP_API_KEY,

    // Repository mode configuration (optional)
    // From GITHUB_REPOS_MODE
    REPOS_MODE: process.env.GITHUB_REPOS_MODE,

    // Allow PAT fallback in production (optional)
    // From GITHUB_ALLOW_PAT_FALLBACK
    ALLOW_PAT_FALLBACK: process.env.GITHUB_ALLOW_PAT_FALLBACK === "true",

    // Disable GitHub App startup checks (optional)
    // From GITHUB_DISABLE_APP_CHECKS
    DISABLE_APP_CHECKS: process.env.GITHUB_DISABLE_APP_CHECKS === "true",
  } as const;

  // Validate required fields only at runtime, not during build
  // If GITHUB_DISABLE_APP_CHECKS is true, skip validation.
  if (!isNextJsBuild && !config.DISABLE_APP_CHECKS) {
    const missingVars: string[] = [];

    if (!config.APP_ID) missingVars.push("GITHUB_APP_ID");
    if (!config.APP_PRIVATE_KEY) missingVars.push("GITHUB_APP_PRIVATE_KEY");
    if (!config.APP_CLIENT_ID) missingVars.push("GITHUB_APP_CLIENT_ID");
    if (!config.APP_CLIENT_SECRET) missingVars.push("GITHUB_APP_CLIENT_SECRET");
    if (!config.WEBHOOK_SECRET) missingVars.push("GITHUB_WEBHOOK_SECRET");

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required GitHub environment variables: ${missingVars.join(", ")}. ` +
          "Please check your .env file or environment configuration.",
      );
    }
  }

  return config;
};

// Export the validated configuration object
// This will throw on module load if required variables are missing
export const GITHUB_CONFIG = buildGitHubConfig();

// Create GitHub App instance singleton
// During build phase, use stub values to prevent initialization errors
const githubApp = isNextJsBuild
  ? new App({
      appId: "stub-app-id",
      privateKey: `-----BEGIN RSA PRIVATE KEY-----STUB-----END RSA PRIVATE KEY-----`,
    })
  : new App({
      appId: GITHUB_CONFIG.APP_ID,
      privateKey: GITHUB_CONFIG.APP_PRIVATE_KEY,
    });

/**
 * Get all installations for the GitHub App
 * This requires the app to be authenticated as the GitHub App itself
 */
export async function getAllInstallations() {
  try {
    // Use the app's octokit instance for app-level operations
    const { data: installations } = await githubApp.octokit.request(
      "GET /app/installations",
    );
    return installations;
  } catch (error) {
    console.error("Failed to fetch GitHub App installations:", error);
    throw new Error("Failed to fetch GitHub App installations");
  }
}

/**
 * Get an installation-specific Octokit instance
 * This is useful for operations on specific installations
 */
export async function getInstallationOctokit(installationId: number) {
  try {
    return await githubApp.getInstallationOctokit(installationId);
  } catch (error) {
    console.error(
      `Failed to get Octokit for installation ${installationId}:`,
      error,
    );
    throw new Error(`Failed to get Octokit for installation ${installationId}`);
  }
}

/**
 * Get an Octokit instance with authentication fallback and session management
 * Priority: PAT (if allowed) → GitHub App User Token (with auto-refresh) → Error
 * @param userId User ID for GitHub App token refresh
 * @returns Authenticated Octokit instance
 */
export async function getUserOctokit(userId: string): Promise<Octokit> {
  // Check if PAT is allowed in current environment
  const isPATAllowed =
    process.env.NODE_ENV !== "production" || GITHUB_CONFIG.ALLOW_PAT_FALLBACK;

  // First priority: Use PAT if allowed and available
  if (isPATAllowed && GITHUB_CONFIG.PAT) {
    return new Octokit({
      auth: GITHUB_CONFIG.PAT,
    });
  }

  // Second priority: Use GitHub App user tokens with auto-refresh
  const { refreshTokenIfNeeded } = await import("./token-refresh");
  const tokens = await refreshTokenIfNeeded(userId);

  if (tokens?.accessToken) {
    return new Octokit({
      auth: tokens.accessToken,
    });
  }

  // No authentication available
  throw new Error(
    "No GitHub authentication available. Please set GITHUB_PAT or authorize GitHub App.",
  );
}

// Import PullRequest and Issue types - these are internal types for this module
interface PullRequest {
  id: number;
  title: string;
  number: number;
  author: string;
  author_avatar: string;
  repository: string;
  url: string;
  created_at: string;
  updated_at: string;
  comments_count: number;
  priority: "high" | "medium" | "low";
  status: "draft" | "ready" | "changes_requested";
}

interface Issue {
  id: number;
  title: string;
  number: number;
  repository: string;
  url: string;
  created_at: string;
  updated_at: string;
  labels: string[];
  priority: "high" | "medium" | "low";
  effort_estimate: "small" | "medium" | "large";
  type: "bug" | "feature" | "improvement" | "idea";
  state: "open" | "closed";
}

/**
 * Determine PR priority based on labels
 * @param labels Array of label names
 * @returns Priority level
 */
export function determinePRPriority(
  labels: string[],
): "high" | "medium" | "low" {
  if (
    labels.some(
      (label) =>
        label.toLowerCase().includes("urgent") ||
        label.toLowerCase().includes("critical"),
    )
  ) {
    return "high";
  } else if (
    labels.some(
      (label) =>
        label.toLowerCase().includes("minor") ||
        label.toLowerCase().includes("low"),
    )
  ) {
    return "low";
  }
  return "medium";
}

/**
 * Determine PR status based on draft status and reviews
 * @param octokit Authenticated Octokit instance
 * @param owner Repository owner
 * @param repo Repository name
 * @param pr Pull request data from GitHub API
 * @returns Promise of status
 */
export async function determinePRStatus(
  octokit: Octokit,
  owner: string,
  repo: string,
  pr: { draft?: boolean; number: number },
): Promise<"draft" | "ready" | "changes_requested"> {
  if (pr.draft) {
    return "draft";
  }

  try {
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pr.number,
    });

    if (reviews.some((review) => review.state === "CHANGES_REQUESTED")) {
      return "changes_requested";
    }
  } catch (error) {
    console.warn(`Could not fetch reviews for PR ${pr.number}:`, error);
  }

  return "ready";
}

/**
 * Core function to fetch pull requests from specific repositories
 * @param octokit Authenticated Octokit instance
 * @param repositories Array of repository names in format 'owner/repo'
 * @returns Array of pull requests with metadata
 */
export async function fetchPullRequestsFromRepos(
  octokit: Octokit,
  repositories: string[],
): Promise<PullRequest[]> {
  console.log(`Fetching PRs from: ${repositories.join(", ")}`);

  // Test authentication by getting user info
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login} (${user.name || "No name"})`);
    console.log(
      `User type: ${user.type}, Public repos: ${user.public_repos}, Private repos: ${user.total_private_repos || "unknown"}`,
    );
  } catch (error) {
    console.error("GitHub authentication failed:", error);
    return [];
  }

  const allPullRequests: PullRequest[] = [];

  // Fetch pull requests from each specified repository
  for (const repoFullName of repositories) {
    try {
      const [owner, repoName] = repoFullName.split("/");
      if (!owner || !repoName) {
        console.warn(
          `Invalid repository format: ${repoFullName}. Expected format: owner/repo`,
        );
        continue;
      }

      console.log(`Fetching PRs from ${repoFullName}...`);

      // First, try to access the repository to check permissions
      try {
        const { data: repoInfo } = await octokit.rest.repos.get({
          owner,
          repo: repoName,
        });
        console.log(
          `  Repository ${repoFullName} - Private: ${repoInfo.private}, Permissions: ${JSON.stringify(repoInfo.permissions || "unknown")}`,
        );
      } catch (repoError) {
        console.warn(
          `  Cannot access repository ${repoFullName}:`,
          repoError instanceof Error ? repoError.message : repoError,
        );
        // Continue to try fetching PRs anyway
      }

      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo: repoName,
        state: "open",
        per_page: 100,
        sort: "updated",
        direction: "desc",
      });

      console.log(`  Found ${prs.length} PRs in ${repoFullName}`);

      // Include all PRs from this repository
      for (const pr of prs) {
        // Determine priority based on labels (simple heuristic)
        const labels = pr.labels.map((label) =>
          typeof label === "string" ? label : label.name || "",
        );
        const priority = determinePRPriority(labels);

        // Determine status based on review state and draft status
        const status = await determinePRStatus(octokit, owner, repoName, pr);

        allPullRequests.push({
          id: pr.id,
          title: pr.title,
          number: pr.number,
          author: pr.user?.login || "unknown",
          author_avatar: pr.user?.avatar_url || "",
          repository: repoName,
          url: pr.html_url,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          comments_count: 0, // Comments count would need separate API calls for accurate count
          priority,
          status,
        });
      }
    } catch (error) {
      console.warn(
        `Could not fetch pull requests for repository ${repoFullName}:`,
        error,
      );
    }
  }

  return allPullRequests.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

/**
 * Core function to fetch issues from specific repositories
 * @param octokit Authenticated Octokit instance
 * @param repositories Array of repository names in format 'owner/repo'
 * @returns Array of issues with metadata
 */
export async function fetchIssuesFromRepos(
  octokit: Octokit,
  repositories: string[],
): Promise<Issue[]> {
  console.log(`Fetching issues from: ${repositories.join(", ")}`);

  const allIssues: Issue[] = [];

  // Fetch issues from each specified repository
  for (const repoFullName of repositories) {
    try {
      const [owner, repoName] = repoFullName.split("/");
      if (!owner || !repoName) {
        console.warn(
          `Invalid repository format: ${repoFullName}. Expected format: owner/repo`,
        );
        continue;
      }

      console.log(`Fetching issues from ${repoFullName}...`);

      // Fetch both open and closed issues (we can filter later if needed)
      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo: repoName,
        state: "all",
        per_page: 100,
        sort: "updated",
        direction: "desc",
      });

      // Filter out pull requests (GitHub API returns PRs in issues endpoint)
      const actualIssues = issues.filter((issue) => !issue.pull_request);

      console.log(
        `  Found ${actualIssues.length} issues in ${repoFullName} (filtered out ${issues.length - actualIssues.length} PRs)`,
      );

      // Process each issue
      for (const issue of actualIssues) {
        // Determine priority based on labels (simple heuristic)
        const labels = issue.labels.map((label) =>
          typeof label === "string" ? label : label.name || "",
        );
        let priority: "high" | "medium" | "low" = "medium";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("urgent") ||
              label.toLowerCase().includes("critical") ||
              label.toLowerCase().includes("high"),
          )
        ) {
          priority = "high";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("minor") ||
              label.toLowerCase().includes("low"),
          )
        ) {
          priority = "low";
        }

        // Determine effort estimate based on labels
        let effort_estimate: "small" | "medium" | "large" = "medium";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("small") ||
              label.toLowerCase().includes("quick"),
          )
        ) {
          effort_estimate = "small";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("large") ||
              label.toLowerCase().includes("epic"),
          )
        ) {
          effort_estimate = "large";
        }

        // Determine type based on labels
        let type: "bug" | "feature" | "improvement" | "idea" = "improvement";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("bug") ||
              label.toLowerCase().includes("error"),
          )
        ) {
          type = "bug";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("feature") ||
              label.toLowerCase().includes("enhancement"),
          )
        ) {
          type = "feature";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("idea") ||
              label.toLowerCase().includes("discussion"),
          )
        ) {
          type = "idea";
        }

        allIssues.push({
          id: issue.id,
          title: issue.title,
          number: issue.number,
          repository: repoName,
          url: issue.html_url,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          labels: labels,
          priority,
          effort_estimate,
          type,
          state: issue.state as "open" | "closed",
        });
      }
    } catch (error) {
      console.warn(
        `Could not fetch issues for repository ${repoFullName}:`,
        error,
      );
    }
  }

  return allIssues.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

/**
 * Helper to identify GitHub token-related errors
 * @param error The error to check
 * @returns True if the error is token-related
 */
export function isGitHubTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as { status?: number; message?: string };
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    (err?.message?.includes("token") ?? false) ||
    (err?.message?.includes("authentication") ?? false)
  );
}

/**
 * Core function to fetch pull requests from all user repositories (discovery-based)
 * Discovers user repositories and fetches PRs from each one
 * @param octokit Authenticated Octokit instance
 * @returns Array of pull requests with metadata
 */
export async function fetchUserRepositoryPullRequests(
  octokit: Octokit,
): Promise<PullRequest[]> {
  console.log("Fetching PRs from all user repositories...");

  // Test authentication by getting user info
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login} (${user.name || "No name"})`);
    console.log(
      `User type: ${user.type}, Public repos: ${user.public_repos}, Private repos: ${user.total_private_repos || "unknown"}`,
    );
  } catch (error) {
    console.error("GitHub authentication failed:", error);
    return [];
  }

  try {
    // Get user's repositories (both owned and collaborator repos)
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated",
      affiliation: "owner,collaborator",
    });

    const allPullRequests: PullRequest[] = [];

    console.log(`Found ${repos.length} repositories to check for PRs`);

    // Fetch pull requests from each repository
    for (const repo of repos) {
      try {
        const [owner, repoName] = repo.full_name.split("/");
        if (!owner || !repoName) {
          continue;
        }

        const { data: prs } = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          state: "open",
          per_page: 100,
          sort: "updated",
          direction: "desc",
        });

        if (prs.length > 0) {
          console.log(`  Found ${prs.length} PRs in ${repo.full_name}`);
        }

        // Process each PR
        for (const pr of prs) {
          // Determine priority using utility function
          const labels = pr.labels.map((label) =>
            typeof label === "string" ? label : label.name || "",
          );
          const priority = determinePRPriority(labels);

          // Determine status using utility function
          const status = await determinePRStatus(octokit, owner, repoName, pr);

          allPullRequests.push({
            id: pr.id,
            title: pr.title,
            number: pr.number,
            author: pr.user?.login || "unknown",
            author_avatar: pr.user?.avatar_url || "",
            repository: repoName,
            url: pr.html_url,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            comments_count: 0, // Comments count would need separate API calls for accurate count
            priority,
            status,
          });
        }
      } catch (error) {
        console.warn(
          `Could not fetch pull requests for repository ${repo.full_name}:`,
          error,
        );
      }
    }

    console.log(`Total PRs found: ${allPullRequests.length}`);

    return allPullRequests.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  } catch (error) {
    console.error("Error fetching user repositories or pull requests:", error);
    return [];
  }
}
