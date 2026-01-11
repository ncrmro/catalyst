/**
 * @catalyst/vcs-provider
 *
 * Version Control System provider abstraction for multi-provider support.
 *
 * NOTE: Token management functions (storeGitHubTokens, getGitHubTokens, etc.)
 * are NOT exported from this package. They live in web/src/lib/vcs-providers.ts
 * to avoid circular dependencies with @/db.
 */

// 1. Export core types
export type {
  ProviderId,
  ConnectionStatus,
  TokenData,
  AuthenticatedClient,
  Repository,
  FileContent,
  DirectoryEntry,
  PullRequest,
  Review,
  Issue,
  PRComment,
  WebhookEvent,
  Branch,
  VCSProvider,
} from "./types";

// 2. VCS Provider Singleton - The primary entry point
export { VCSProviderSingleton } from "./vcs-provider";
export type { VCSProviderConfig } from "./vcs-provider";

// Export provider classes for explicit registration
export { GitHubProvider } from "./providers/github/provider";

// 3. GitHub Specific Exports (Still needed by the web app for now)
// TODO: Refactor web app to use the Singleton for these operations
export {
  GITHUB_CONFIG,
  getGitHubAccessToken,
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
  // GitHub App management
  getAllInstallations,
} from "./providers/github/client";
export type { EnrichedPullRequest, EnrichedIssue, EnrichedBranch } from "./providers/github/client";
export {
  refreshTokenIfNeeded,
  invalidateTokens,
  areTokensValid,
} from "./providers/github/token-refresh";
export {
  storeGitHubTokens,
  getGitHubTokens,
  deleteGitHubTokens,
} from "./providers/github/token-service";
export {
  exchangeRefreshToken,
  exchangeAuthorizationCode,
  generateAuthorizationUrl,
} from "./providers/github/auth";
export {
  formatDeploymentComment,
  upsertDeploymentComment,
  deleteDeploymentComment,
} from "./providers/github/comments";
