import { App } from "@octokit/app";

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Check if we're in CI environment
const isCI = process.env.CI === 'true' || process.env.CI === '1' || 
             process.env.GITHUB_ACTIONS === 'true' || 
             process.env.NODE_ENV === 'test';

// Environment variables for GitHub App authentication
let APP_ID = process.env.GITHUB_APP_ID;
let PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;

// Stub values for CI environments
const STUB_APP_ID = '12345';
const STUB_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC3J/zLKAI1Q6it
8v9oFshtxBDMljoencwpW4Fuhl0itQPEeb1G8SBoFxs+1m/e2X12tzq5JQubW1e8
jHm6J4hsKI7I9u4fcotJmuW7qLDZW/HZiWATG1STxpBs+vCt6eFz9/lzwHgVHbos
pe1JNyiraOvjWD7Q6pTOt9QrA/UfNExor2HS6KqRmENEfEZlhdj0ZaGgjW9Lntz4
qaDLjXt9N+Z4CUGATlt1xoN4IxjhlVM7wTHAXhFfRIuIamC5GA+AtLWK/YXQ0aMc
ApK5S/O0HpwPBTnoAe3Pf0rzU9lhSuQd/bzpevLsjeY1U+B5yVnY/KJ0MSeizDmM
oxl5yLfjAgMBAAECggEABtVMQPdsxFS870OQqX1TOKLuJxL3hZPlNnCuXOj7ZgAI
iawOK+WPqJC6ym+mNO/XFqFgZKfP/277QigR+BnvlqVuuId4H2WtHP3xtecCNTAC
67p+SYEXI6a1x3ozsjFaNlZ1rTleb8LMjYThsWGIRkqjbIzjq4LpayBHZmpUU8YH
1R3bDielcuQ6IBby5gAcN+lCxt9PCyZWuGafxhE6hnuqe444YMYkOXYYGwVdbgxQ
59Z3e99cEtPG3FD1+UG6X+sTN6qi8jPyzGkXJDer6+IV0c/U/9IQytVF6331AAwl
UVFtnS9GgsXO3Vr40f2A5pQ6b+BBR+dfHQQMWZ/71QKBgQDitPYCFvqsZckaAuEo
mbPUoG9CUOTXDG8vPda3hHeYxPWsu59K4LSvqqgmgFW4myfMEqEapUj1Rio9hohC
GhMJaSbp/wW6cwkaNMNPBg+IzUjORqDbV8qjtGJS2HwAjP6b4nK6mOhfG/0BWKTA
jDTGYQEquTp5v8ozLtE4UpSnlQKBgQDO0nOehM0GQJ7Z+dxG0LMf5yC1xMlwXyZc
uWXJ4dhYuY2hoO6RhgQp9AvwvdR7wy66x5Yc5gzfg8SjuXvUyLvIgy+hn6HULZRb
zDd/3vxZZ7LBGHvyaJjmWRbgNggjZjZ3UqIIbwpgLi6SM2w7PdWzLbxXx54+JHWP
jGChVk6jlwKBgCZRWcdOpP3gklYAKJhZKkkE+OknjRY/9sbwV8ta62/50mBoserR
Ahky6grf5B04tEhM2cgMKcGzI06U35D0oUUU7cvdG9XAvcgdJOnFZ3jC4cxjqaqJ
MynqQjgoeQUKz7n/U07wq03wCBpjJi2ZRQ5GtRDIj/amEQIHprszUgblAoGAMJ5M
S6FQSP372aXg4EzDLua4S8J80AuuCvISOYj7wK+t2abpLhBg/jO+ctNNFeLmI0Yz
xYtWz1w8Z3h84aJmclZUZhwOgMBONd4l1ctnauTzomzNBkkMWGns9Lv+4cNvXlFw
gacIu19f10J7WNnKWJqRwdjNHDKZ6CrJtGODjPUCgYBrVUtaZHe1wyc3hkk10rnm
3SIYKhVaoRK9Y0GMSX1AU++g2gycVAcuaxCAZkDD5BWuqg/fQ9cK15A/E8jxOXL1
NIjDQMHodqzod0nI4H0pCG7J/Gi9+se5BprpclwrX8Xa3bWU6a0TaxG4yjGEOUOv
srurdBfxxS5rqYqYAmeX5Q==
-----END PRIVATE KEY-----`;

if (!isNextJsBuild) {
  if (!APP_ID) {
    if (isCI) {
      console.warn('GITHUB_APP_ID environment variable is not set in CI. Using stub value for preview deployment.');
      APP_ID = STUB_APP_ID;
      process.env.GITHUB_APP_ID = STUB_APP_ID;
    } else {
      console.warn('GITHUB_APP_ID environment variable is not set');
    }
  }

  if (!PRIVATE_KEY) {
    if (isCI) {
      console.warn('GITHUB_PRIVATE_KEY environment variable is not set in CI. Using stub value for preview deployment.');
      PRIVATE_KEY = STUB_PRIVATE_KEY;
      process.env.GITHUB_PRIVATE_KEY = STUB_PRIVATE_KEY;
    } else {
      console.warn('GITHUB_PRIVATE_KEY environment variable is not set');
    }
  }
}

// Create GitHub App instance only if credentials are available
let app: App | null = null;

if (APP_ID && PRIVATE_KEY) {
  try {
    app = new App({
      appId: APP_ID,
      privateKey: PRIVATE_KEY,
    });
  } catch (error) {
    console.error('Failed to initialize GitHub App:', error);
  }
}

/**
 * Get all installations for the GitHub App
 * This requires the app to be authenticated as the GitHub App itself
 */
export async function getAllInstallations() {
  if (!APP_ID || !PRIVATE_KEY || !app) {
    throw new Error('GitHub App credentials are not configured. Please set GITHUB_APP_ID and GITHUB_PRIVATE_KEY environment variables.');
  }

  try {
    // Use the app's octokit instance for app-level operations
    const { data: installations } = await app.octokit.request('GET /app/installations');
    return installations;
  } catch (error) {
    console.error('Failed to fetch GitHub App installations:', error);
    throw new Error('Failed to fetch GitHub App installations');
  }
}

/**
 * Get an installation-specific Octokit instance
 * This is useful for operations on specific installations
 */
export async function getInstallationOctokit(installationId: number) {
  if (!APP_ID || !PRIVATE_KEY || !app) {
    throw new Error('GitHub App credentials are not configured. Please set GITHUB_APP_ID and GITHUB_PRIVATE_KEY environment variables.');
  }

  try {
    return await app.getInstallationOctokit(installationId);
  } catch (error) {
    console.error(`Failed to get Octokit for installation ${installationId}:`, error);
    throw new Error(`Failed to get Octokit for installation ${installationId}`);
  }
}