/**
 * VCS Provider Types
 *
 * Provider-agnostic interfaces for Version Control System operations.
 */

// Provider identification
export type ProviderId = "github" | "gitlab" | "bitbucket" | "azure";

// Authentication
export interface ConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  error?: string;
  authMethod?: "oauth" | "pat" | "app";
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

// Generic authenticated client wrapper
export interface AuthenticatedClient {
  providerId: ProviderId;
  // Provider-specific client instance (e.g., Octokit for GitHub)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

// Repository types
export interface Repository {
  id: string;
  name: string;
  fullName: string; // owner/repo format
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description?: string;
  language?: string;
  updatedAt: Date;
}

export interface FileContent {
  name: string;
  path: string;
  content: string; // decoded content
  sha: string;
  htmlUrl: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "submodule" | "symlink";
  sha: string;
  htmlUrl: string;
}

// Pull/Merge Request types
export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  author: string;
  authorAvatarUrl?: string;
  sourceBranch: string;
  targetBranch: string;
  htmlUrl: string;
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
  reviewers: string[];
}

export interface Review {
  id: string;
  author: string;
  state: "approved" | "changes_requested" | "commented" | "pending";
  body?: string;
  submittedAt?: Date;
}

// Issue types
export interface Issue {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  htmlUrl: string;
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
}

// Comment types
export interface PRComment {
  id: number;
  body: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

// Webhook types
export interface WebhookEvent {
  type: "push" | "pull_request" | "installation" | "issue";
  action?: string;
  repository?: Repository;
  pullRequest?: PullRequest;
  sender: string;
}

// VCS Provider Interface
export interface VCSProvider {
  // Identity
  readonly id: ProviderId;
  readonly name: string;
  readonly iconName: string;

  // Authentication
  authenticate(userId: string): Promise<AuthenticatedClient>;
  checkConnection(userId: string): Promise<ConnectionStatus>;
  storeTokens(userId: string, tokens: TokenData): Promise<void>;
  refreshTokensIfNeeded(userId: string): Promise<TokenData | null>;

  // Repositories
  listUserRepositories(client: AuthenticatedClient): Promise<Repository[]>;
  listOrgRepositories(
    client: AuthenticatedClient,
    org: string,
  ): Promise<Repository[]>;
  getRepository(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
  ): Promise<Repository>;
  getFileContent(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<FileContent | null>;
  getDirectoryContent(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<DirectoryEntry[]>;

  // Pull/Merge Requests
  listPullRequests(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<PullRequest[]>;
  getPullRequest(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<PullRequest>;
  listPullRequestReviews(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<Review[]>;

  // PR Comments
  listPRComments(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<PRComment[]>;
  createPRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
    body: string,
  ): Promise<PRComment>;
  updatePRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<PRComment>;
  deletePRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    commentId: number,
  ): Promise<void>;

  // Issues
  listIssues(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]>;

  // Webhooks
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean;
  parseWebhookEvent(headers: Headers, payload: unknown): WebhookEvent;
}
