/**
 * @catalyst/vcs-provider
 *
 * Version Control System provider abstraction for multi-provider support.
 */

// Export all types
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
  Commit,
  WebhookEvent,
  VCSProvider,
} from "./types";

// Export provider registry
export { ProviderRegistry, providerRegistry } from "./provider-registry";

// Re-export GitHub provider
export { GitHubProvider } from "./providers/github";
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
} from "./providers/github/client";
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

// Token encryption utilities (provider-agnostic)
export { encryptToken, decryptToken } from "./token-crypto";
export type { EncryptedToken } from "./token-crypto";

import type { ProviderId, AuthenticatedClient } from "./types";
import { providerRegistry } from "./provider-registry";

/**
 * Get an authenticated VCS client for a user
 *
 * @param userId - The user ID to authenticate
 * @param providerId - Optional provider ID (defaults to the default provider)
 * @returns Authenticated client for the specified provider
 */
export async function getVCSClient(
  userId: string,
  providerId?: ProviderId,
): Promise<AuthenticatedClient> {
  const provider = providerId
    ? providerRegistry.get(providerId)
    : providerRegistry.getDefault();

  if (!provider) {
    throw new Error(`VCS provider '${providerId}' not found`);
  }

  return provider.authenticate(userId);
}

/**
 * Get a VCS provider by ID
 */
export function getProvider(providerId: ProviderId) {
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    throw new Error(`VCS provider '${providerId}' not found`);
  }
  return provider;
}

/**
 * Get all registered VCS providers
 */
export function getAllProviders() {
  return providerRegistry.getAll();
}
