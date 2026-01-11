/**
 * VCS Providers - Centralized Version Control System Integration
 *
 * This file provides VCS integration for the web application with:
 * - Token storage and retrieval with encryption (provider-agnostic)
 * - Provider-specific convenience exports (GitHub)
 * - Re-exports from @catalyst/vcs-provider package
 *
 * ARCHITECTURE NOTES:
 * - Provider-specific configuration (OAuth endpoints, API URLs) is managed in
 *   the @catalyst/vcs-provider package for better separation of concerns
 * - This file focuses on web-app-specific concerns: database operations,
 *   token encryption, and integration with the authentication system
 * - New providers (GitLab, Bitbucket) should be added to the provider package
 *   and configured similarly to GitHub
 */

import { db } from "@/db";
import { githubUserTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@tetrastack/backend/utils";

// ============================================================================
// PROVIDER CONFIGURATION RE-EXPORTS
// ============================================================================
// Configuration is managed in the provider package to keep provider-specific
// logic centralized. Import from there for direct access to config values.

import { GITHUB_CONFIG } from "@catalyst/vcs-provider";
export { GITHUB_CONFIG };

// ============================================================================
// TOKEN STORAGE & RETRIEVAL (PROVIDER-AGNOSTIC DESIGN)
// ============================================================================
/**
 * Token storage is currently GitHub-specific due to the database schema,
 * but designed to be extensible for future providers.
 * 
 * FUTURE EXTENSIBILITY:
 * To add support for additional providers (GitLab, Bitbucket, etc.):
 * 
 * 1. Database Schema:
 *    - Option A: Create provider-specific tables (e.g., gitlab_user_tokens)
 *    - Option B: Create a generic vcs_user_tokens table with a provider_id column
 * 
 * 2. Token Storage Functions:
 *    - Create provider-specific storage functions (e.g., storeGitLabTokens)
 *    - OR create generic storeVCSTokens(providerId, userId, tokens)
 * 
 * 3. VCS Provider Package:
 *    - Add provider implementation in @catalyst/vcs-provider/src/providers/
 *    - Implement OAuth functions (exchangeRefreshToken, etc.)
 *    - Register provider with VCSProviderSingleton
 * 
 * The current GitHub-specific implementation serves as a reference pattern.
 */

export interface GitHubTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  installationId?: string;
}

/**
 * Store GitHub App user tokens in the database with encryption
 * @param userId The user ID to store tokens for
 * @param tokens The tokens to store
 */
export async function storeGitHubTokens(
  userId: string,
  tokens: GitHubTokens,
): Promise<void> {
  // Encrypt the tokens
  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = encrypt(tokens.refreshToken);

  // Update or insert tokens using upsert pattern
  await db
    .insert(githubUserTokens)
    .values({
      userId,
      installationId: tokens.installationId,
      accessTokenEncrypted: encryptedAccess.encryptedData,
      accessTokenIv: encryptedAccess.iv,
      accessTokenAuthTag: encryptedAccess.authTag,
      refreshTokenEncrypted: encryptedRefresh.encryptedData,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenAuthTag: encryptedRefresh.authTag,
      tokenExpiresAt: tokens.expiresAt,
      tokenScope: tokens.scope,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: githubUserTokens.userId,
      set: {
        installationId: tokens.installationId,
        accessTokenEncrypted: encryptedAccess.encryptedData,
        accessTokenIv: encryptedAccess.iv,
        accessTokenAuthTag: encryptedAccess.authTag,
        refreshTokenEncrypted: encryptedRefresh.encryptedData,
        refreshTokenIv: encryptedRefresh.iv,
        refreshTokenAuthTag: encryptedRefresh.authTag,
        tokenExpiresAt: tokens.expiresAt,
        tokenScope: tokens.scope,
        updatedAt: new Date(),
      },
    });
}

/**
 * Retrieve GitHub App user tokens from the database with decryption
 * @param userId The user ID to retrieve tokens for
 * @returns Decrypted tokens or null if not found
 */
