/**
 * VCS Provider Singleton - Comprehensive VCS Operations Facade
 *
 * FUNCTIONAL REQUIREMENTS:
 * ========================
 *
 * PURPOSE:
 * This singleton provides a unified interface for all VCS operations with automatic
 * token management. Instead of manually managing tokens and calling provider-specific
 * APIs, developers interact with this facade which handles token retrieval, refresh,
 * and provider routing automatically.
 *
 * FUNCTIONAL REQUIREMENTS (MUST):
 *
 * FR-001: Multi-Provider Support
 * - The class MUST support multiple VCS providers (GitHub, GitLab, Bitbucket, Azure DevOps)
 * - Each operation method MUST accept a providerId parameter to specify which provider to use
 * - The class MUST support future extensibility for self-hosted provider instances
 *   (e.g., self-hosted GitLab, GitHub Enterprise Server)
 *
 * FR-002: Automatic Token Management
 * - The class MUST automatically refresh tokens before any operation that requires authentication
 * - Token refresh MUST occur transparently without developer intervention
 * - Token refresh MUST happen before the token expires (default: 5 minutes buffer)
 * - The class MUST prevent concurrent refresh operations for the same token source
 *
 * FR-003: Generic Token Source Support
 * - All operations MUST accept a generic tokenSourceId parameter
 * - The tokenSourceId MUST support user IDs, team IDs, project IDs, or any application-defined identifier
 * - Token retrieval callbacks MUST be provided by the application to determine how to fetch tokens
 *
 * FR-004: Environment Validation
 * - The initialize() method MUST validate required environment variables
 * - Missing required environment variables MUST cause initialization to fail with clear error messages
 * - Environment validation MUST occur before any operations can be performed
 *
 * FR-005: Namespaced Operations
 * - Operations MUST be grouped by resource type (issues, pullRequests, repos, branches, files)
 * - Each namespace MUST provide methods for common operations on that resource type
 * - All methods MUST handle authentication and token refresh automatically
 *
 * FR-006: Error Handling
 * - Authentication failures MUST provide clear error messages indicating re-authentication is needed
 * - Provider not found errors MUST specify which provider was requested
 * - Token refresh failures MUST be logged and return null to trigger re-authentication flow
 *
 * FR-007: Singleton Pattern
 * - Only one instance MUST exist throughout the application lifecycle
 * - The instance MUST be initialized once before use
 * - Attempting to initialize twice MUST throw an error
 *
 * USAGE PATTERN:
 * ```typescript
 * // 1. Initialize once at application startup
 * VCSProviderSingleton.initialize({
 *   getTokenData: async (tokenSourceId, providerId) => {
 *     return await db.getTokens(tokenSourceId, providerId);
 *   },
 *   refreshToken: async (refreshToken, providerId) => {
 *     return await oauth.exchangeRefreshToken(refreshToken);
 *   },
 *   storeTokenData: async (tokenSourceId, tokens, providerId) => {
 *     await db.storeTokens(tokenSourceId, tokens, providerId);
 *   },
 *   onAuthError: (tokenSourceId, providerId) => {
 *     // Redirect to login or show error
 *   },
 *   requiredEnvVars: ['GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET'],
 * });
 *
 * // 2. Use anywhere - specify provider for each operation
 * const vcs = VCSProviderSingleton.getInstance();
 *
 * // Get an issue from GitHub
 * const issue = await vcs.issues.get(tokenSourceId, 'github', owner, repo, issueNumber);
 *
 * // OR use a scoped instance (Recommended)
 * const myVcs = vcs.getScoped(userId, 'github');
 * const myIssue = await myVcs.issues.get(owner, repo, issueNumber);
 * ```
 */

import type {
  ProviderId,
  TokenData,
  Issue,
  PullRequest,
  Review,
  PRComment,
  Repository,
  FileContent,
  DirectoryEntry,
  Branch,
  CIStatusSummary,
  AuthenticatedClient,
  VCSProvider,
} from "./types";
import { providerRegistry } from "./provider-registry";

/**
 * Configuration options for the VCS Provider Singleton
 */
