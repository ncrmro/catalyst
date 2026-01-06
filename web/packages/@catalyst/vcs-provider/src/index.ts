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
  WebhookEvent,
  Branch,
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
  fetchGitHubUser,
} from "./providers/github/auth";
export type { GitHubUserProfile } from "./providers/github/auth";
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

/**
 * Create an issue in a repository
 */
export async function createIssue(
  client: AuthenticatedClient,
  owner: string,
  repo: string,
  title: string,
  body?: string,
) {
  const provider = providerRegistry.get(client.providerId);
  if (!provider) {
    throw new Error(`VCS provider '${client.providerId}' not found`);
  }
  return provider.createIssue(client, owner, repo, title, body);
}

/**
 * Create a pull request in a repository
 */
export async function createPullRequest(
  client: AuthenticatedClient,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
) {
  const provider = providerRegistry.get(client.providerId);
  if (!provider) {
    throw new Error(`VCS provider '${client.providerId}' not found`);
  }
  return provider.createPullRequest(client, owner, repo, title, head, base, body);
}

