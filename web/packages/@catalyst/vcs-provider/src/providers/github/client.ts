/**
 * GitHub Client
 *
 * Core GitHub client functionality, configuration, and API utilities.
 */

import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

export interface EnrichedPullRequest {
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
  body?: string; // Add PR body/description
  headBranch?: string; // Source branch name
  headSha?: string; // Head commit SHA
}

export interface EnrichedIssue {
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

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

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
 * Get an Octokit instance for comment operations with PAT fallback.
 *
 * Priority:
 * 1. PAT if available (for local development)
 * 2. Installation Octokit if installationId provided
 * 3. Error if neither available
 *
 * @param installationId - Optional GitHub App installation ID
 * @returns Authenticated Octokit instance
 */
export async function getOctokitForComments(installationId?: number) {
  // Check if PAT is allowed in current environment
  const isPATAllowed =
    process.env.NODE_ENV !== "production" || GITHUB_CONFIG.ALLOW_PAT_FALLBACK;

  // First priority: Use PAT if allowed and available
  if (isPATAllowed && GITHUB_CONFIG.PAT) {
    return new Octokit({
      auth: GITHUB_CONFIG.PAT,
    });
  }

  // Second priority: Use installation Octokit if installationId provided
  if (installationId) {
    return getInstallationOctokit(installationId);
  }

  // No authentication available
  throw new Error(
    "No GitHub authentication available for comments. Set GITHUB_PAT for local development or provide installationId.",
  );
}

/**
 * Token getter function type for dependency injection
 * The web app provides this function to get refreshed tokens
 */
export type TokenGetter = (
  userId: string,
) => Promise<{ accessToken: string } | null>;

/**
 * Registered token getter - set by the web app at initialization
 */
let registeredTokenGetter: TokenGetter | null = null;

/**
 * Register a token getter function.
 * This should be called by the web app during initialization to provide
 * a function that retrieves and refreshes tokens as needed.
 */
export function registerTokenGetter(getter: TokenGetter): void {
  registeredTokenGetter = getter;
}

/**
 * Get an Octokit instance with authentication fallback and session management
 * Priority: PAT (if allowed) → GitHub App User Token (via registered getter) → Error
 * @param userId User ID for GitHub App token retrieval
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

  // Second priority: Use GitHub App user tokens via registered getter
  if (registeredTokenGetter) {
    const tokens = await registeredTokenGetter(userId);
    if (tokens?.accessToken) {
      return new Octokit({
        auth: tokens.accessToken,
      });
    }
  }

  // No authentication available
  throw new Error(
    "No GitHub authentication available. Please set GITHUB_PAT or authorize GitHub App.",
  );
}

/**
 * Result type for getGitHubAccessToken
 * Provides semantic status to distinguish between different failure modes
 */
export type GitHubTokenResult =
  | { token: string; status: "valid" }
  | { token: undefined; status: "no_token" | "expired" };

/**
 * Token status checker function type for dependency injection
 * Used to check if a user has had tokens before (for distinguishing expired vs never-connected)
 */
export type TokenStatusChecker = (
  userId: string,
) => Promise<{ hadTokens: boolean; hasInstallationId: boolean }>;

/**
 * Registered token status checker - set by the web app at initialization
 */
let registeredTokenStatusChecker: TokenStatusChecker | null = null;

/**
 * Register a token status checker function.
 * This should be called by the web app during initialization to provide
 * a function that checks token history for a user.
 */
export function registerTokenStatusChecker(checker: TokenStatusChecker): void {
  registeredTokenStatusChecker = checker;
}

/**
 * Get a GitHub access token for a user with status information.
 *
 * Unlike getUserOctokit() which throws on failure, this returns
 * semantic status for UI decision-making:
 * - "valid": Token is available and ready to use
 * - "expired": User was previously connected but token expired and refresh failed
 * - "no_token": User has never connected their GitHub account
 *
 * Token priority:
 * 1. PAT - for local development when GITHUB_PAT env var is set (non-production only)
 * 2. Database tokens via registered getter - for GitHub App OAuth users
 *
 * @param userId - User ID for token lookup
 * @returns Object with token and status indicating why token may be unavailable
 */
export async function getGitHubAccessToken(
  userId: string,
): Promise<GitHubTokenResult> {
  // Check if PAT is allowed in current environment
  const isPATAllowed =
    process.env.NODE_ENV !== "production" || GITHUB_CONFIG.ALLOW_PAT_FALLBACK;

  // First priority: Use PAT if allowed and available
  if (isPATAllowed && GITHUB_CONFIG.PAT) {
    return { token: GITHUB_CONFIG.PAT, status: "valid" };
  }

  // Second priority: Use GitHub App user tokens via registered getter
  if (registeredTokenGetter) {
    const tokens = await registeredTokenGetter(userId);
    if (tokens?.accessToken) {
      return { token: tokens.accessToken, status: "valid" };
    }
  }

  // No valid token - check if user ever had tokens (to distinguish
  // "never connected" from "was connected but token expired")
  if (registeredTokenStatusChecker) {
    const status = await registeredTokenStatusChecker(userId);
    if (status.hasInstallationId) {
      return { token: undefined, status: "expired" };
    }
  }

  return { token: undefined, status: "no_token" };
}

// Import PullRequest and Issue types - these are internal types for this module
// interface PullRequest {
//   id: number;
//   title: string;
//   number: number;
//   author: string;
//   author_avatar: string;
//   repository: string;
//   url: string;
//   created_at: string;
//   updated_at: string;
//   comments_count: number;
//   priority: "high" | "medium" | "low";
//   status: "draft" | "ready" | "changes_requested";
// }

// interface Issue {
//   id: number;
//   title: string;
//   number: number;
//   repository: string;
//   url: string;
//   created_at: string;
//   updated_at: string;
//   labels: string[];
//   priority: "high" | "medium" | "low";
//   effort_estimate: "small" | "medium" | "large";
//   type: "bug" | "feature" | "improvement" | "idea";
//   state: "open" | "closed";
// }

import type {
  CIStatusSummary,
  CICheck,
  CICheckState,
  CICheckSource,
} from "../../types";

/**
 * Fetch CI status for a pull request
 */
export async function fetchCIStatus(
  userId: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<CIStatusSummary | null> {
  try {
    const octokit = await getUserOctokit(userId);

    // Get PR to get the head SHA
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const headSha = pr.head.sha;

    // Fetch both check runs and commit statuses in parallel
    const [checkRunsResponse, statusesResponse] = await Promise.all([
      octokit.rest.checks
        .listForRef({
          owner,
          repo,
          ref: headSha,
        })
        .catch((error) => {
          console.warn("Could not fetch check runs:", error);
          return null;
        }),
      octokit.rest.repos
        .getCombinedStatusForRef({
          owner,
          repo,
          ref: headSha,
        })
        .catch((error) => {
          console.warn("Could not fetch commit statuses:", error);
          return null;
        }),
    ]);

    const checks: CICheck[] = [];

    // Process check runs (newer GitHub Checks API)
    if (checkRunsResponse) {
      for (const checkRun of checkRunsResponse.data.check_runs) {
        checks.push(normalizeCheckRun(checkRun));
      }
    }

    // Process commit statuses (older Status API)
    if (statusesResponse) {
      for (const status of statusesResponse.data.statuses) {
        checks.push(normalizeCommitStatus(status));
      }
    }

    // Calculate summary
    const passingChecks = checks.filter((c) => c.state === "passing").length;
    const failingChecks = checks.filter((c) => c.state === "failing").length;
    const pendingChecks = checks.filter((c) => c.state === "pending").length;

    // Determine overall state
    let overall: CICheckState = "passing";
    if (failingChecks > 0) {
      overall = "failing";
    } else if (pendingChecks > 0) {
      overall = "pending";
    }

    return {
      overall,
      checks,
      totalChecks: checks.length,
      passingChecks,
      failingChecks,
      pendingChecks,
    };
  } catch (error) {
    console.error(`Error fetching CI status for PR ${prNumber}:`, error);
    return null;
  }
}

/**
 * Normalize a GitHub Check Run to CICheck format
 */
function normalizeCheckRun(checkRun: {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string | null;
  details_url: string | null;
  output: { title: string | null } | null;
  app: { slug?: string } | null;
}): CICheck {
  // Map GitHub check run conclusion and status to our state
  let state: CICheckState = "pending";
  if (checkRun.status === "completed") {
    switch (checkRun.conclusion) {
      case "success":
        state = "passing";
        break;
      case "failure":
        state = "failing";
        break;
      case "cancelled":
      case "timed_out":
        state = "cancelled";
        break;
      case "skipped":
      case "neutral":
        state = "skipped";
        break;
      default:
        // action_required, stale
        state = "failing";
    }
  } else if (
    checkRun.status === "queued" ||
    checkRun.status === "in_progress"
  ) {
    state = "pending";
  }

  // Determine source from check run name or app
  let source: CICheckSource = "external";
  const name = checkRun.name.toLowerCase();
  const appSlug = checkRun.app?.slug?.toLowerCase() || "";

  if (name.includes("github") || appSlug.includes("github")) {
    source = "github-actions";
  } else if (name.includes("cloudflare") || appSlug.includes("cloudflare")) {
    source = "cloudflare";
  } else if (name.includes("vercel") || appSlug.includes("vercel")) {
    source = "vercel";
  } else if (name.includes("catalyst") || appSlug.includes("catalyst")) {
    source = "catalyst";
  }

  const startedAt = checkRun.started_at
    ? new Date(checkRun.started_at)
    : undefined;
  const completedAt = checkRun.completed_at
    ? new Date(checkRun.completed_at)
    : undefined;
  const duration =
    startedAt && completedAt
      ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
      : undefined;

  return {
    id: String(checkRun.id),
    name: checkRun.name,
    state,
    url: checkRun.html_url || checkRun.details_url || undefined,
    description: checkRun.output?.title || undefined,
    context: checkRun.name,
    startedAt,
    completedAt,
    duration,
    source,
  };
}

/**
 * Normalize a GitHub Commit Status to CICheck format
 */
function normalizeCommitStatus(status: {
  id: number;
  context: string;
  state: string;
  description: string | null;
  target_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}): CICheck {
  // Map GitHub status state to our state
  let state: CICheckState;
  switch (status.state) {
    case "success":
      state = "passing";
      break;
    case "failure":
    case "error":
      state = "failing";
      break;
    case "pending":
      state = "pending";
      break;
    default:
      state = "pending";
  }

  // Determine source from context
  let source: CICheckSource = "external";
  const context = status.context.toLowerCase();

  if (context.includes("github") || context.includes("actions")) {
    source = "github-actions";
  } else if (context.includes("cloudflare")) {
    source = "cloudflare";
  } else if (context.includes("vercel")) {
    source = "vercel";
  } else if (context.includes("catalyst")) {
    source = "catalyst";
  }

  return {
    id: String(status.id),
    name: status.context,
    state,
    url: status.target_url || undefined,
    description: status.description || undefined,
    context: status.context,
    startedAt: status.created_at ? new Date(status.created_at) : undefined,
    completedAt: status.updated_at ? new Date(status.updated_at) : undefined,
    source,
  };
}

/**
 * Core function to fetch pull requests from specific repositories
 * @param userId User ID for authentication
 * @param repositories Array of repository full names (e.g., 'owner/repo')
 * @returns Array of pull requests with metadata
 */
export async function fetchPullRequests(
  userId: string,
  repositories: string[],
): Promise<EnrichedPullRequest[]> {
  try {
    const octokit = await getUserOctokit(userId);

    const allPullRequests: EnrichedPullRequest[] = [];
    const addedPrIds = new Set<number>();

    // Deduplicate repositories
    const uniqueRepos = [...new Set(repositories)];

    for (const repoFullName of uniqueRepos) {
      try {
        const [owner, repoName] = repoFullName.split("/");
        if (!owner || !repoName) {
          console.warn(`Invalid repository name format: ${repoFullName}`);
          continue;
        }

        // Use bulk pagination to get all PRs across all pages
        const prs = await octokit.paginate(octokit.rest.pulls.list, {
          owner,
          repo: repoName,
          state: "open",
          per_page: 100,
          sort: "updated",
          direction: "desc",
        });

        // TODO: This creates an N+1 query pattern by fetching reviews for each PR
        // individually. Consider optimizing by either:
        // 1. Removing review status check if not critical for this view
        // 2. Implementing a batch processing approach with rate limit handling
        // 3. Caching review states if this is called frequently
        for (const pr of prs) {
          // Skip if we already added this PR
          if (addedPrIds.has(pr.id)) {
            continue;
          }
          addedPrIds.add(pr.id);

          // Determine priority based on labels (simple heuristic)
          const labels = pr.labels.map((label) =>
            typeof label === "string" ? label : label.name || "",
          );
          let priority: "high" | "medium" | "low" = "medium";
          if (
            labels.some(
              (label) =>
                label.toLowerCase().includes("urgent") ||
                label.toLowerCase().includes("critical"),
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

          // Determine status based on review state and draft status
          let status: "draft" | "ready" | "changes_requested" = "ready";
          if (pr.draft) {
            status = "draft";
          } else {
            // Check for requested changes in reviews (this is a simplified check)
            try {
              const { data: reviews } = await octokit.rest.pulls.listReviews({
                owner,
                repo: repoName,
                pull_number: pr.number,
              });

              if (
                reviews.some((review) => review.state === "CHANGES_REQUESTED")
              ) {
                status = "changes_requested";
              }
            } catch (error) {
              console.warn(
                `Could not fetch reviews for PR ${pr.number}:`,
                error,
              );
            }
          }

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
    return allPullRequests;
  } catch (error) {
    console.error("Error fetching real pull requests:", error);
    return [];
  }
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
): Promise<EnrichedPullRequest[]> {
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

  const allPullRequests: EnrichedPullRequest[] = [];

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
): Promise<EnrichedIssue[]> {
  console.log(`Fetching issues from: ${repositories.join(", ")}`);

  const allIssues: EnrichedIssue[] = [];

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
 * Core function to fetch issues from specific repositories
 * @param userId User ID for authentication
 * @param repositories Array of repository names in format 'owner/repo'
 * @returns Array of issues with metadata
 */
export async function fetchIssues(
  userId: string,
  repositories: string[],
): Promise<EnrichedIssue[]> {
  try {
    const octokit = await getUserOctokit(userId);

    const allIssues: EnrichedIssue[] = [];
    const addedIssueIds = new Set<number>();

    // Deduplicate repositories
    const uniqueRepos = [...new Set(repositories)];

    for (const repoFullName of uniqueRepos) {
      try {
        const [owner, repoName] = repoFullName.split("/");
        if (!owner || !repoName) {
          console.warn(`Invalid repository name format: ${repoFullName}`);
          continue;
        }

        // Use bulk pagination to get all issues across all pages
        const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
          owner,
          repo: repoName,
          state: "open",
          per_page: 100,
          sort: "updated",
          direction: "desc",
          // Only get issues, not pull requests
          filter: "all",
        });

        for (const issue of issues) {
          // Skip pull requests (they show up in issues API)
          if (issue.pull_request) {
            continue;
          }

          // Skip if we already added this issue
          if (addedIssueIds.has(issue.id)) {
            continue;
          }
          addedIssueIds.add(issue.id);

          const labels = issue.labels.map((label) =>
            typeof label === "string" ? label : label.name || "",
          );

          // Determine priority based on labels
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
                label.toLowerCase().includes("defect"),
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
                label.toLowerCase().includes("proposal"),
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
            labels,
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
    return allIssues;
  } catch (error) {
    console.error("Error fetching real issues:", error);
    return [];
  }
}

/**
 * Fetch a single pull request from GitHub API by its number and repository
 * @param userId User ID for authentication
 * @param owner Repository owner
 * @param repoName Repository name
 * @param prNumber Pull Request number
 * @returns PullRequest object or null if not found/error
 */
export async function fetchPullRequestById(
  userId: string,
  owner: string,
  repoName: string,
  prNumber: number,
): Promise<EnrichedPullRequest | null> {
  try {
    const octokit = await getUserOctokit(userId);

    // Fetch PR from GitHub
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    // Fetch reviews to determine status
    let status: "draft" | "ready" | "changes_requested" = "ready";
    if (pr.draft) {
      status = "draft";
    } else {
      try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
          owner,
          repo: repoName,
          pull_number: prNumber,
        });

        if (reviews.some((review) => review.state === "CHANGES_REQUESTED")) {
          status = "changes_requested";
        }
      } catch (error) {
        console.warn(`Could not fetch reviews for PR ${prNumber}:`, error);
      }
    }

    // Determine priority
    const labels = pr.labels.map((label) =>
      typeof label === "string" ? label : label.name || "",
    );
    let priority: "high" | "medium" | "low" = "medium";
    if (
      labels.some(
        (label) =>
          label.toLowerCase().includes("urgent") ||
          label.toLowerCase().includes("critical"),
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

    return {
      id: pr.id,
      title: pr.title,
      number: pr.number,
      author: pr.user?.login || "unknown",
      author_avatar: pr.user?.avatar_url || "",
      repository: repoName,
      url: pr.html_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      comments_count: pr.comments,
      priority,
      status,
      body: pr.body || undefined,
      headBranch: pr.head?.ref,
      headSha: pr.head?.sha,
    };
  } catch (error) {
    console.error(`Error fetching PR ${prNumber}:`, error);
    return null;
  }
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
): Promise<EnrichedPullRequest[]> {
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
    // Use bulk pagination to get all repos across all pages
    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      {
        per_page: 100,
        sort: "updated",
        affiliation: "owner,collaborator",
      },
    );

    const allPullRequests: EnrichedPullRequest[] = [];

    console.log(`Found ${repos.length} repositories to check for PRs`);

    // Fetch pull requests from each repository
    for (const repo of repos) {
      try {
        const [owner, repoName] = repo.full_name.split("/");
        if (!owner || !repoName) {
          continue;
        }

        // Use bulk pagination to get all PRs across all pages
        const prs = await octokit.paginate(octokit.rest.pulls.list, {
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
