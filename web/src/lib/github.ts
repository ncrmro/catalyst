import { App } from "@octokit/app";

// Environment variables for GitHub App authentication
const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;

if (!APP_ID) {
  console.warn('GITHUB_APP_ID environment variable is not set');
}

if (!PRIVATE_KEY) {
  console.warn('GITHUB_PRIVATE_KEY environment variable is not set');
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