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
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET environment variables are required');
  }

  // GitHub API endpoint for refreshing tokens
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Catalyst-App',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub refresh error: ${data.error_description || data.error}`);
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
export async function exchangeAuthorizationCode(code: string, state?: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  installationId?: string;
}> {
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET environment variables are required');
  }

  // Exchange code for access token
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Catalyst-App',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      state: state,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange authorization code: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub auth error: ${data.error_description || data.error}`);
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

/**
 * Generate GitHub App authorization URL for user authentication
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export function generateAuthorizationUrl(state?: string): string {
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('GITHUB_APP_CLIENT_ID environment variable is required');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`,
    scope: 'read:user user:email read:org repo',
    response_type: 'code',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}