// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Centralized GitHub environment variables configuration
 * All GitHub-related environment variables should be accessed through this module
 */

// Build the configuration object with validation at module load time
const buildGitHubConfig = () => {
  const config = {
    // GitHub App credentials for app-level authentication
    // From GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY
    APP_ID: process.env.GITHUB_APP_ID || (isNextJsBuild ? "" : undefined)!,
    APP_PRIVATE_KEY:
      process.env.GITHUB_APP_PRIVATE_KEY || (isNextJsBuild ? "" : undefined)!,

    // GitHub App OAuth credentials for user authentication flow
    // Used by both Auth.js and direct GitHub App OAuth flows
    // From GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET
    APP_CLIENT_ID:
      process.env.GITHUB_APP_CLIENT_ID || (isNextJsBuild ? "" : undefined)!,
    APP_CLIENT_SECRET:
      process.env.GITHUB_APP_CLIENT_SECRET || (isNextJsBuild ? "" : undefined)!,

    // Webhook secret for validating GitHub webhook payloads
    // From GITHUB_WEBHOOK_SECRET
    WEBHOOK_SECRET:
      process.env.GITHUB_WEBHOOK_SECRET || (isNextJsBuild ? "" : undefined)!,

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

    // Allow PAT fallback in production (optional)
    // From GITHUB_ALLOW_PAT_FALLBACK
    ALLOW_PAT_FALLBACK: process.env.GITHUB_ALLOW_PAT_FALLBACK === "true",

    // Disable GitHub App startup checks (optional)
    // From GITHUB_DISABLE_APP_CHECKS
    DISABLE_APP_CHECKS: process.env.GITHUB_DISABLE_APP_CHECKS === "true",
  } as const;

  // Validate required fields only at runtime, not during build
  // If GITHUB_DISABLE_APP_CHECKS is true, skip validation.
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

// Export the validated configuration object
// This will throw on module load if required variables are missing
export const GITHUB_CONFIG = buildGitHubConfig();
