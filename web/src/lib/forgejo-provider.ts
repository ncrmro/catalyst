/**
 * Forgejo VCS Provider Integration
 *
 * Token storage, retrieval, and OAuth helpers for Forgejo.
 * Similar to web/src/lib/vcs-providers.ts but for Forgejo.
 */

import { db } from "@/db";
import { forejoUserTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@tetrastack/backend/utils";

// ============================================================================
// FORGEJO CONFIGURATION
// ============================================================================

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

/**
 * Centralized Forgejo environment variables configuration
 */
const buildForejoConfig = () => {
  const config = {
    // Base URL of the Forgejo instance
    BASE_URL: process.env.FORGEJO_BASE_URL || (isNextJsBuild ? "" : undefined)!,

    // OAuth2 Client credentials for user authentication
    CLIENT_ID: process.env.FORGEJO_CLIENT_ID || (isNextJsBuild ? "" : undefined)!,
    CLIENT_SECRET:
      process.env.FORGEJO_CLIENT_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Webhook secret for validating webhook payloads
    WEBHOOK_SECRET:
      process.env.FORGEJO_WEBHOOK_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Personal Access Token for fallback authentication (optional)
    PAT: process.env.FORGEJO_PAT || process.env.FORGEJO_TOKEN,

    // Allow PAT fallback in production (optional)
    ALLOW_PAT_FALLBACK: process.env.FORGEJO_ALLOW_PAT_FALLBACK === "true",
  } as const;

  // Validate required fields only at runtime, not during build
  if (!isNextJsBuild) {
    const missingVars: string[] = [];

    if (!config.BASE_URL) missingVars.push("FORGEJO_BASE_URL");
    // OAuth credentials are optional - users can use PAT for development
    if (!config.WEBHOOK_SECRET) missingVars.push("FORGEJO_WEBHOOK_SECRET");

    if (missingVars.length > 0) {
      console.warn(
        `Missing Forgejo environment variables: ${missingVars.join(", ")}. ` +
          "Forgejo integration may not work correctly.",
      );
    }
  }

  return config;
};

export const FORGEJO_CONFIG = buildForejoConfig();

// ============================================================================
// TOKEN STORAGE & RETRIEVAL
// ============================================================================

export interface ForejoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  instanceUrl: string;
}

/**
 * Store Forgejo OAuth2 user tokens in the database with encryption
 * @param userId The user ID to store tokens for
 * @param tokens The tokens to store
 */
