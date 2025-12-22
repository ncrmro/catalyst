/**
 * GitHub Provider
 *
 * Complete GitHub VCS provider implementation.
 */

// Export the provider class
export { GitHubProvider } from "./provider";

// Export client utilities
export {
  GITHUB_CONFIG,
  getUserOctokit,
  getInstallationOctokit,
  getAllInstallations,
  fetchPullRequestsFromRepos,
  fetchIssuesFromRepos,
  fetchUserRepositoryPullRequests,
  isGitHubTokenError,
  determinePRPriority,
  determinePRStatus,
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
