/**
 * VCS Provider Singleton Initialization
 *
 * This file initializes the VCS Provider Singleton with the necessary callbacks
 * for token management. Import this file to use the `vcs` singleton instance.
 */

import {
  VCSProviderSingleton,
  GitHubProvider,
  ForejoProvider,
  getGitHubTokens,
  storeGitHubTokens,
  exchangeRefreshToken,
} from "@/lib/vcs-providers";
import {
  getForejoTokens,
  storeForejoTokens,
  exchangeForejoRefreshToken,
  FORGEJO_CONFIG,
} from "@/lib/forgejo-provider";
import { registerForejoTokenGetter } from "@catalyst/vcs-provider";

// Register Forgejo token getter for the provider
registerForejoTokenGetter(async (userId: string) => {
  const tokens = await getForejoTokens(userId);
  if (tokens?.accessToken) {
    return { accessToken: tokens.accessToken };
  }
  return null;
});

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
  const providers = [new GitHubProvider()];

  // Only add Forgejo provider if base URL is configured
  if (FORGEJO_CONFIG.BASE_URL) {
    providers.push(new ForejoProvider());
  }

  VCSProviderSingleton.initialize({
    // Explicitly register the providers the application wants to use
    // Each provider will validate its configuration on registration
    providers,

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
      if (providerId === "forgejo") {
        const tokens = await getForejoTokens(userId);
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

    // Refresh token using provider-specific OAuth
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
      if (providerId === "forgejo") {
        // For Forgejo, we need to get the instance URL from stored tokens
        // This is a bit of a workaround since the refreshToken callback doesn't have userId
        // In practice, the provider's token getter should handle this
        const newTokens = await exchangeForejoRefreshToken(
          refreshToken,
          FORGEJO_CONFIG.BASE_URL,
        );
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
      if (providerId === "forgejo") {
        // We need to preserve the instanceUrl if it exists
        const existing = await getForejoTokens(userId);
        await storeForejoTokens(userId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || "",
          expiresAt: tokens.expiresAt || new Date(),
          scope: tokens.scope || "",
          instanceUrl: existing?.instanceUrl || FORGEJO_CONFIG.BASE_URL,
        });
      }
    },

    // Default to github provider
    defaultProvider: "github",
  });
}

// Export the singleton instance
export const vcs = VCSProviderSingleton.getInstance();