export async function getGitHubTokens(
  userId: string,
): Promise<GitHubTokens | null> {
  const tokenRecord = await db
    .select()
    .from(githubUserTokens)
    .where(eq(githubUserTokens.userId, userId))
    .limit(1);

  if (!tokenRecord.length) {
    return null;
  }

  const record = tokenRecord[0];

  // Check if we have encrypted tokens
  if (
    !record.accessTokenEncrypted ||
    !record.accessTokenIv ||
    !record.accessTokenAuthTag ||
    !record.refreshTokenEncrypted ||
    !record.refreshTokenIv ||
    !record.refreshTokenAuthTag
  ) {
    return null;
  }

  try {
    // Decrypt the tokens
    const accessToken = decrypt(
      record.accessTokenEncrypted,
      record.accessTokenIv,
      record.accessTokenAuthTag,
    );

    const refreshToken = decrypt(
      record.refreshTokenEncrypted,
      record.refreshTokenIv,
      record.refreshTokenAuthTag,
    );

    // Check for empty tokens (indicates invalidated tokens)
    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: record.tokenExpiresAt!,
      scope: record.tokenScope || "",
      installationId: record.installationId || undefined,
    };
  } catch (error) {
    console.error("Failed to decrypt GitHub tokens:", error);
    return null;
  }
}

/**
 * Delete GitHub App user tokens for a user
 * @param userId The user ID to delete tokens for
 */
export async function deleteGitHubTokens(userId: string): Promise<void> {
  await db.delete(githubUserTokens).where(eq(githubUserTokens.userId, userId));
}

// ============================================================================
// OAUTH AUTHENTICATION - GITHUB
// ============================================================================
// OAuth functions are delegated to the provider package for better separation.
// These exports provide backward compatibility for existing code.

import {
  exchangeRefreshToken as _exchangeRefreshToken,
  exchangeAuthorizationCode as _exchangeAuthorizationCode,
  fetchGitHubUser as _fetchGitHubUser,
  generateAuthorizationUrl as _generateAuthorizationUrl,
  type GitHubUserProfile,
} from "@catalyst/vcs-provider";

// Re-export GitHub OAuth functions for backward compatibility
// These delegate to the provider package which contains the actual implementation
export { GitHubUserProfile };

/**
 * Exchange a refresh token for a new access token
 * 
 * @deprecated Consider using the VCSProviderSingleton for automatic token management
 * @param refreshToken The refresh token to exchange
 * @returns New tokens with updated expiration
 */
export const exchangeRefreshToken = _exchangeRefreshToken;

/**
 * Exchange an authorization code for access and refresh tokens
 * 
 * @param code The authorization code from GitHub
 * @param state The state parameter for CSRF protection
 * @returns Tokens and installation information
 */
export const exchangeAuthorizationCode = _exchangeAuthorizationCode;

/**
 * Fetch the authenticated user's GitHub profile
 * 
 * @param accessToken The OAuth access token
 * @returns User profile information
 */
export const fetchGitHubUser = _fetchGitHubUser;

/**
 * Generate GitHub App authorization URL for user authentication
 * 
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export const generateAuthorizationUrl = _generateAuthorizationUrl;

// ============================================================================
// TOKEN REFRESH LOGIC
// ============================================================================

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

// ============================================================================
// RE-EXPORTS FROM @catalyst/vcs-provider PACKAGE
// ============================================================================

import {
  VCSProviderSingleton as _VCSProviderSingleton,
  registerTokenGetter,
  registerTokenStatusChecker,
} from "@catalyst/vcs-provider";

// Register token getters on module load
// This provides the package with access to token management without circular deps
registerTokenGetter(async (userId: string) => {
  const tokens = await refreshTokenIfNeeded(userId);
  if (tokens?.accessToken) {
    return { accessToken: tokens.accessToken };
  }
  return null;
});

registerTokenStatusChecker(async (userId: string) => {
  const tokens = await getGitHubTokens(userId);
  return {
    hadTokens: !!tokens,
    hasInstallationId: !!tokens?.installationId,
  };
});

export { _VCSProviderSingleton as VCSProviderSingleton };

export {
  // Provider classes for explicit registration
  GitHubProvider,

  // GitHub API fetchers (still used in specialized areas)
  getGitHubAccessToken,
  fetchPullRequests,
  fetchIssues,
  fetchPullRequestById,
  fetchUserRepositoryPullRequests,
  isGitHubTokenError,

  // GitHub App management
  getAllInstallations,

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
} from "@catalyst/vcs-provider";
