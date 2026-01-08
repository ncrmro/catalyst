/**
 * @catalyst/vcs-provider
 *
 * Version Control System provider abstraction for multi-provider support.
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
  isGitHubTokenError,
  determinePRPriority,
  determinePRStatus,
} from "./providers/github/client";

export type {
  EnrichedPullRequest,
  EnrichedIssue,
  GitHubTokenResult,
} from "./providers/github/client";

// Token management (needed for Singleton initialization)
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
  fetchGitHubUser,
} from "./providers/github/auth";

export type { GitHubUserProfile } from "./providers/github/auth";

// Comment management
export {
  formatDeploymentComment,
  upsertDeploymentComment,
  deleteDeploymentComment,
} from "./providers/github/comments";