export async function storeForejoTokens(
  userId: string,
  tokens: ForejoTokens,
): Promise<void> {
  // Encrypt the tokens
  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = encrypt(tokens.refreshToken);

  // Update or insert tokens using upsert pattern
  await db
    .insert(forejoUserTokens)
    .values({
      userId,
      instanceUrl: tokens.instanceUrl,
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
      target: forejoUserTokens.userId,
      set: {
        instanceUrl: tokens.instanceUrl,
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
 * Retrieve Forgejo user tokens from the database with decryption
 * @param userId The user ID to retrieve tokens for
 * @returns Decrypted tokens or null if not found
 */
export async function getForejoTokens(
  userId: string,
): Promise<ForejoTokens | null> {
  const tokenRecord = await db
    .select()
    .from(forejoUserTokens)
    .where(eq(forejoUserTokens.userId, userId))
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
      instanceUrl: record.instanceUrl,
    };
  } catch (error) {
    console.error("Failed to decrypt Forgejo tokens:", error);
    return null;
  }
}

/**
 * Delete Forgejo user tokens for a user
 * @param userId The user ID to delete tokens for
 */
export async function deleteForejoTokens(userId: string): Promise<void> {
  await db.delete(forejoUserTokens).where(eq(forejoUserTokens.userId, userId));
}

// ============================================================================
// OAUTH AUTHENTICATION
// ============================================================================

/**
 * Exchange a refresh token for a new access token
 * @param refreshToken The refresh token to exchange
 * @param instanceUrl The Forgejo instance URL
 * @param currentScope Optional: The current scope to preserve if the new scope is empty
 * @returns New tokens with updated expiration
 */
export async function exchangeForejoRefreshToken(
  refreshToken: string,
  instanceUrl: string,
  currentScope?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  if (!FORGEJO_CONFIG.CLIENT_ID || !FORGEJO_CONFIG.CLIENT_SECRET) {
    throw new Error("Missing Forgejo OAuth credentials");
  }

  // Forgejo/Gitea OAuth2 endpoint for refreshing tokens
  const response = await fetch(
    `${instanceUrl}/login/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Catalyst-App",
      },
      body: JSON.stringify({
        client_id: FORGEJO_CONFIG.CLIENT_ID,
        client_secret: FORGEJO_CONFIG.CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `Forgejo refresh error: ${data.error_description || data.error}`,
    );
  }

  // Calculate expiration
  // Use expires_in if available, otherwise default to 8 hours
  const expiresAt = new Date();
  if (data.expires_in && typeof data.expires_in === "number") {
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
  } else {
    expiresAt.setHours(expiresAt.getHours() + 8);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
    expiresAt,
    scope: data.scope || currentScope || "",
  };
}

/**
 * Exchange an authorization code for access and refresh tokens
 * @param code The authorization code from Forgejo
 * @param instanceUrl The Forgejo instance URL
 * @param state Optional state parameter for CSRF protection
 * @returns Tokens with expiration information
 */
export async function exchangeForejoAuthorizationCode(
  code: string,
  instanceUrl: string,
  state?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  if (!FORGEJO_CONFIG.CLIENT_ID || !FORGEJO_CONFIG.CLIENT_SECRET) {
    throw new Error("Missing Forgejo OAuth credentials");
  }

  // Exchange code for access token
  const response = await fetch(
    `${instanceUrl}/login/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Catalyst-App",
      },
      body: JSON.stringify({
        client_id: FORGEJO_CONFIG.CLIENT_ID,
        client_secret: FORGEJO_CONFIG.CLIENT_SECRET,
        code: code,
        state: state,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to exchange authorization code: ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `Forgejo auth error: ${data.error_description || data.error}`,
    );
  }

  // Calculate expiration
  const expiresAt = new Date();
  if (data.expires_in && typeof data.expires_in === "number") {
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
  } else {
    expiresAt.setHours(expiresAt.getHours() + 8);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scope: data.scope,
  };
}

export interface ForejoUserProfile {
  id: number;
  login: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string;
}

/**
 * Fetch the authenticated user's Forgejo profile
 * @param accessToken The OAuth access token
 * @param instanceUrl The Forgejo instance URL
 * @returns User profile information
 */
export async function fetchForejoUser(
  accessToken: string,
  instanceUrl: string,
): Promise<ForejoUserProfile> {
  const response = await fetch(`${instanceUrl}/api/v1/user`, {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "Catalyst-App",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Forgejo user: ${response.statusText}`);
  }

  const user = await response.json();

  return {
    id: user.id,
    login: user.login || user.username,
    email: user.email,
    full_name: user.full_name || user.name,
    avatar_url: user.avatar_url,
  };
}

/**
 * Generate Forgejo OAuth authorization URL for user authentication
 * @param instanceUrl The Forgejo instance URL
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export function generateForejoAuthorizationUrl(
  instanceUrl: string,
  state?: string,
): string {
  const params = new URLSearchParams({
    client_id: FORGEJO_CONFIG.CLIENT_ID || "",
    redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/forgejo`,
    scope: "read:user read:org repo",
    response_type: "code",
  });

  if (state) {
    params.append("state", state);
  }

  return `${instanceUrl}/login/oauth/authorize?${params.toString()}`;
}

// ============================================================================
// TOKEN REFRESH LOGIC
// ============================================================================

// Buffer time (5 minutes) before expiration to refresh token
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check if token needs refresh and refresh if needed
 * @param userId The user ID to check tokens for
 * @param options Optional configuration for refresh behavior
 * @returns Valid tokens or null if re-authorization is needed
 */
export async function refreshForejoTokenIfNeeded(
  userId: string,
  options?: { forceRefresh?: boolean },
): Promise<ForejoTokens | null> {
  // Get current tokens
  const tokens = await getForejoTokens(userId);

  if (!tokens) {
    return null;
  }

  // Check if token is about to expire (within buffer time)
  const now = new Date();
  const expirationWithBuffer = new Date(
    tokens.expiresAt.getTime() - EXPIRATION_BUFFER_MS,
  );

  if (options?.forceRefresh || now > expirationWithBuffer) {
    try {
      // Token is expiring soon or forced refresh, refresh it
      console.log(
        `Refreshing Forgejo token for user ${userId} (Reason: ${options?.forceRefresh ? "forced via 401 interceptor" : "expiring soon"})`,
      );

      const newTokens = await exchangeForejoRefreshToken(
        tokens.refreshToken,
        tokens.instanceUrl,
        tokens.scope,
      );

      // Store the new tokens
      await storeForejoTokens(userId, {
        ...newTokens,
        instanceUrl: tokens.instanceUrl,
      });

      return {
        ...newTokens,
        instanceUrl: tokens.instanceUrl,
      };
    } catch (error) {
      console.error("Failed to refresh Forgejo token:", error);
      // If refresh fails, return null to indicate re-authorization is needed
      await invalidateForejoTokens(userId);
      return null;
    }
  }

  // Token is still valid
  return tokens;
}

/**
 * Invalidate tokens when they can't be refreshed
 * @param userId The user ID to invalidate tokens for
 */
export async function invalidateForejoTokens(userId: string): Promise<void> {
  const tokens = await getForejoTokens(userId);

  if (tokens?.instanceUrl) {
    // Preserve instance URL but clear tokens
    await storeForejoTokens(userId, {
      accessToken: "", // Use empty string to indicate invalid token
      refreshToken: "", // Use empty string to indicate invalid token
      expiresAt: new Date(), // Set to now to force re-auth
      scope: "",
      instanceUrl: tokens.instanceUrl,
    });
  } else {
    // No instance URL to preserve, just delete the record
    await deleteForejoTokens(userId);
  }
}

/**
 * Check if tokens are valid (not expired and exist)
 * @param userId The user ID to check tokens for
 * @returns True if tokens are valid
 */
export async function areForejoTokensValid(userId: string): Promise<boolean> {
  const tokens = await getForejoTokens(userId);

  if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
    return false;
  }

  // Check if token is expired
  const now = new Date();
  return now < tokens.expiresAt;
}
