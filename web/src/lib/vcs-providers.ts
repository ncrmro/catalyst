/**
 * VCS Providers Re-export
 *
 * This barrel file re-exports everything from the @catalyst/vcs-provider package
 * this script acts a the prefered way to use this packages functionality
 */

// Re-export everything from the package
export * from "@catalyst/vcs-provider";

import { GITHUB_CONFIG, refreshTokenIfNeeded } from "@catalyst/vcs-provider";

interface Session {
  accessToken?: string;
  user: { id: string };
}

/**
 * Get a GitHub access token for the current user.
 *
 * Token priority:
 * 1. PAT - for local development when GITHUB_PAT env var is set
 * 2. Session token - populated by Auth.js JWT callback when user signs in via GitHub OAuth
 *    (see src/auth.ts jwt callback: token.accessToken = account.access_token)
 * 3. Database - for programmatic sessions (e.g., GitHub App OAuth installation flow)
 *    where tokens are stored in github_user_tokens but not in the JWT.
 *    Uses refreshTokenIfNeeded() to automatically refresh expired tokens.
 *
 * @param session - The Auth.js session object
 * @returns The access token or undefined if none available
 */
export async function getGitHubAccessToken(
  session: Session,
): Promise<string | undefined> {
  // 1. PAT for local development
  if (GITHUB_CONFIG.PAT) return GITHUB_CONFIG.PAT;

  // 2. Session token from Auth.js
  if (session.accessToken) return session.accessToken;

  // 3. Database lookup with automatic token refresh
  // This ensures expired tokens are refreshed before use
  const tokens = await refreshTokenIfNeeded(session.user.id);
  return tokens?.accessToken;
}
