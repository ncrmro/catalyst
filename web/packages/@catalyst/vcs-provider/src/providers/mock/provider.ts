/**
 * Mock VCS Provider
 *
 * A configurable mock implementation of VCSProvider for testing without real GitHub credentials.
 * Provides default mock data that can be customized through constructor options.
 */

import type {
  VCSProvider,
  ProviderId,
  AuthenticatedClient,
  ConnectionStatus,
  Repository,
  FileContent,
  DirectoryEntry,
  PullRequest,
  Review,
  Issue,
  PRComment,
  WebhookEvent,
  Branch,
  CIStatusSummary,
} from "../../types";
import {
  DEFAULT_MOCK_REPOS,
  DEFAULT_MOCK_DIRECTORY,
  DEFAULT_MOCK_FILES,
} from "./data";

/**
 * Configuration options for MockVCSProvider
 */
export interface MockVCSProviderOptions {
  /** Override default repositories */
  repositories?: Repository[];
  /** Override directory structure: path -> entries */
  directories?: Record<string, DirectoryEntry[]>;
  /** Override file contents: path -> content */
  files?: Record<string, string>;
  /** Simulate delays (ms) for all operations */
  delay?: number;
  /** Simulate errors for specific operations */
  errors?: {
    authenticate?: Error;
    checkConnection?: Error;
    getDirectory?: Error;
    getContent?: Error;
    listRepos?: Error;
  };
}

/**
 * Mock VCS Provider implementation
 * Provides a fully functional VCSProvider without external dependencies
 */
export class MockVCSProvider implements VCSProvider {
  readonly id: ProviderId = "github";
  readonly name = "GitHub (Mock)";
  readonly iconName = "github";

  private options: Required<Omit<MockVCSProviderOptions, "errors">> & {
    errors: NonNullable<MockVCSProviderOptions["errors"]>;
  };

  constructor(options: MockVCSProviderOptions = {}) {
    this.options = {
      repositories: options.repositories ?? DEFAULT_MOCK_REPOS,
      directories: options.directories ?? DEFAULT_MOCK_DIRECTORY,
      files: options.files ?? DEFAULT_MOCK_FILES,
      delay: options.delay ?? 0,
      errors: options.errors ?? {},
    };
  }

  /**
   * Simulate network delay if configured
   */
  private async maybeDelay(): Promise<void> {
    if (this.options.delay > 0) {
      await new Promise((r) => setTimeout(r, this.options.delay));
    }
  }

  /**
   * Authenticate a user and return a mock authenticated client
   */
  async authenticate(userId: string): Promise<AuthenticatedClient> {
    await this.maybeDelay();
    if (this.options.errors.authenticate) {
      throw this.options.errors.authenticate;
    }
    return {
      providerId: this.id,
      raw: { userId, mockClient: true },
    };
  }

  /**
   * Validate configuration (no-op for mock)
   */
  validateConfig(): void {
    // Mock provider doesn't require environment variables
  }

  /**
   * Check connection status for a user
   */
  async checkConnection(userId: string): Promise<ConnectionStatus> {
    await this.maybeDelay();
    if (this.options.errors.checkConnection) {
      throw this.options.errors.checkConnection;
    }
    return {
      connected: true,
      username: "mock-user",
      avatarUrl: "https://github.com/mock-user.png",
      authMethod: "oauth",
    };
  }

  /**
   * List organizations for authenticated user
   */
  async listUserOrganizations(
    client: AuthenticatedClient,
  ): Promise<Array<{ login: string; id: string; avatarUrl: string }>> {
    await this.maybeDelay();
    return [
      {
        login: "test-org",
        id: "1",
        avatarUrl: "https://github.com/test-org.png",
      },
      {
        login: "mock-org",
        id: "2",
        avatarUrl: "https://github.com/mock-org.png",
      },
    ];
  }

  /**
   * List repositories for authenticated user
   */
  async listUserRepositories(
    client: AuthenticatedClient,
  ): Promise<Repository[]> {
    await this.maybeDelay();
    if (this.options.errors.listRepos) {
      throw this.options.errors.listRepos;
    }
    return this.options.repositories;
  }

  /**
   * List repositories for an organization
   */
  async listOrgRepositories(
    client: AuthenticatedClient,
    org: string,
  ): Promise<Repository[]> {
    await this.maybeDelay();
    // Filter repositories by owner matching org
    return this.options.repositories.filter((repo) => repo.owner === org);
  }

