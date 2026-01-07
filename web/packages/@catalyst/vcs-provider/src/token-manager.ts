/**
 * VCS Token Manager - Automatic Token Refresh Singleton
 * 
 * FUNCTIONAL SPECIFICATION:
 * =======================
 * 
 * PURPOSE:
 * This singleton class provides automatic token refresh management for VCS providers,
 * ensuring that tokens are automatically refreshed before any VCS operations without
 * developers needing to manually handle refresh logic in actions, API routes, or other code.
 * 
 * REQUIREMENTS:
 * 
 * 1. Singleton Pattern:
 *    - Single global instance accessible throughout the application
 *    - Initialize once with provider-specific configuration
 *    - Thread-safe initialization and token refresh operations
 * 
 * 2. Provider-Agnostic Design:
 *    - Support multiple VCS providers (GitHub, GitLab, Bitbucket, Azure DevOps)
 *    - Generic token data structure that works across providers
 *    - Pluggable token fetcher and refresh callbacks per provider
 * 
 * 3. Automatic Token Refresh:
 *    - Check token expiration before any VCS operation
 *    - Automatically refresh tokens when within expiration buffer (default: 5 minutes)
 *    - Handle refresh failures gracefully (return null, log error)
 *    - Return valid tokens or null if re-authentication is required
 * 
 * 4. Configurable Token Fetcher:
 *    - Accept a callback function that defines how to get token data from storage
 *    - Callback signature: (userId: string, providerId: ProviderId) => Promise<TokenData | null>
 *    - Allow different storage backends (database, Redis, file system, etc.)
 * 
 * 5. Configurable Token Refresher:
 *    - Accept a callback function per provider that defines how to refresh tokens
 *    - Callback signature: (refreshToken: string, providerId: ProviderId) => Promise<TokenData>
 *    - Provider-specific OAuth/refresh flows
 * 
 * 6. Configurable Token Storer:
 *    - Accept a callback function that defines how to store refreshed tokens
 *    - Callback signature: (userId: string, tokens: TokenData, providerId: ProviderId) => Promise<void>
 *    - Allow different storage backends
 * 
 * 7. Transparent Operation:
 *    - Developers call getValidToken(userId, providerId) before any VCS operation
 *    - Manager handles all refresh logic internally
 *    - Returns valid token or null (triggers re-auth flow in application)
 * 
 * 8. Error Handling:
 *    - Log all token refresh attempts and failures
 *    - Never throw exceptions from public methods
 *    - Return null to indicate re-authentication is needed
 *    - Invalidate tokens on refresh failure
 * 
 * 9. Performance:
 *    - Cache valid tokens in memory (optional)
 *    - Minimize database/storage calls
 *    - Concurrent refresh protection (prevent multiple refresh calls for same user)
 * 
 * USAGE PATTERN:
 * 
 * ```typescript
 * // 1. Initialize singleton once at application startup
 * VCSTokenManager.initialize({
 *   getTokenData: async (userId, providerId) => {
 *     return await db.getTokens(userId, providerId);
 *   },
 *   refreshToken: async (refreshToken, providerId) => {
 *     return await provider.exchangeRefreshToken(refreshToken);
 *   },
 *   storeTokenData: async (userId, tokens, providerId) => {
 *     await db.storeTokens(userId, tokens, providerId);
 *   },
 * });
 * 
 * // 2. Use in actions/routes - just call getValidToken()
 * export async function myServerAction() {
 *   const session = await auth();
 *   
 *   // No manual refresh logic needed - it's automatic!
 *   const tokens = await VCSTokenManager.getInstance().getValidToken(
 *     session.user.id,
 *     'github'
 *   );
 *   
 *   if (!tokens) {
 *     return { error: 'Re-authentication required' };
 *   }
 *   
 *   // Use tokens.accessToken for API calls
 *   const client = createClient(tokens.accessToken);
 * }
 * ```
 * 
 * BENEFITS:
 * - DRY: No repeated refresh logic in every action
 * - Type-safe: Full TypeScript support
 * - Testable: Easy to mock in unit tests
 * - Provider-agnostic: Works with any OAuth-based VCS provider
 * - Maintainable: Centralized token refresh logic
 */

import type { ProviderId, TokenData } from "./types";

/**
 * Configuration options for the VCS Token Manager
 */
export interface VCSTokenManagerConfig {
  /**
   * Callback to retrieve token data from storage (database, cache, etc.)
   * 
   * @param userId - The user ID to get tokens for
   * @param providerId - The VCS provider ID
   * @returns Token data or null if not found
   */
  getTokenData: (
    userId: string,
    providerId: ProviderId,
  ) => Promise<TokenData | null>;

