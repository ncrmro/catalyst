// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Check if we're in CI environment
const isCI = process.env.CI === 'true' || process.env.CI === '1' || 
             process.env.GITHUB_ACTIONS === 'true' || 
             process.env.NODE_ENV === 'test';

// Environment variable validation - only at runtime, not during build
let GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID;
let GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET;

// Stub values for CI environments
const STUB_CLIENT_ID = 'stub_github_app_client_id';
const STUB_CLIENT_SECRET = 'stub_github_app_client_secret';

if (!isNextJsBuild && (!GITHUB_APP_CLIENT_ID || !GITHUB_APP_CLIENT_SECRET)) {
  if (isCI) {
    console.warn('GITHUB_APP_CLIENT_ID and/or GITHUB_APP_CLIENT_SECRET environment variables are not set in CI. Using stub values for preview deployment.');
    if (!GITHUB_APP_CLIENT_ID) {
      GITHUB_APP_CLIENT_ID = STUB_CLIENT_ID;
      process.env.GITHUB_APP_CLIENT_ID = STUB_CLIENT_ID;
    }
    if (!GITHUB_APP_CLIENT_SECRET) {
      GITHUB_APP_CLIENT_SECRET = STUB_CLIENT_SECRET;
      process.env.GITHUB_APP_CLIENT_SECRET = STUB_CLIENT_SECRET;
    }
  } else {
    console.error('GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET environment variables are required');
  }
}

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
  if (!GITHUB_APP_CLIENT_ID || !GITHUB_APP_CLIENT_SECRET) {
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
      client_id: GITHUB_APP_CLIENT_ID,
      client_secret: GITHUB_APP_CLIENT_SECRET,
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
  if (!GITHUB_APP_CLIENT_ID || !GITHUB_APP_CLIENT_SECRET) {
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
      client_id: GITHUB_APP_CLIENT_ID,
      client_secret: GITHUB_APP_CLIENT_SECRET,
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
  if (!GITHUB_APP_CLIENT_ID) {
    throw new Error('GITHUB_APP_CLIENT_ID environment variable is required');
  }

  const params = new URLSearchParams({
    client_id: GITHUB_APP_CLIENT_ID,
    redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`,
    scope: 'read:user user:email read:org repo',
    response_type: 'code',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
