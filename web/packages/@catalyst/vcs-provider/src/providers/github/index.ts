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
  fetchRecentBranches,
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
export type {
  EnrichedPullRequest,
  EnrichedIssue,
  EnrichedBranch,
} from "./client";

// Export auth utilities
export {
  exchangeRefreshToken,
  exchangeAuthorizationCode,
  generateAuthorizationUrl,
} from "./auth";

// Export token management
export {
  storeGitHubTokens,
  getGitHubTokens,
  deleteGitHubTokens,
} from "./token-service";
export type { GitHubTokens } from "./token-service";

export {
  refreshTokenIfNeeded,
  invalidateTokens,
  areTokensValid,
} from "./token-refresh";

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
