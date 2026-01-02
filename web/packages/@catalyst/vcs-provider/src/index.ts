/**
 * @catalyst/vcs-provider
 *
 * Version Control System provider abstraction for multi-provider support.
 */

// Export provider registry
export { ProviderRegistry, providerRegistry } from "./provider-registry";
// Re-export GitHub provider
export { GitHubProvider } from "./providers/github";
export {
	exchangeAuthorizationCode,
	exchangeRefreshToken,
	generateAuthorizationUrl,
} from "./providers/github/auth";
export type {
	EnrichedIssue,
	EnrichedPullRequest,
} from "./providers/github/client";
export {
	determinePRPriority,
	determinePRStatus,
	fetchCIStatus,
	fetchIssues,
	fetchPullRequestById,
	fetchPullRequests,
	fetchUserRepositoryPullRequests,
	GITHUB_CONFIG,
	getAllInstallations,
	getInstallationOctokit,
	getUserOctokit,
	isGitHubTokenError,
} from "./providers/github/client";
export {
	deleteDeploymentComment,
	formatDeploymentComment,
	upsertDeploymentComment,
} from "./providers/github/comments";
export {
	areTokensValid,
	invalidateTokens,
	refreshTokenIfNeeded,
} from "./providers/github/token-refresh";
export {
	deleteGitHubTokens,
	getGitHubTokens,
	storeGitHubTokens,
} from "./providers/github/token-service";
export type { EncryptedToken } from "./token-crypto";

// Token encryption utilities (provider-agnostic)
export { decryptToken, encryptToken } from "./token-crypto";
// Export all types
export type {
	AuthenticatedClient,
	Branch,
	ConnectionStatus,
	DirectoryEntry,
	FileContent,
	Issue,
	PRComment,
	ProviderId,
	PullRequest,
	Repository,
	Review,
	TokenData,
	VCSProvider,
	WebhookEvent,
} from "./types";

import { providerRegistry } from "./provider-registry";
import type { AuthenticatedClient, ProviderId } from "./types";

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