export interface VCSProviderConfig {
  /**
   * Array of VCS provider instances to register
   * The application must explicitly provide the providers it wants to use
   */
  providers: VCSProvider[];

  /**
   * Callback to retrieve token data from storage
   *
   * @param tokenSourceId - Generic identifier (userId, teamId, projectId, etc.)
   * @param providerId - The VCS provider ID
   * @returns Token data or null if not found
   */
  getTokenData: (
    tokenSourceId: string,
    providerId: ProviderId,
  ) => Promise<TokenData | null>;

  /**
   * Callback to refresh an expired token
   *
   * @param refreshToken - The refresh token to exchange
   * @param providerId - The VCS provider ID
   * @returns New token data
   */
  refreshToken: (
    refreshToken: string,
    providerId: ProviderId,
  ) => Promise<TokenData>;

  /**
   * Callback to store refreshed token data
   *
   * @param tokenSourceId - Generic identifier (userId, teamId, projectId, etc.)
   * @param tokens - The token data to store
   * @param providerId - The VCS provider ID
   */
  storeTokenData: (
    tokenSourceId: string,
    tokens: TokenData,
    providerId: ProviderId,
  ) => Promise<void>;

  /**
   * Callback for authentication errors (e.g. when refresh fails or tokens are missing)
   *
   * @param tokenSourceId - Generic identifier
   * @param providerId - The VCS provider ID
   */
  onAuthError?: (tokenSourceId: string, providerId: ProviderId) => void;

  /**
   * Required environment variables to check during initialization
   */
  requiredEnvVars?: string[];

  /**
   * Time buffer (in milliseconds) before expiration to trigger refresh
   * Default: 5 minutes (300000 ms)
   */
  expirationBufferMs?: number;

  /**
   * Default provider to use if not specified
   * Default: 'github'
   */
  defaultProvider?: ProviderId;
}

/**
 * VCS Provider Singleton
 *
 * Comprehensive facade for all VCS operations with automatic token management.
 */
export class VCSProviderSingleton {
  private static instance: VCSProviderSingleton | null = null;
  private config: VCSProviderConfig | null = null;
  private refreshing = new Map<string, Promise<TokenData | null>>();
  private readonly DEFAULT_EXPIRATION_BUFFER_MS = 5 * 60 * 1000;
  private defaultProviderId: ProviderId = "github";

  // Namespaced operation interfaces
  public readonly issues: IssueOperations;
  public readonly pullRequests: PullRequestOperations;
  public readonly repos: RepositoryOperations;
  public readonly branches: BranchOperations;
  public readonly files: FileOperations;

  private constructor() {
    // Initialize namespaced operations
    this.issues = new IssueOperations(this);
    this.pullRequests = new PullRequestOperations(this);
    this.repos = new RepositoryOperations(this);
    this.branches = new BranchOperations(this);
    this.files = new FileOperations(this);
  }

