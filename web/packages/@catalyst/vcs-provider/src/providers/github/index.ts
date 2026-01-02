/**
 * GitHub Provider
 *
 * Complete GitHub VCS provider implementation.
 */

// Export auth utilities
export {
	exchangeAuthorizationCode,
	exchangeRefreshToken,
	generateAuthorizationUrl,
} from "./auth";
export type { EnrichedIssue, EnrichedPullRequest } from "./client";
// Export client utilities
export {
	determinePRPriority,
	determinePRStatus,
	fetchCIStatus,
	fetchIssues, // Renamed from fetchRealIssues
	fetchPullRequestById,
	fetchPullRequests, // Renamed from fetchRealPullRequests
	fetchUserRepositoryPullRequests,
	GITHUB_CONFIG,
	getAllInstallations,
	getInstallationOctokit,
	getUserOctokit,
	isGitHubTokenError,
} from "./client";
export type {
	CommentResult,
	DeploymentCommentParams,
	PodStatus,
} from "./comments";
// Export PR comment utilities
export {
	deleteDeploymentComment,
	formatDeploymentComment,
	upsertDeploymentComment,
} from "./comments";
// Export the provider class
export { GitHubProvider } from "./provider";

export {
	areTokensValid,
	invalidateTokens,
	refreshTokenIfNeeded,
} from "./token-refresh";
export type { GitHubTokens } from "./token-service";
// Export token management
export {
	deleteGitHubTokens,
	getGitHubTokens,
	storeGitHubTokens,
} from "./token-service";
