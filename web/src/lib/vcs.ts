/**
 * VCS Provider Singleton Initialization
 *
 * This file initializes the VCS Provider Singleton with the necessary callbacks
 * for token management. Import this file to use the `vcs` singleton instance.
 */

import {
  VCSProviderSingleton,
  getGitHubTokens,
  storeGitHubTokens,
  exchangeRefreshToken,
} from "@/lib/vcs-providers";

// Initialize the VCS Provider Singleton
// This should be done once, typically in a file like this that is imported by actions
// Use a guard pattern to check if already initialized
let isInitialized = false;
try {
  VCSProviderSingleton.getInstance();
  isInitialized = true;
} catch {
  // Not initialized yet, continue with initialization
}

if (!isInitialized) {
  VCSProviderSingleton.initialize({
    // Get token data from our database
    getTokenData: async (userId, providerId) => {
      if (providerId === "github") {
        const tokens = await getGitHubTokens(userId);
        if (!tokens) return null;
        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        };
      }
      return null;
    },

    // Refresh token using GitHub OAuth
    refreshToken: async (refreshToken, providerId) => {
      if (providerId === "github") {
        const newTokens = await exchangeRefreshToken(refreshToken);
        return {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: newTokens.expiresAt,
          scope: newTokens.scope,
        };
      }
      throw new Error(`Refresh not implemented for provider ${providerId}`);
    },

    // Store refreshed tokens back to our database
    storeTokenData: async (userId, tokens, providerId) => {
      if (providerId === "github") {
        // We need to preserve the installationId if it exists
        const existing = await getGitHubTokens(userId);
        await storeGitHubTokens(userId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || "",
          expiresAt: tokens.expiresAt || new Date(),
          scope: tokens.scope || "",
          installationId: existing?.installationId,
        });
      }
    },

    // Default to github provider
    defaultProvider: "github",
  });
}

// Export the singleton instance
export const vcs = VCSProviderSingleton.getInstance();