  /**
   * Initialize the VCS Provider Singleton
   *
   * @param config - Configuration with providers to register and token callbacks
   * @throws Error if already initialized or if required env vars are missing
   */
  public static initialize(config: VCSProviderConfig): void {
    if (VCSProviderSingleton.instance !== null) {
      throw new Error("VCSProviderSingleton already initialized");
    }

    // Register all provided providers
    if (!config.providers || config.providers.length === 0) {
      throw new Error(
        "At least one provider must be specified in VCSProviderConfig.providers",
      );
    }

    for (const provider of config.providers) {
      // Validate provider configuration
      provider.validateConfig();
      providerRegistry.register(provider);
    }

    // Check required environment variables
    if (config.requiredEnvVars && config.requiredEnvVars.length > 0) {
      const missing = config.requiredEnvVars.filter(
        (varName) => !process.env[varName],
      );

      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missing.join(", ")}`,
        );
      }
    }

    VCSProviderSingleton.instance = new VCSProviderSingleton();
    VCSProviderSingleton.instance.config = config;

    if (config.defaultProvider) {
      VCSProviderSingleton.instance.defaultProviderId = config.defaultProvider;
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): VCSProviderSingleton {
    if (VCSProviderSingleton.instance === null) {
      throw new Error(
        "VCSProviderSingleton not initialized. Call VCSProviderSingleton.initialize() first.",
      );
    }
    return VCSProviderSingleton.instance;
  }

  /**
   * Get a scoped instance for a specific user and provider.
   * This is the recommended way to use the singleton to avoid passing IDs repeatedly.
   *
   * @param tokenSourceId - Generic identifier (userId, teamId, projectId, etc.)
   * @param providerId - Optional VCS provider ID (defaults to configured default)
   */
  public getScoped(
    tokenSourceId: string,
    providerId?: ProviderId,
  ): ScopedVCSProvider {
    return new ScopedVCSProvider(
      this,
      tokenSourceId,
      providerId || this.defaultProviderId,
    );
  }

  /**
   * Reset the singleton (for testing)
   * @internal
   */
  public static reset(): void {
    VCSProviderSingleton.instance = null;
  }

  /**
   * Execute an operation with an authenticated provider
   *
   * @internal
   */
  public async execute<T>(
    tokenSourceId: string,
    providerId: ProviderId,
    operation: (
      provider: VCSProvider,
      client: AuthenticatedClient,
    ) => Promise<T>,
  ): Promise<T> {
    const client = await this.getAuthenticatedClient(tokenSourceId, providerId);

    const provider = providerRegistry.get(client.providerId);
    if (!provider) {
      throw new Error(`Provider ${client.providerId} not registered`);
    }

    return operation(provider, client);
  }

  /**
   * Get an authenticated client for the token source
   * Automatically handles token refresh
   *
   * @internal
   */
  async getAuthenticatedClient(
    tokenSourceId: string,
    providerId?: ProviderId,
  ): Promise<AuthenticatedClient> {
    const actualProviderId = providerId || this.defaultProviderId;

    // Get valid token (with automatic refresh)
    const tokens = await this.getValidToken(tokenSourceId, actualProviderId);

    if (!tokens) {
      if (this.config?.onAuthError) {
        this.config.onAuthError(tokenSourceId, actualProviderId);
      }
      throw new Error(
        `No valid tokens available for source ${tokenSourceId} and provider ${actualProviderId}. Re-authentication required.`,
      );
    }

    // Get provider from registry
    const provider = providerRegistry.get(actualProviderId);
    if (!provider) {
      throw new Error(`Provider ${actualProviderId} not registered`);
    }

    // Return authenticated client with raw provider client
    // Note: This assumes providers expose a way to create client from token
    // For now, we'll just return the structure expected
    return provider.authenticate(tokenSourceId);
  }

  /**
   * Get valid token with automatic refresh
   * @internal
   */
  private async getValidToken(
    tokenSourceId: string,
    providerId: ProviderId,
  ): Promise<TokenData | null> {
    if (!this.config) {
      throw new Error("VCSProviderSingleton not configured");
    }

    const key = `${tokenSourceId}:${providerId}`;

    try {
      // Check if refresh already in progress
      const existingRefresh = this.refreshing.get(key);
      if (existingRefresh) {
        return existingRefresh;
      }

      // Get current tokens
      const tokens = await this.config.getTokenData(tokenSourceId, providerId);

      if (!tokens) {
        return null;
      }

      // Check if refresh needed
      if (this.needsRefresh(tokens)) {
        // Double-check after async operation
        const raceRefresh = this.refreshing.get(key);
        if (raceRefresh) {
          return raceRefresh;
        }

        // Start refresh
        const refreshPromise = this.refreshTokens(
          tokenSourceId,
          providerId,
          tokens,
        );
        this.refreshing.set(key, refreshPromise);

        try {
          const refreshedTokens = await refreshPromise;
          return refreshedTokens;
        } finally {
          this.refreshing.delete(key);
        }
      }

      return tokens;
    } catch (error) {
      console.error(
        `Failed to get valid token for source ${tokenSourceId} provider ${providerId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Check if token needs refresh
   * @internal
   */
  private needsRefresh(tokens: TokenData): boolean {
    if (!tokens.expiresAt) {
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
   * Refresh tokens
   * @internal
   */
  private async refreshTokens(
    tokenSourceId: string,
    providerId: ProviderId,
    currentTokens: TokenData,
  ): Promise<TokenData | null> {
    if (!this.config) {
      return null;
    }

    if (!currentTokens.refreshToken) {
      console.error(
        `No refresh token for source ${tokenSourceId} provider ${providerId}`,
      );
      return null;
    }

    try {
      console.log(
        `Refreshing token for source ${tokenSourceId} provider ${providerId}`,
      );

      const newTokens = await this.config.refreshToken(
        currentTokens.refreshToken,
        providerId,
      );

      await this.config.storeTokenData(tokenSourceId, newTokens, providerId);

      console.log(
        `Successfully refreshed token for source ${tokenSourceId} provider ${providerId}`,
      );

      return newTokens;
    } catch (error) {
      console.error(
        `Failed to refresh token for source ${tokenSourceId} provider ${providerId}:`,
        error,
      );

      // Trigger auth error callback when refresh fails
      // This ensures consistent error handling across the application
      await this.config.onAuthError?.(tokenSourceId, providerId);

      // If refresh fails, tokens are effectively invalid.
      return null;
    }
  }
}

/**
 * Scoped VCS Provider
 *
 * A wrapper around VCSProviderSingleton that binds the tokenSourceId and providerId
 * to allow for cleaner API usage.
 */
export class ScopedVCSProvider {
  constructor(
    private provider: VCSProviderSingleton,
    private tokenSourceId: string,
    private providerId: ProviderId,
  ) {}

  /**
   * Check the connection status for this scoped provider
   */
  async checkConnection(): Promise<import("./types").ConnectionStatus> {
    return this.provider.execute(
      this.tokenSourceId,
      this.providerId,
      async (vcsProvider, client) => {
        return vcsProvider.checkConnection(client);
      },
    );
  }

  public get issues() {
    return {
      get: (owner: string, repo: string, issueNumber: number) =>
        this.provider.issues.get(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          issueNumber,
        ),
      list: (
        owner: string,
        repo: string,
        options?: { state?: "open" | "closed" | "all" },
      ) =>
        this.provider.issues.list(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          options,
        ),
    };
  }

  public get pullRequests() {
    return {
      get: (owner: string, repo: string, prNumber: number) =>
        this.provider.pullRequests.get(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          prNumber,
        ),
      list: (
        owner: string,
        repo: string,
        options?: { state?: "open" | "closed" | "all" },
      ) =>
        this.provider.pullRequests.list(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          options,
        ),
      listReviews: (owner: string, repo: string, prNumber: number) =>
        this.provider.pullRequests.listReviews(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          prNumber,
        ),
      create: (
        owner: string,
        repo: string,
        title: string,
        head: string,
        base: string,
        body?: string,
      ) =>
        this.provider.pullRequests.create(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          title,
          head,
          base,
          body,
        ),
      listComments: (owner: string, repo: string, prNumber: number) =>
        this.provider.pullRequests.listComments(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          prNumber,
        ),
      createComment: (
        owner: string,
        repo: string,
        prNumber: number,
        body: string,
      ) =>
        this.provider.pullRequests.createComment(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          prNumber,
          body,
        ),
      getCIStatus: (owner: string, repo: string, prNumber: number) =>
        this.provider.pullRequests.getCIStatus(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          prNumber,
        ),
    };
  }

  public get repos() {
    return {
      get: (owner: string, repo: string) =>
        this.provider.repos.get(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
        ),
      listUser: () =>
        this.provider.repos.listUser(this.tokenSourceId, this.providerId),
      listOrg: (org: string) =>
        this.provider.repos.listOrg(this.tokenSourceId, this.providerId, org),
      listUserOrganizations: () =>
        this.provider.repos.listUserOrganizations(
          this.tokenSourceId,
          this.providerId,
        ),
    };
  }

  public get branches() {
    return {
      list: (owner: string, repo: string) =>
        this.provider.branches.list(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
        ),
      create: (
        owner: string,
        repo: string,
        name: string,
        fromBranch?: string,
      ) =>
        this.provider.branches.create(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          name,
          fromBranch,
        ),
    };
  }

  public get files() {
    return {
      getContent: (owner: string, repo: string, path: string, ref?: string) =>
        this.provider.files.getContent(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          path,
          ref,
        ),
      getDirectory: (owner: string, repo: string, path: string, ref?: string) =>
        this.provider.files.getDirectory(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          path,
          ref,
        ),
      update: (
        owner: string,
        repo: string,
        path: string,
        content: string,
        message: string,
        branch: string,
      ) =>
        this.provider.files.update(
          this.tokenSourceId,
          this.providerId,
          owner,
          repo,
          path,
          content,
          message,
          branch,
        ),
    };
  }
}

/**
 * Issue Operations
 */
class IssueOperations {
  constructor(private provider: VCSProviderSingleton) {}

  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<Issue> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      async (vcsProvider, client) => {
        // Note: VCSProvider interface doesn't have getIssue, only listIssues
        // We'd need to add this method to the interface or filter from list
        const issues = await vcsProvider.listIssues(client, owner, repo);
        const issue = issues.find((i) => i.number === issueNumber);

        if (!issue) {
          throw new Error(`Issue #${issueNumber} not found`);
        }

        return issue;
      },
    );
  }

  async list(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listIssues(client, owner, repo, options);
      },
    );
  }
}