  /**
   * Callback to refresh an expired token using the refresh token
   * 
   * @param refreshToken - The refresh token to exchange
   * @param providerId - The VCS provider ID
   * @returns New token data
   * @throws Error if refresh fails
   */
  refreshToken: (
    refreshToken: string,
    providerId: ProviderId,
  ) => Promise<TokenData>;

  /**
   * Callback to store refreshed token data back to storage
   * 
   * @param userId - The user ID to store tokens for
   * @param tokens - The token data to store
   * @param providerId - The VCS provider ID
   */
  storeTokenData: (
    userId: string,
    tokens: TokenData,
    providerId: ProviderId,
  ) => Promise<void>;

  /**
   * Time buffer (in milliseconds) before expiration to trigger refresh
   * Default: 5 minutes (300000 ms)
   */
  expirationBufferMs?: number;
}

/**
 * VCS Token Manager Singleton
 * 
 * Manages automatic token refresh for VCS providers. Initialize once at
 * application startup, then use getValidToken() before any VCS operation.
 * 
 * @example
 * ```typescript
 * // Initialize once
 * VCSTokenManager.initialize({
 *   getTokenData: getTokensFromDB,
 *   refreshToken: exchangeRefreshToken,
 *   storeTokenData: storeTokensToDB,
 * });
 * 
 * // Use anywhere
 * const manager = VCSTokenManager.getInstance();
 * const tokens = await manager.getValidToken(userId, 'github');
 * ```
 */
export class VCSTokenManager {
  private static instance: VCSTokenManager | null = null;
  private config: VCSTokenManagerConfig | null = null;
  
  // Track ongoing refresh operations to prevent concurrent refreshes
  private refreshing = new Map<string, Promise<TokenData | null>>();
  
  // Default expiration buffer: 5 minutes
  private readonly DEFAULT_EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Initialize the VCS Token Manager singleton
   * 
   * Must be called once before using getInstance(). Subsequent calls
   * will throw an error.
   * 
   * @param config - Configuration with token fetch/refresh/store callbacks
   * @throws Error if already initialized
   * 
   * @example
   * ```typescript
   * VCSTokenManager.initialize({
   *   getTokenData: async (userId, providerId) => {
   *     return await getGitHubTokens(userId);
   *   },
   *   refreshToken: async (refreshToken, providerId) => {
   *     return await exchangeRefreshToken(refreshToken);
   *   },
   *   storeTokenData: async (userId, tokens, providerId) => {
   *     await storeGitHubTokens(userId, tokens);
   *   },
   * });
   * ```
   */
  public static initialize(config: VCSTokenManagerConfig): void {
    if (VCSTokenManager.instance !== null) {
      throw new Error("VCSTokenManager already initialized");
    }

    VCSTokenManager.instance = new VCSTokenManager();
    VCSTokenManager.instance.config = config;
  }

