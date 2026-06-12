/**
 * GitHub Provider
 *
 * Complete GitHub VCS provider implementation.
 *
 * NOTE: Token management functions (storeGitHubTokens, getGitHubTokens, etc.)
 * are NOT exported from this package. They live in web/src/lib/vcs-providers.ts
 * to avoid circular dependencies with @/db.
 */

// Export the provider class
export { GitHubProvider } from "./provider";

// Export client utilities
export {
  GITHUB_CONFIG,
  getUserOctokit,
  getInstallationOctokit,
  getAllInstallations,
  fetchPullRequests,
  fetchIssues,
  fetchPullRequestById,
  fetchCIStatus,
  fetchUserRepositoryPullRequests,
  isGitHubTokenError,
  determinePRPriority,
  determinePRStatus,
  // Token getter registration for dependency injection
  registerTokenGetter,
  registerTokenStatusChecker,
} from "./client";
export type {
  EnrichedPullRequest,
  EnrichedIssue,
  GitHubTokenResult,
  TokenGetter,
  TokenStatusChecker,
} from "./client";

// Export PR comment utilities
export {
  formatDeploymentComment,
  upsertDeploymentComment,
  deleteDeploymentComment,
} from "./comments";
export type {
  PodStatus,
  DeploymentCommentParams,
  CommentResult,
} from "./comments";