/**
 * Pull Request Operations
 */
class PullRequestOperations {
  constructor(private provider: VCSProviderSingleton) {}

  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PullRequest> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.getPullRequest(client, owner, repo, prNumber);
      },
    );
  }

  async list(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<PullRequest[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listPullRequests(client, owner, repo, options);
      },
    );
  }

  async listReviews(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Review[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listPullRequestReviews(
          client,
          owner,
          repo,
          prNumber,
        );
      },
    );
  }

  async create(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string,
  ): Promise<PullRequest> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.createPullRequest(
          client,
          owner,
          repo,
          title,
          head,
          base,
          body,
        );
      },
    );
  }

  async listComments(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PRComment[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listPRComments(client, owner, repo, prNumber);
      },
    );
  }

  async createComment(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
  ): Promise<PRComment> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.createPRComment(client, owner, repo, prNumber, body);
      },
    );
  }

  async getCIStatus(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<CIStatusSummary | null> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.getCIStatus(client, owner, repo, prNumber);
      },
    );
  }
}

/**
 * Repository Operations
 */
class RepositoryOperations {
  constructor(private provider: VCSProviderSingleton) {}

  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
  ): Promise<Repository> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.getRepository(client, owner, repo);
      },
    );
  }

  async listUser(
    tokenSourceId: string,
    providerId: ProviderId,
  ): Promise<Repository[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listUserRepositories(client);
      },
    );
  }

  async listOrg(
    tokenSourceId: string,
    providerId: ProviderId,
    org: string,
  ): Promise<Repository[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listOrgRepositories(client, org);
      },
    );
  }

  async listUserOrganizations(
    tokenSourceId: string,
    providerId: ProviderId,
  ): Promise<Array<{ login: string; id: string; avatarUrl: string }>> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listUserOrganizations(client);
      },
    );
  }
}

/**
 * Branch Operations
 */
class BranchOperations {
  constructor(private provider: VCSProviderSingleton) {}

  async list(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
  ): Promise<Branch[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.listBranches(client, owner, repo);
      },
    );
  }

  async create(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    name: string,
    fromBranch?: string,
  ): Promise<Branch> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.createBranch(client, owner, repo, name, fromBranch);
      },
    );
  }
}

/**
 * File Operations
 */
class FileOperations {
  constructor(private provider: VCSProviderSingleton) {}

  async getContent(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<FileContent | null> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.getFileContent(client, owner, repo, path, ref);
      },
    );
  }

  async getDirectory(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<DirectoryEntry[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.getDirectoryContent(client, owner, repo, path, ref);
      },
    );
  }

  async update(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
  ): Promise<FileContent> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => {
        return vcsProvider.updateFile(
          client,
          owner,
          repo,
          path,
          content,
          message,
          branch,
        );
      },
    );
  }
}