  /**
   * Get a specific repository
   */
  async getRepository(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
  ): Promise<Repository> {
    await this.maybeDelay();
    const found = this.options.repositories.find(
      (r) => r.owner === owner && r.name === repo,
    );
    if (!found) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }
    return found;
  }

  /**
   * Get file content from a repository
   */
  async getFileContent(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<FileContent | null> {
    await this.maybeDelay();
    if (this.options.errors.getContent) {
      throw this.options.errors.getContent;
    }

    const content = this.options.files[path];
    if (!content) return null;

    const fileName = path.split("/").pop() || path;
    return {
      name: fileName,
      path,
      content,
      sha: `mock-sha-${path.replace(/\//g, "-")}`,
      htmlUrl: `https://github.com/${owner}/${repo}/blob/${ref || "main"}/${path}`,
    };
  }

  /**
   * Get directory contents from a repository
   */
  async getDirectoryContent(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<DirectoryEntry[]> {
    await this.maybeDelay();
    if (this.options.errors.getDirectory) {
      throw this.options.errors.getDirectory;
    }
    return this.options.directories[path] ?? [];
  }

  /**
   * Create a new branch
   */
  async createBranch(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    name: string,
    fromBranch?: string,
  ): Promise<Branch> {
    await this.maybeDelay();
    return {
      name,
      sha: `mock-sha-${name}`,
    };
  }

  /**
   * Update file content
   */
  async updateFile(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
  ): Promise<FileContent> {
    await this.maybeDelay();
    // Update our internal mock data
    this.options.files[path] = content;
    const fileName = path.split("/").pop() || path;
    return {
      name: fileName,
      path,
      content,
      sha: `mock-sha-${path.replace(/\//g, "-")}-updated`,
      htmlUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
    };
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<PullRequest[]> {
    await this.maybeDelay();
    // Return mock PRs
    const mockPRs: PullRequest[] = [
      {
        id: "1",
        number: 1,
        title: "Add new feature",
        body: "This PR adds a new feature",
        state: "open",
        draft: false,
        author: "mock-user",
        authorAvatarUrl: "https://github.com/mock-user.png",
        sourceBranch: "feature/new-feature",
        targetBranch: "main",
        headRef: "feature/new-feature",
        headSha: "abc123",
        htmlUrl: `https://github.com/${owner}/${repo}/pull/1`,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        labels: ["enhancement"],
        reviewers: [],
      },
    ];

    const state = options?.state ?? "open";
    if (state === "all") return mockPRs;
    return mockPRs.filter((pr) => pr.state === state);
  }

  /**
   * Get a specific pull request
   */
  async getPullRequest(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<PullRequest> {
    await this.maybeDelay();
    return {
      id: String(number),
      number,
      title: `Mock PR #${number}`,
      body: "This is a mock pull request",
      state: "open",
      draft: false,
      author: "mock-user",
      authorAvatarUrl: "https://github.com/mock-user.png",
      sourceBranch: "feature/mock",
      targetBranch: "main",
      headRef: "feature/mock",
      headSha: "abc123",
      htmlUrl: `https://github.com/${owner}/${repo}/pull/${number}`,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
      labels: [],
      reviewers: [],
    };
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string,
  ): Promise<PullRequest> {
    await this.maybeDelay();
    return {
      id: "new-pr",
      number: 999,
      title,
      body: body || "",
      state: "open",
      draft: false,
      author: "mock-user",
      authorAvatarUrl: "https://github.com/mock-user.png",
      sourceBranch: head,
      targetBranch: base,
      headRef: head,
      headSha: "new-sha",
      htmlUrl: `https://github.com/${owner}/${repo}/pull/999`,
      createdAt: new Date(),
      updatedAt: new Date(),
      labels: [],
      reviewers: [],
    };
  }

  /**
   * List pull request reviews
   */
  async listPullRequestReviews(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<Review[]> {
    await this.maybeDelay();
    return [
      {
        id: "review-1",
        author: "reviewer-1",
        state: "approved",
        body: "Looks good!",
        submittedAt: new Date("2024-01-03T00:00:00Z"),
      },
    ];
  }

  /**
   * List PR comments
   */
  async listPRComments(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<PRComment[]> {
    await this.maybeDelay();
    return [
      {
        id: 1,
        body: "This is a mock comment",
        author: "mock-user",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ];
  }

  /**
   * Create a PR comment
   */
  async createPRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
    body: string,
  ): Promise<PRComment> {
    await this.maybeDelay();
    return {
      id: 999,
      body,
      author: "mock-user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update a PR comment
   */
  async updatePRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<PRComment> {
    await this.maybeDelay();
    return {
      id: commentId,
      body,
      author: "mock-user",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date(),
    };
  }

  /**
   * Delete a PR comment
   */
  async deletePRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    commentId: number,
  ): Promise<void> {
    await this.maybeDelay();
    // No-op for mock
  }

  /**
   * Get CI status for a pull request
   */
  async getCIStatus(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<CIStatusSummary | null> {
    await this.maybeDelay();
    return {
      overall: "passing",
      checks: [
        {
          id: "check-1",
          name: "Test Suite",
          state: "passing",
          url: `https://github.com/${owner}/${repo}/runs/1`,
          description: "All tests passed",
          context: "test",
          source: "github-actions",
        },
      ],
      totalChecks: 1,
      passingChecks: 1,
      failingChecks: 0,
      pendingChecks: 0,
    };
  }

  /**
   * List issues
   */
  async listIssues(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]> {
    await this.maybeDelay();
    const mockIssues: Issue[] = [
      {
        id: "1",
        number: 1,
        title: "Mock issue",
        state: "open",
        author: "mock-user",
        htmlUrl: `https://github.com/${owner}/${repo}/issues/1`,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        labels: ["bug"],
      },
    ];

    const state = options?.state ?? "open";
    if (state === "all") return mockIssues;
    return mockIssues.filter((issue) => issue.state === state);
  }

  /**
   * List branches
   */
  async listBranches(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
  ): Promise<Branch[]> {
    await this.maybeDelay();
    return [
      { name: "main", sha: "main-sha" },
      { name: "develop", sha: "develop-sha" },
      { name: "feature/test", sha: "feature-sha" },
    ];
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    // Mock always returns true
    return true;
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(headers: Headers, payload: unknown): WebhookEvent {
    // Return a mock webhook event
    return {
      type: "push",
      sender: "mock-user",
    };
  }
}
