/**
 * GitHub OAuth Authentication
 *
 * OAuth flow helpers for GitHub App user authentication.
 */

import { z } from "zod";
import { GITHUB_CONFIG } from "./client";

// ============================================================================
// ZOD SCHEMAS FOR GITHUB API RESPONSES
// ============================================================================

/**
 * Schema for GitHub OAuth token response from exchangeRefreshToken
 * The refresh_token is optional in refresh responses (GitHub may not always return a new one)
 */
const GitHubRefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  scope: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * Schema for GitHub OAuth token response from exchangeAuthorizationCode
 * The refresh_token is required in authorization code exchange responses
 */
const GitHubAuthCodeResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * Schema for GitHub user profile response
 */
const GitHubUserResponseSchema = z.object({
  id: z.number(),
  login: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  avatar_url: z.string(),
});

/**
 * Schema for GitHub user emails response
 */
const GitHubEmailSchema = z.object({
  email: z.string(),
  primary: z.boolean(),
  verified: z.boolean(),
});

const GitHubEmailsResponseSchema = z.array(GitHubEmailSchema);

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

  const json = await response.json();
  const data = GitHubRefreshTokenResponseSchema.parse(json);

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

  const json = await response.json();
  const data = GitHubAuthCodeResponseSchema.parse(json);

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

  const json = await response.json();
  const user = GitHubUserResponseSchema.parse(json);

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
      const emailsJson = await emailsResponse.json();
      const emails = GitHubEmailsResponseSchema.parse(emailsJson);
      // Find primary email or first verified email
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      const verifiedEmail = emails.find((e) => e.verified);
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
    client_id: GITHUB_CONFIG.APP_CLIENT_ID,
    redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/github`,
    scope: "read:user user:email read:org repo",
    response_type: "code",
  });

  if (state) {
    params.append("state", state);
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
