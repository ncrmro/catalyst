/**
 * VCS Provider Singleton Initialization
 *
 * This file initializes the VCS Provider Singleton with the necessary callbacks
 * for token management. Import this file to use the `vcs` singleton instance.
 */

import {
  VCSProviderSingleton,
  GitHubProvider,
  MockVCSProvider,
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
  // Check if we should use mock provider
  const useMockProvider = process.env.VCS_MOCK === "true";

  VCSProviderSingleton.initialize({
    // Explicitly register the providers the application wants to use
    // Each provider will validate its configuration on registration
    providers: useMockProvider
      ? [new MockVCSProvider()]
      : [new GitHubProvider()],

    // Get token data from our database
    getTokenData: async (userId, providerId) => {
      if (useMockProvider) {
        // Mock provider doesn't need real tokens
        return {
          accessToken: "mock-token",
          refreshToken: "mock-refresh-token",
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          scope: "repo",
        };
      }

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
      if (useMockProvider) {
        // Mock provider always returns fresh tokens
        return {
          accessToken: "mock-token-refreshed",
          refreshToken: "mock-refresh-token-refreshed",
          expiresAt: new Date(Date.now() + 3600000),
          scope: "repo",
        };
      }

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
      if (useMockProvider) {
        // Mock provider doesn't need to store tokens
        return;
      }

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
