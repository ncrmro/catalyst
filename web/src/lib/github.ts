import { App } from "@octokit/app";

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild = process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Centralized GitHub environment variables configuration
 * All GitHub-related environment variables should be accessed through this module
 */

// Build the configuration object with validation at module load time
const buildGitHubConfig = () => {
  const config = {
    // GitHub App credentials for app-level authentication
    // From GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY
    APP_ID: process.env.GITHUB_APP_ID || (isNextJsBuild ? '' : undefined)!,
    APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY || (isNextJsBuild ? '' : undefined)!,
    
    // GitHub App OAuth credentials for user authentication flow
    // Used by both Auth.js and direct GitHub App OAuth flows
    // From GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET
    APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID || (isNextJsBuild ? '' : undefined)!,
    APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET || (isNextJsBuild ? '' : undefined)!,
    
    // Webhook secret for validating GitHub webhook payloads
    // From GITHUB_WEBHOOK_SECRET
    WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || (isNextJsBuild ? '' : undefined)!,
    
    // Personal Access Token for fallback authentication (optional)
    // From GITHUB_PAT or GITHUB_TOKEN
    PAT: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN,
    
    // GitHub Container Registry PAT for Docker operations (optional)
    // From GITHUB_GHCR_PAT
    GHCR_PAT: process.env.GITHUB_GHCR_PAT,
    
    // MCP API key for GitHub MCP integration (optional)
    // From GITHUB_MCP_API_KEY
    MCP_API_KEY: process.env.GITHUB_MCP_API_KEY,
    
    // Repository mode configuration (optional)
    // From GITHUB_REPOS_MODE
    REPOS_MODE: process.env.GITHUB_REPOS_MODE,
  } as const;
  
  // Validate required fields only at runtime, not during build
  if (!isNextJsBuild) {
    const missingVars: string[] = [];
    
    if (!config.APP_ID) missingVars.push('GITHUB_APP_ID');
    if (!config.APP_PRIVATE_KEY) missingVars.push('GITHUB_APP_PRIVATE_KEY');
    if (!config.APP_CLIENT_ID) missingVars.push('GITHUB_APP_CLIENT_ID');
    if (!config.APP_CLIENT_SECRET) missingVars.push('GITHUB_APP_CLIENT_SECRET');
    if (!config.WEBHOOK_SECRET) missingVars.push('GITHUB_WEBHOOK_SECRET');
    
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required GitHub environment variables: ${missingVars.join(', ')}. ` +
        'Please check your .env file or environment configuration.'
      );
    }
  }
  
  return config;
};

// Export the validated configuration object
// This will throw on module load if required variables are missing
export const GITHUB_CONFIG = buildGitHubConfig();

// Create GitHub App instance singleton
// During build phase, use stub values to prevent initialization errors
const githubApp = isNextJsBuild 
  ? new App({
      appId: 'stub-app-id',
      privateKey: `-----BEGIN RSA PRIVATE KEY-----STUB-----END RSA PRIVATE KEY-----`,
    })
  : new App({
      appId: GITHUB_CONFIG.APP_ID,
      privateKey: GITHUB_CONFIG.APP_PRIVATE_KEY,
    });

/**
 * Get all installations for the GitHub App
 * This requires the app to be authenticated as the GitHub App itself
 */
export async function getAllInstallations() {
  try {
    // Use the app's octokit instance for app-level operations
    const { data: installations } = await githubApp.octokit.request('GET /app/installations');
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
  try {
    return await githubApp.getInstallationOctokit(installationId);
  } catch (error) {
    console.error(`Failed to get Octokit for installation ${installationId}:`, error);
    throw new Error(`Failed to get Octokit for installation ${installationId}`);
  }
}
