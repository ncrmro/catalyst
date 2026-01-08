/**
 * VCS Providers Re-export
 *
 * This barrel file re-exports selected members from the @catalyst/vcs-provider package.
 * It provides a clean API for the web app, hiding internal implementation details.
 */

export {
  // Singleton
  VCSProviderSingleton,
  
  // GitHub Config & Types
  GITHUB_CONFIG,
  
  // Auth & Token management (still used in specialized areas)
  getGitHubAccessToken,
  getGitHubTokens,
  storeGitHubTokens,
  deleteGitHubTokens,
  refreshTokenIfNeeded,
  invalidateTokens,
  exchangeRefreshToken,
  exchangeAuthorizationCode,
  generateAuthorizationUrl,
  fetchGitHubUser,
  isGitHubTokenError,
  
  // Specialized fetchers (being refactored to use Singleton)
  fetchPullRequests,
  fetchIssues,
  fetchPullRequestById,
  fetchUserRepositoryPullRequests,
  
  // Comments
  upsertDeploymentComment,
  deleteDeploymentComment,
} from "@catalyst/vcs-provider";

export type {
  // Core Types
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
  
  // GitHub Specific Types
  EnrichedPullRequest,
  EnrichedIssue,
  GitHubTokenResult,
  GitHubUserProfile,
} from "@catalyst/vcs-provider";