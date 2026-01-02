/**
 * GitHub Token Refresh
 *
 * Automatic token refresh logic for GitHub App user tokens.
 */

import { exchangeRefreshToken } from "./auth";
import {
	deleteGitHubTokens,
	type GitHubTokens,
	getGitHubTokens,
	storeGitHubTokens,
} from "./token-service";

// Buffer time (5 minutes) before expiration to refresh token
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check if token needs refresh and refresh if needed
 * @param userId The user ID to check tokens for
 * @returns Valid tokens or null if re-authorization is needed
 */
export async function refreshTokenIfNeeded(
	userId: string,
): Promise<GitHubTokens | null> {
	// Get current tokens
	const tokens = await getGitHubTokens(userId);

	if (!tokens) {
		return null;
	}

	// Check if token is about to expire (within buffer time)
	const now = new Date();
	const expirationWithBuffer = new Date(
		tokens.expiresAt.getTime() - EXPIRATION_BUFFER_MS,
	);

	if (now > expirationWithBuffer) {
		try {
			// Token is expiring soon, refresh it
			console.log(
				`Refreshing token for user ${userId} that expires at ${tokens.expiresAt}`,
			);

			const newTokens = await exchangeRefreshToken(tokens.refreshToken);

			// Store the new tokens
			await storeGitHubTokens(userId, {
				...newTokens,
				installationId: tokens.installationId, // Preserve installation ID
			});

			return {
				...newTokens,
				installationId: tokens.installationId,
			};
		} catch (error) {
			console.error("Failed to refresh token:", error);
			// If refresh fails, return null to indicate re-authorization is needed
			await invalidateTokens(userId);
			return null;
		}
	}

	// Token is still valid
	return tokens;
}

/**
 * Invalidate tokens when they can't be refreshed
 * This preserves the installation ID but forces re-authentication
 * @param userId The user ID to invalidate tokens for
 */
export async function invalidateTokens(userId: string): Promise<void> {
	const tokens = await getGitHubTokens(userId);

	if (tokens?.installationId) {
		// Preserve installation ID but clear tokens
		await storeGitHubTokens(userId, {
			accessToken: "", // Use empty string to indicate invalid token
			refreshToken: "", // Use empty string to indicate invalid token
			expiresAt: new Date(), // Set to now to force re-auth
			scope: "",
			installationId: tokens.installationId,
		});
	} else {
		// No installation ID to preserve, just delete the record
		await deleteGitHubTokens(userId);
	}
}

/**
 * Check if tokens are valid (not expired and exist)
 * @param userId The user ID to check tokens for
 * @returns True if tokens are valid
 */
export async function areTokensValid(userId: string): Promise<boolean> {
	const tokens = await getGitHubTokens(userId);

	if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
		return false;
	}

	// Check if token is expired
	const now = new Date();
	return now < tokens.expiresAt;
}
