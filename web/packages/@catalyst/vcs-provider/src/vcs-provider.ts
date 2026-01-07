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
 * - TODO: Implement support for provider instance URLs (e.g., gitlab.company.com)
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
 *   requiredEnvVars: ['GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET'],
 * });
 * 
 * // 2. Use anywhere - specify provider for each operation
 * const vcs = VCSProviderSingleton.getInstance();
 * 
 * // Get an issue from GitHub
 * const issue = await vcs.issues.get(tokenSourceId, 'github', owner, repo, issueNumber);
 * 
 * // List pull requests from GitLab
 * const prs = await vcs.pullRequests.list(tokenSourceId, 'gitlab', owner, repo, { state: 'open' });
 * 
 * // Get repository from GitHub
 * const repo = await vcs.repos.get(tokenSourceId, 'github', owner, repo);
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
} from "./types";
import { providerRegistry } from "./provider-registry";

/**
 * Configuration options for the VCS Provider Singleton
 */
export interface VCSProviderConfig {
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
   * @param config - Configuration with token callbacks and env requirements
   * @throws Error if already initialized or if required env vars are missing
   */
  public static initialize(config: VCSProviderConfig): void {
    if (VCSProviderSingleton.instance !== null) {
      throw new Error("VCSProviderSingleton already initialized");
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
   * Reset the singleton (for testing)
   * @internal
   */
  public static reset(): void {
    VCSProviderSingleton.instance = null;
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
    return {
      providerId: actualProviderId,
      raw: tokens, // This will be replaced with actual provider client
    };
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
      return null;
    }
  }
}

/**
 * Issue Operations
 */
class IssueOperations {
  constructor(private provider: VCSProviderSingleton) {}

  /**
   * Get a specific issue
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue number
   */
  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<Issue> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    // Note: VCSProvider interface doesn't have getIssue, only listIssues
    // We'd need to add this method to the interface or filter from list
    const issues = await vcsProvider.listIssues(client, owner, repo);
    const issue = issues.find((i) => i.number === issueNumber);
    
    if (!issue) {
      throw new Error(`Issue #${issueNumber} not found`);
    }
    
    return issue;
  }

  /**
   * List issues in a repository
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param options - Optional filters (state)
   */
  async list(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listIssues(client, owner, repo, options);
  }
}

/**
 * Pull Request Operations
 */
class PullRequestOperations {
  constructor(private provider: VCSProviderSingleton) {}

  /**
   * Get a specific pull request
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   */
  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PullRequest> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.getPullRequest(client, owner, repo, prNumber);
  }

  /**
   * List pull requests
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param options - Optional filters (state)
   */
  async list(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<PullRequest[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listPullRequests(client, owner, repo, options);
  }

  /**
   * List pull request reviews
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   */
  async listReviews(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Review[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listPullRequestReviews(client, owner, repo, prNumber);
  }

  /**
   * Create a pull request
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param title - Pull request title
   * @param head - Head branch
   * @param base - Base branch
   * @param body - Optional pull request body
   */
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
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.createPullRequest(
      client,
      owner,
      repo,
      title,
      head,
      base,
      body,
    );
  }

  /**
   * List PR comments
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   */
  async listComments(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PRComment[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listPRComments(client, owner, repo, prNumber);
  }

  /**
   * Create a PR comment
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @param body - Comment body
   */
  async createComment(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
  ): Promise<PRComment> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.createPRComment(client, owner, repo, prNumber, body);
  }

  /**
   * Get CI status for a pull request
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   */
  async getCIStatus(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<CIStatusSummary | null> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.getCIStatus(client, owner, repo, prNumber);
  }
}

/**
 * Repository Operations
 */
class RepositoryOperations {
  constructor(private provider: VCSProviderSingleton) {}

  /**
   * Get a specific repository
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
  ): Promise<Repository> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.getRepository(client, owner, repo);
  }

  /**
   * List user repositories
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   */
  async listUser(
    tokenSourceId: string,
    providerId: ProviderId,
  ): Promise<Repository[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listUserRepositories(client);
  }

  /**
   * List organization repositories
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param org - Organization name
   */
  async listOrg(
    tokenSourceId: string,
    providerId: ProviderId,
    org: string,
  ): Promise<Repository[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listOrgRepositories(client, org);
  }
}

/**
 * Branch Operations
 */
class BranchOperations {
  constructor(private provider: VCSProviderSingleton) {}

  /**
   * List branches in a repository
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async list(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
  ): Promise<Branch[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.listBranches(client, owner, repo);
  }

  /**
   * Create a branch
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param name - Branch name
   * @param fromBranch - Optional branch to create from
   */
  async create(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    name: string,
    fromBranch?: string,
  ): Promise<Branch> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.createBranch(client, owner, repo, name, fromBranch);
  }
}

/**
 * File Operations
 */
class FileOperations {
  constructor(private provider: VCSProviderSingleton) {}

  /**
   * Get file content
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param path - File path
   * @param ref - Optional branch/tag/commit ref
   */
  async getContent(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<FileContent | null> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.getFileContent(client, owner, repo, path, ref);
  }

  /**
   * Get directory content
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param path - Directory path
   * @param ref - Optional branch/tag/commit ref
   */
  async getDirectory(
    tokenSourceId: string,
    providerId: ProviderId,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<DirectoryEntry[]> {
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.getDirectoryContent(client, owner, repo, path, ref);
  }

  /**
   * Update a file
   * 
   * @param tokenSourceId - User/team/project ID for token lookup
   * @param providerId - VCS provider ID (github, gitlab, bitbucket, azure)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param path - File path
   * @param content - File content
   * @param message - Commit message
   * @param branch - Branch to commit to
   */
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
    const client = await this.provider.getAuthenticatedClient(
      tokenSourceId,
      providerId,
    );
    const vcsProvider = providerRegistry.get(client.providerId);
    
    if (!vcsProvider) {
      throw new Error(`Provider ${client.providerId} not found`);
    }

    return vcsProvider.updateFile(
      client,
      owner,
      repo,
      path,
      content,
      message,
      branch,
    );
  }
}
