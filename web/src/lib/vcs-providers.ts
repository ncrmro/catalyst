/**
 * VCS Providers - Centralized Version Control System Integration
 *
 * This file is the single source of truth for all VCS-related functionality
 * in the web application. It consolidates:
 * - Environment configuration (GITHUB_CONFIG)
 * - Token storage and retrieval with encryption
 * - OAuth authentication helpers
 * - Token refresh logic
 * - Re-exports from @catalyst/vcs-provider package
 */

import { db } from "@/db";
import { githubUserTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@tetrastack/backend/utils";

// ============================================================================
// GITHUB CONFIGURATION
// ============================================================================

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

/**
 * Centralized GitHub environment variables configuration
 * All GitHub-related environment variables should be accessed through this object
 */
const buildGitHubConfig = () => {
  const config = {
    // GitHub App credentials for app-level authentication
    APP_ID: process.env.GITHUB_APP_ID || (isNextJsBuild ? "" : undefined)!,
    APP_PRIVATE_KEY:
      process.env.GITHUB_APP_PRIVATE_KEY || (isNextJsBuild ? "" : undefined)!,

    // GitHub App OAuth credentials for user authentication flow
    APP_CLIENT_ID:
      process.env.GITHUB_APP_CLIENT_ID || (isNextJsBuild ? "" : undefined)!,
    APP_CLIENT_SECRET:
      process.env.GITHUB_APP_CLIENT_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Webhook secret for validating GitHub webhook payloads
    WEBHOOK_SECRET:
      process.env.GITHUB_WEBHOOK_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Personal Access Token for fallback authentication (optional)
    PAT: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN,

    // GitHub Container Registry PAT for Docker operations (optional)
    GHCR_PAT: process.env.GITHUB_GHCR_PAT,

    // MCP API key for GitHub MCP integration (optional)
    MCP_API_KEY: process.env.GITHUB_MCP_API_KEY,

    // Repository mode configuration (optional)
    REPOS_MODE: process.env.GITHUB_REPOS_MODE,

    // Allow PAT fallback in production (optional)
    ALLOW_PAT_FALLBACK: process.env.GITHUB_ALLOW_PAT_FALLBACK === "true",

    // Disable GitHub App startup checks (optional)
    DISABLE_APP_CHECKS: process.env.GITHUB_DISABLE_APP_CHECKS === "true",
  } as const;

  // Validate required fields only at runtime, not during build
  if (!isNextJsBuild && !config.DISABLE_APP_CHECKS) {
    const missingVars: string[] = [];

    if (!config.APP_ID) missingVars.push("GITHUB_APP_ID");
    if (!config.APP_PRIVATE_KEY) missingVars.push("GITHUB_APP_PRIVATE_KEY");
    if (!config.APP_CLIENT_ID) missingVars.push("GITHUB_APP_CLIENT_ID");
    if (!config.APP_CLIENT_SECRET) missingVars.push("GITHUB_APP_CLIENT_SECRET");
    if (!config.WEBHOOK_SECRET) missingVars.push("GITHUB_WEBHOOK_SECRET");

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required GitHub environment variables: ${missingVars.join(", ")}. ` +
          "Please check your .env file or environment configuration.",
      );
    }
  }

  return config;
};

export const GITHUB_CONFIG = buildGitHubConfig();

// ============================================================================
// TOKEN STORAGE & RETRIEVAL
// ============================================================================

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
  console.log(`[GitHub Token] Fetching tokens for user: ${userId}`);
  
  const tokenRecord = await db
    .select()
    .from(githubUserTokens)
    .where(eq(githubUserTokens.userId, userId))
    .limit(1);

  if (!tokenRecord.length) {
    console.warn(`[GitHub Token] No token record found for user: ${userId}`);
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
    console.warn(
      `[GitHub Token] Incomplete encrypted token data for user: ${userId}`,
    );
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
      console.warn(
        `[GitHub Token] Empty decrypted tokens for user: ${userId} (tokens may have been invalidated)`,
      );
      return null;
    }

    const expiresAt = record.tokenExpiresAt!;
    const now = new Date();
    const isExpired = now > expiresAt;
    
    console.log(
      `[GitHub Token] Retrieved tokens for user: ${userId}, expires: ${expiresAt.toISOString()}, expired: ${isExpired}`,
    );

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
// OAUTH AUTHENTICATION
// ============================================================================

/**
 * Exchange a refresh token for a new access token
 * @param refreshToken The refresh token to exchange
 * @returns New tokens with updated expiration
 */
export async function exchangeRefreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  if (!GITHUB_CONFIG.APP_CLIENT_ID || !GITHUB_CONFIG.APP_CLIENT_SECRET) {
    throw new Error("Missing GitHub App credentials");
  }

  // GitHub API endpoint for refreshing tokens
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Catalyst-App",
    },
    body: JSON.stringify({
      client_id: GITHUB_CONFIG.APP_CLIENT_ID,
      client_secret: GITHUB_CONFIG.APP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `GitHub refresh error: ${data.error_description || data.error}`,
    );
  }

  // Calculate expiration (GitHub App user tokens expire in 8 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
    expiresAt,
    scope: data.scope,
  };
}

/**
 * Exchange an authorization code for access and refresh tokens
 * @param code The authorization code from GitHub
 * @param state The state parameter for CSRF protection
 * @returns Tokens and installation information
 */
export async function exchangeAuthorizationCode(
  code: string,
  state?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  installationId?: string;
}> {
  if (!GITHUB_CONFIG.APP_CLIENT_ID || !GITHUB_CONFIG.APP_CLIENT_SECRET) {
    throw new Error("Missing GitHub App credentials");
  }

  // Exchange code for access token
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Catalyst-App",
    },
    body: JSON.stringify({
      client_id: GITHUB_CONFIG.APP_CLIENT_ID,
      client_secret: GITHUB_CONFIG.APP_CLIENT_SECRET,
      code: code,
      state: state,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to exchange authorization code: ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `GitHub auth error: ${data.error_description || data.error}`,
    );
  }

  // Calculate expiration (GitHub App user tokens expire in 8 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scope: data.scope,
    // Installation ID might be available in some contexts
    installationId: undefined,
  };
}

export interface GitHubUserProfile {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
}

/**
 * Fetch the authenticated user's GitHub profile
 * @param accessToken The OAuth access token
 * @returns User profile information
 */
export async function fetchGitHubUser(
  accessToken: string,
): Promise<GitHubUserProfile> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Catalyst-App",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }

  const user = await response.json();

  // If email is null, fetch from emails endpoint (private emails)
  if (!user.email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Catalyst-App",
      },
    });

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      // Find primary email or first verified email
      const primaryEmail = emails.find(
        (e: { primary: boolean; verified: boolean }) => e.primary && e.verified,
      );
      const verifiedEmail = emails.find(
        (e: { verified: boolean }) => e.verified,
      );
      user.email = primaryEmail?.email || verifiedEmail?.email || null;
    }
  }

  return {
    id: user.id,
    login: user.login,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
  };
}

/**
 * Generate GitHub App authorization URL for user authentication
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export function generateAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.APP_CLIENT_ID || "",
    redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/github`,
    scope: "read:user user:email read:org repo",
    response_type: "code",
  });

  if (state) {
    params.append("state", state);
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

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
    console.warn(
      `[GitHub Token] Cannot refresh - no tokens found for user: ${userId}`,
    );
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
        `[GitHub Token] Refreshing token for user ${userId} that expires at ${tokens.expiresAt.toISOString()}`,
      );

      const newTokens = await exchangeRefreshToken(tokens.refreshToken);

      // Store the new tokens
      await storeGitHubTokens(userId, {
        ...newTokens,
        installationId: tokens.installationId, // Preserve installation ID
      });

      console.log(
        `[GitHub Token] Successfully refreshed token for user ${userId}, new expiration: ${newTokens.expiresAt.toISOString()}`,
      );

      return {
        ...newTokens,
        installationId: tokens.installationId,
      };
    } catch (error) {
      console.error(
        `[GitHub Token] Failed to refresh token for user ${userId}:`,
        error instanceof Error ? error.message : error,
      );
      // If refresh fails, return null to indicate re-authorization is needed
      await invalidateTokens(userId);
      return null;
    }
  }

  // Token is still valid
  console.log(
    `[GitHub Token] Token for user ${userId} is still valid (expires: ${tokens.expiresAt.toISOString()})`,
  );
  return tokens;
}

/**
 * Invalidate tokens when they can't be refreshed
 * This preserves the installation ID but forces re-authentication
 * @param userId The user ID to invalidate tokens for
 */
export async function invalidateTokens(userId: string): Promise<void> {
  console.warn(
    `[GitHub Token] Invalidating tokens for user ${userId} - re-authentication will be required`,
  );
  
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
  classifyGitHubError,

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