  /**
   * Get the singleton instance
   * 
   * @throws Error if not initialized via initialize()
   * @returns The VCSTokenManager singleton instance
   * 
   * @example
   * ```typescript
   * const manager = VCSTokenManager.getInstance();
   * const tokens = await manager.getValidToken(userId, 'github');
   * ```
   */
  public static getInstance(): VCSTokenManager {
    if (VCSTokenManager.instance === null) {
      throw new Error(
        "VCSTokenManager not initialized. Call VCSTokenManager.initialize() first.",
      );
    }

    return VCSTokenManager.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * 
   * @internal
   */
  public static reset(): void {
    VCSTokenManager.instance = null;
  }

  /**
   * Get a valid access token for the user and provider
   * 
   * Automatically refreshes the token if it's expired or about to expire.
   * Returns null if refresh fails or tokens don't exist, indicating that
   * the user needs to re-authenticate.
   * 
   * This is the primary method developers should use before any VCS operation.
   * 
   * @param userId - The user ID to get tokens for
   * @param providerId - The VCS provider ID
   * @returns Valid token data or null if re-authentication is required
   * 
   * @example
   * ```typescript
   * const tokens = await manager.getValidToken(userId, 'github');
   * if (!tokens) {
   *   return { error: 'Please reconnect your GitHub account' };
   * }
   * const octokit = new Octokit({ auth: tokens.accessToken });
   * ```
   */
  public async getValidToken(
    userId: string,
    providerId: ProviderId,
  ): Promise<TokenData | null> {
    if (!this.config) {
      throw new Error("VCSTokenManager not configured");
    }

    const key = `${userId}:${providerId}`;

    // Check if refresh is already in progress for this user/provider
    const existingRefresh = this.refreshing.get(key);
    if (existingRefresh) {
      return existingRefresh;
    }

    try {
      // Get current tokens from storage
      const tokens = await this.config.getTokenData(userId, providerId);

      if (!tokens) {
        return null;
      }

      // Check if token needs refresh
      if (this.needsRefresh(tokens)) {
        // Start refresh and track it
        const refreshPromise = this.refreshTokens(userId, providerId, tokens);
        this.refreshing.set(key, refreshPromise);

        try {
          const refreshedTokens = await refreshPromise;
          return refreshedTokens;
        } finally {
          this.refreshing.delete(key);
        }
      }

      // Token is still valid
      return tokens;
    } catch (error) {
      console.error(
        `Failed to get valid token for user ${userId} provider ${providerId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Check if a token needs to be refreshed
   * 
   * @param tokens - The token data to check
   * @returns True if token needs refresh
   */
  private needsRefresh(tokens: TokenData): boolean {
    if (!tokens.expiresAt) {
      // No expiration info, assume it's valid
      return false;
    }

    const now = new Date();
    const bufferMs =
      this.config?.expirationBufferMs ?? this.DEFAULT_EXPIRATION_BUFFER_MS;
    const expirationWithBuffer = new Date(
      tokens.expiresAt.getTime() - bufferMs,
    );

    return now > expirationWithBuffer;
  }

  /**
   * Refresh tokens using the refresh token
   * 
   * @param userId - The user ID
   * @param providerId - The VCS provider ID
   * @param currentTokens - Current token data (includes refresh token)
   * @returns New token data or null on failure
   */
  private async refreshTokens(
    userId: string,
    providerId: ProviderId,
    currentTokens: TokenData,
  ): Promise<TokenData | null> {
    if (!this.config) {
      return null;
    }

    if (!currentTokens.refreshToken) {
      console.error(
        `No refresh token available for user ${userId} provider ${providerId}`,
      );
      return null;
    }

    try {
      console.log(
        `Refreshing token for user ${userId} provider ${providerId} (expires at ${currentTokens.expiresAt})`,
      );

      // Call the provider-specific refresh callback
      const newTokens = await this.config.refreshToken(
        currentTokens.refreshToken,
        providerId,
      );

      // Store the new tokens
      await this.config.storeTokenData(userId, newTokens, providerId);

      console.log(
        `Successfully refreshed token for user ${userId} provider ${providerId}`,
      );

      return newTokens;
    } catch (error) {
      console.error(
        `Failed to refresh token for user ${userId} provider ${providerId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Invalidate tokens for a user (force re-authentication)
   * 
   * Useful when refresh fails or tokens are known to be invalid.
   * 
   * @param userId - The user ID
   * @param providerId - The VCS provider ID
   * 
   * @example
   * ```typescript
   * // Invalidate on 401 errors
   * if (error.status === 401) {
   *   await manager.invalidateTokens(userId, 'github');
   * }
   * ```
   */
  public async invalidateTokens(
    userId: string,
    providerId: ProviderId,
  ): Promise<void> {
    if (!this.config) {
      throw new Error("VCSTokenManager not configured");
    }

    try {
      // Store empty tokens to indicate invalid state
      await this.config.storeTokenData(
        userId,
        {
          accessToken: "",
          refreshToken: "",
          expiresAt: new Date(), // Set to now to force re-auth
          scope: "",
        },
        providerId,
      );

      console.log(
        `Invalidated tokens for user ${userId} provider ${providerId}`,
      );
    } catch (error) {
      console.error(
        `Failed to invalidate tokens for user ${userId} provider ${providerId}:`,
        error,
      );
    }
  }

  /**
   * Check if tokens are valid (not expired and exist)
   * 
   * @param userId - The user ID
   * @param providerId - The VCS provider ID
   * @returns True if tokens are valid
   * 
   * @example
   * ```typescript
   * if (!await manager.areTokensValid(userId, 'github')) {
   *   return redirect('/auth/connect-github');
   * }
   * ```
   */
  public async areTokensValid(
    userId: string,
    providerId: ProviderId,
  ): Promise<boolean> {
    if (!this.config) {
      throw new Error("VCSTokenManager not configured");
    }

    try {
      const tokens = await this.config.getTokenData(userId, providerId);

      if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
        return false;
      }

      // Check if token is expired (without buffer)
      if (tokens.expiresAt) {
        const now = new Date();
        return now < tokens.expiresAt;
      }

      // No expiration info, assume valid
      return true;
    } catch (error) {
      console.error(
        `Failed to check token validity for user ${userId} provider ${providerId}:`,
        error,
      );
      return false;
    }
  }
}
