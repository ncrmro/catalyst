/**
 * Forgejo VCS Provider
 *
 * Implementation of VCSProvider interface for Forgejo/Gitea.
 * Forgejo is a self-hosted Git forge with a Gitea-compatible API.
 *
 * NOTE: Token management (storage, refresh) is handled by VCSProviderSingleton
 * via callbacks provided during initialization. This provider focuses on
 * API operations only.
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
  CICheck,
  CICheckState,
  CICheckSource,
} from "../../types";
import { createHmac, timingSafeEqual } from "crypto";

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

/**
 * Forgejo configuration
 */
export interface ForejoConfig {
  /**
   * Base URL of the Forgejo instance (e.g., "https://forgejo.example.com")
   * Required since Forgejo is self-hosted
   */
  baseUrl: string;

  /**
   * OAuth2 Client ID for user authentication
   */
  clientId?: string;

  /**
   * OAuth2 Client Secret for user authentication
   */
  clientSecret?: string;

  /**
   * Webhook secret for validating webhook payloads
   */
  webhookSecret?: string;

  /**
   * Personal Access Token for fallback authentication (optional)
   */
  pat?: string;
}

/**
 * Build Forgejo configuration from environment variables
 */
function buildForejoConfig(): ForejoConfig {
  const config: ForejoConfig = {
    baseUrl: process.env.FORGEJO_BASE_URL || "",
    clientId: process.env.FORGEJO_CLIENT_ID,
    clientSecret: process.env.FORGEJO_CLIENT_SECRET,
    webhookSecret: process.env.FORGEJO_WEBHOOK_SECRET,
    pat: process.env.FORGEJO_PAT || process.env.FORGEJO_TOKEN,
  };

  return config;
}

export const FORGEJO_CONFIG = buildForejoConfig();

/**
 * Forgejo API Client
 * Uses the Gitea-compatible REST API
 */
class ForejoClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers = {
      Authorization: `token ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Forgejo API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getUser(): Promise<{
    id: number;
    login: string;
    email: string;
    avatar_url: string;
  }> {
    return this.request("/user");
  }

  async listUserRepos(): Promise<any[]> {
    return this.request("/user/repos?limit=100");
  }

  async listOrgRepos(org: string): Promise<any[]> {
    return this.request(`/orgs/${org}/repos?limit=100`);
  }

  async getRepo(owner: string, repo: string): Promise<any> {
    return this.request(`/repos/${owner}/${repo}`);
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<any> {
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    return this.request(`/repos/${owner}/${repo}/contents/${path}${refParam}`);
  }

  async getDirectoryContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<any[]> {
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    return this.request(`/repos/${owner}/${repo}/contents/${path}${refParam}`);
  }

  async listBranches(owner: string, repo: string): Promise<any[]> {
    return this.request(`/repos/${owner}/${repo}/branches?limit=100`);
  }

  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromBranch: string,
  ): Promise<any> {
    // Get the SHA of the base branch first
    const baseBranch = await this.request<any>(
      `/repos/${owner}/${repo}/branches/${fromBranch}`,
    );

    // Create new branch from the SHA
    return this.request(`/repos/${owner}/${repo}/branches`, {
      method: "POST",
      body: JSON.stringify({
        new_branch_name: branchName,
        old_ref_name: fromBranch,
      }),
    });
  }

  async listPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<any[]> {
    return this.request(
      `/repos/${owner}/${repo}/pulls?state=${state}&limit=100`,
    );
  }

  async getPullRequest(
    owner: string,
    repo: string,
    number: number,
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/pulls/${number}`);
  }

  async createPullRequest(
    owner: string,
    repo: string,
    data: {
      title: string;
      head: string;
      base: string;
      body?: string;
    },
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listPullRequestReviews(
    owner: string,
    repo: string,
    number: number,
  ): Promise<any[]> {
    return this.request(`/repos/${owner}/${repo}/pulls/${number}/reviews`);
  }

  async listPullRequestComments(
    owner: string,
    repo: string,
    number: number,
  ): Promise<any[]> {
    return this.request(`/repos/${owner}/${repo}/pulls/${number}/comments`);
  }

  async listIssueComments(
    owner: string,
    repo: string,
    number: number,
  ): Promise<any[]> {
    // Forgejo/Gitea uses /issues endpoint for PR comments (like GitHub)
    return this.request(`/repos/${owner}/${repo}/issues/${number}/comments`);
  }

  async createIssueComment(
    owner: string,
    repo: string,
    number: number,
    body: string,
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  async updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/issues/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
  }

  async deleteComment(
    owner: string,
    repo: string,
    commentId: number,
  ): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/issues/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  async listIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<any[]> {
    return this.request(
      `/repos/${owner}/${repo}/issues?state=${state}&limit=100`,
    );
  }

  async listOrganizations(): Promise<any[]> {
    return this.request("/user/orgs?limit=100");
  }

  async getCombinedStatus(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/commits/${ref}/status`);
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    data: {
      content: string;
      message: string;
      branch?: string;
      sha?: string;
    },
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

/**
 * Token storage interface for Forgejo
 * Applications should implement this based on their storage mechanism
 */
interface ForejoTokenGetter {
  (userId: string): Promise<{ accessToken: string } | null>;
}

let tokenGetter: ForejoTokenGetter | null = null;

/**
 * Register a token getter function
 * This should be called by the application during initialization
 */
export function registerForejoTokenGetter(getter: ForejoTokenGetter): void {
  tokenGetter = getter;
}

/**
 * Get Forgejo access token for a user
 */
async function getForejoToken(userId: string): Promise<string | null> {
  if (!tokenGetter) {
    throw new Error(
      "Forgejo token getter not registered. Call registerForejoTokenGetter() during initialization.",
    );
  }

  const tokens = await tokenGetter(userId);
  return tokens?.accessToken || null;
}

/**
 * Get a Forgejo client for a user
 */
async function getForejoClient(
  userId: string,
  config: ForejoConfig = FORGEJO_CONFIG,
): Promise<ForejoClient> {
  // Try to get user token first
  const token = await getForejoToken(userId);

  if (token) {
    return new ForejoClient(config.baseUrl, token);
  }

  // Fall back to PAT if available and in non-production
  if (
    config.pat &&
    (process.env.NODE_ENV !== "production" ||
      process.env.FORGEJO_ALLOW_PAT_FALLBACK === "true")
  ) {
    console.warn(`Using Forgejo PAT for user ${userId} (no user token found)`);
    return new ForejoClient(config.baseUrl, config.pat);
  }

  throw new Error(
    `No Forgejo authentication available for user ${userId}. User needs to authenticate.`,
  );
}

/**
 * Forgejo VCS Provider implementation
 */
export class ForejoProvider implements VCSProvider {
  readonly id: ProviderId = "forgejo";
  readonly name = "Forgejo";
  readonly iconName = "forgejo";

  private config: ForejoConfig;

  constructor(config?: Partial<ForejoConfig>) {
    this.config = { ...FORGEJO_CONFIG, ...config };
  }

  /**
   * Validate provider configuration
   */
  validateConfig(): void {
    // Skip validation during build
    if (isNextJsBuild) {
      return;
    }

    if (!this.config.baseUrl) {
      throw new Error(
        "Missing required Forgejo environment variable: FORGEJO_BASE_URL",
      );
    }

    // Validate URL format
    try {
      new URL(this.config.baseUrl);
    } catch {
      throw new Error(
        `Invalid FORGEJO_BASE_URL: ${this.config.baseUrl}. Must be a valid URL (e.g., https://forgejo.example.com)`,
      );
    }
  }

  /**
   * Authenticate a user and return an authenticated client
   */
  async authenticate(userId: string): Promise<AuthenticatedClient> {
    const client = await getForejoClient(userId, this.config);
    return {
      providerId: this.id,
      raw: client,
    };
  }

  /**
   * Check the connection status for a user
   */
  async checkConnection(userId: string): Promise<ConnectionStatus> {
    try {
      const client = await getForejoClient(userId, this.config);
      const user = await client.getUser();

      return {
        connected: true,
        username: user.login,
        avatarUrl: user.avatar_url,
        authMethod: "oauth",
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List organizations for the authenticated user
   */
  async listUserOrganizations(
    client: AuthenticatedClient,
  ): Promise<Array<{ login: string; id: string; avatarUrl: string }>> {
    const forejoClient = client.raw as ForejoClient;
    const orgs = await forejoClient.listOrganizations();

    return orgs.map((org) => ({
      login: org.username || org.login,
      id: String(org.id),
      avatarUrl: org.avatar_url || "",
    }));
  }

  /**
   * List repositories for the authenticated user
   */
  async listUserRepositories(
    client: AuthenticatedClient,
  ): Promise<Repository[]> {
    const forejoClient = client.raw as ForejoClient;
    const repos = await forejoClient.listUserRepos();
    return repos.map((repo) => this.mapRepository(repo));
  }

  /**
   * List repositories for an organization
   */
  async listOrgRepositories(
    client: AuthenticatedClient,
    org: string,
  ): Promise<Repository[]> {
    const forejoClient = client.raw as ForejoClient;
    const repos = await forejoClient.listOrgRepos(org);
    return repos.map((repo) => this.mapRepository(repo));
  }

  /**
   * Get a specific repository
   */
  async getRepository(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
  ): Promise<Repository> {
    const forejoClient = client.raw as ForejoClient;
    const repoData = await forejoClient.getRepo(owner, repo);
    return this.mapRepository(repoData);
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
    const forejoClient = client.raw as ForejoClient;
    try {
      const data = await forejoClient.getFileContent(owner, repo, path, ref);

      if (Array.isArray(data) || data.type !== "file") {
        return null;
      }

      const content =
        data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf-8")
          : data.content;

      return {
        name: data.name,
        path: data.path,
        content,
        sha: data.sha,
        htmlUrl: data.html_url || "",
      };
    } catch {
      return null;
    }
  }

  /**
   * Get directory content from a repository
   */
  async getDirectoryContent(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<DirectoryEntry[]> {
    const forejoClient = client.raw as ForejoClient;
    try {
      const data = await forejoClient.getDirectoryContent(
        owner,
        repo,
        path,
        ref,
      );

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as "file" | "dir" | "submodule" | "symlink",
        sha: item.sha,
        htmlUrl: item.html_url || "",
      }));
    } catch {
      return [];
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    name: string,
    fromBranch: string = "main",
  ): Promise<Branch> {
    const forejoClient = client.raw as ForejoClient;
    const branch = await forejoClient.createBranch(
      owner,
      repo,
      name,
      fromBranch,
    );

    return {
      name: branch.name,
      sha: branch.commit?.id || branch.commit?.sha || "",
    };
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
    const forejoClient = client.raw as ForejoClient;

    try {
      // Get PR to get the head SHA
      const pr = await forejoClient.getPullRequest(owner, repo, prNumber);
      const headSha = pr.head.sha;

      // Fetch combined status
      const status = await forejoClient.getCombinedStatus(owner, repo, headSha);

      const checks: CICheck[] = [];

      // Process statuses
      if (status.statuses && Array.isArray(status.statuses)) {
        for (const s of status.statuses) {
          checks.push(this.normalizeStatus(s));
        }
      }

      // Calculate summary
      const passingChecks = checks.filter((c) => c.state === "passing").length;
      const failingChecks = checks.filter((c) => c.state === "failing").length;
      const pendingChecks = checks.filter((c) => c.state === "pending").length;

      // Determine overall state
      let overall: CICheckState = "passing";
      if (failingChecks > 0) {
        overall = "failing";
      } else if (pendingChecks > 0) {
        overall = "pending";
      }

      return {
        overall,
        checks,
        totalChecks: checks.length,
        passingChecks,
        failingChecks,
        pendingChecks,
      };
    } catch (error) {
      console.error(`Error fetching CI status:`, error);
      return null;
    }
  }

  private normalizeStatus(status: any): CICheck {
    let state: CICheckState;
    switch (status.state) {
      case "success":
        state = "passing";
        break;
      case "failure":
      case "error":
        state = "failing";
        break;
      case "pending":
        state = "pending";
        break;
      default:
        state = "pending";
    }

    let source: CICheckSource = "external";
    const context = (status.context || "").toLowerCase();

    if (context.includes("forgejo") || context.includes("gitea"))
      source = "catalyst";
    else if (context.includes("cloudflare")) source = "cloudflare";
    else if (context.includes("vercel")) source = "vercel";
    else if (context.includes("catalyst")) source = "catalyst";

    return {
      id: String(status.id),
      name: status.context || "unknown",
      state,
      url: status.target_url || undefined,
      description: status.description || undefined,
      context: status.context || "",
      startedAt: status.created_at
        ? new Date(status.created_at)
        : undefined,
      completedAt: status.updated_at
        ? new Date(status.updated_at)
        : undefined,
      source,
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
    const forejoClient = client.raw as ForejoClient;

    // Get current file SHA (if it exists)
    let sha: string | undefined;
    try {
      const currentFile = await forejoClient.getFileContent(
        owner,
        repo,
        path,
        branch,
      );
      if (currentFile && !Array.isArray(currentFile) && currentFile.sha) {
        sha = currentFile.sha;
      }
    } catch {
      // File doesn't exist, will be created
    }

    // Update/Create file
    const result = await forejoClient.updateFile(owner, repo, path, {
      content: Buffer.from(content).toString("base64"),
      message,
      branch,
      sha,
    });

    return {
      name: result.content?.name || path.split("/").pop() || "unknown",
      path: result.content?.path || path,
      content,
      sha: result.content?.sha || "",
      htmlUrl: result.content?.html_url || "",
    };
  }

  /**
   * List pull requests for a repository
   */
  async listPullRequests(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<PullRequest[]> {
    const forejoClient = client.raw as ForejoClient;
    const prs = await forejoClient.listPullRequests(
      owner,
      repo,
      options?.state || "open",
    );
    return prs.map((pr) => this.mapPullRequest(pr));
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
    const forejoClient = client.raw as ForejoClient;
    const pr = await forejoClient.getPullRequest(owner, repo, number);
    return this.mapPullRequest(pr);
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
    const forejoClient = client.raw as ForejoClient;
    const pr = await forejoClient.createPullRequest(owner, repo, {
      title,
      head,
      base,
      body,
    });
    return this.mapPullRequest(pr);
  }

  /**
   * List reviews for a pull request
   */
  async listPullRequestReviews(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<Review[]> {
    const forejoClient = client.raw as ForejoClient;
    const reviews = await forejoClient.listPullRequestReviews(
      owner,
      repo,
      number,
    );

    return reviews.map((review) => ({
      id: String(review.id),
      author: review.user?.login || review.user?.username || "unknown",
      state: this.mapReviewState(review.state),
      body: review.body || undefined,
      submittedAt: review.submitted_at
        ? new Date(review.submitted_at)
        : undefined,
    }));
  }

  /**
   * List comments on a pull request
   */
  async listPRComments(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
  ): Promise<PRComment[]> {
    const forejoClient = client.raw as ForejoClient;
    const comments = await forejoClient.listIssueComments(owner, repo, number);

    return comments.map((comment) => ({
      id: comment.id,
      body: comment.body || "",
      author: comment.user?.login || comment.user?.username || "unknown",
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
    }));
  }

  /**
   * Create a comment on a pull request
   */
  async createPRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    number: number,
    body: string,
  ): Promise<PRComment> {
    const forejoClient = client.raw as ForejoClient;
    const comment = await forejoClient.createIssueComment(
      owner,
      repo,
      number,
      body,
    );

    return {
      id: comment.id,
      body: comment.body || "",
      author: comment.user?.login || comment.user?.username || "unknown",
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
    };
  }

  /**
   * Update a comment on a pull request
   */
  async updatePRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<PRComment> {
    const forejoClient = client.raw as ForejoClient;
    const comment = await forejoClient.updateComment(
      owner,
      repo,
      commentId,
      body,
    );

    return {
      id: comment.id,
      body: comment.body || "",
      author: comment.user?.login || comment.user?.username || "unknown",
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
    };
  }

  /**
   * Delete a comment on a pull request
   */
  async deletePRComment(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    commentId: number,
  ): Promise<void> {
    const forejoClient = client.raw as ForejoClient;
    await forejoClient.deleteComment(owner, repo, commentId);
  }

  async listIssues(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]> {
    const forejoClient = client.raw as ForejoClient;
    const issues = await forejoClient.listIssues(
      owner,
      repo,
      options?.state || "open",
    );

    // Filter out pull requests (Forgejo returns PRs in issues endpoint like GitHub)
    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: String(issue.id),
        number: issue.number,
        title: issue.title,
        state: issue.state as "open" | "closed",
        author: issue.user?.login || issue.user?.username || "unknown",
        htmlUrl: issue.html_url,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        labels: issue.labels?.map((label: any) => label.name || "") || [],
      }));
  }

  /**
   * List branches for a repository
   */
  async listBranches(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
  ): Promise<Branch[]> {
    const forejoClient = client.raw as ForejoClient;
    const branches = await forejoClient.listBranches(owner, repo);

    return branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit?.id || branch.commit?.sha || "",
    }));
  }

  /**
   * Verify a webhook signature
   * Forgejo uses the same HMAC-SHA256 pattern as GitHub
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

    try {
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse a webhook event
   */
  parseWebhookEvent(headers: Headers, payload: unknown): WebhookEvent {
    const eventType = headers.get("x-forgejo-event") || headers.get("x-gitea-event") || "";
    const data = payload as Record<string, unknown>;

    const baseEvent: WebhookEvent = {
      type: this.mapEventType(eventType),
      action: data.action as string | undefined,
      sender: (data.sender as { login?: string; username?: string })?.login ||
        (data.sender as { login?: string; username?: string })?.username ||
        "unknown",
    };

    if (data.repository) {
      const repo = data.repository as Record<string, unknown>;
      baseEvent.repository = {
        id: String(repo.id),
        name: repo.name as string,
        fullName: repo.full_name as string,
        owner: (repo.owner as { login?: string; username?: string })?.login ||
          (repo.owner as { login?: string; username?: string })?.username ||
          "",
        private: repo.private as boolean,
        defaultBranch: repo.default_branch as string,
        htmlUrl: repo.html_url as string,
        updatedAt: new Date(repo.updated_at as string),
      };
    }

    if (data.pull_request) {
      const pr = data.pull_request as Record<string, unknown>;
      baseEvent.pullRequest = {
        id: String(pr.id),
        number: pr.number as number,
        title: pr.title as string,
        state: this.mapPRState(pr.state as string, pr.merged as boolean),
        draft: pr.draft as boolean,
        author: (pr.user as { login?: string; username?: string })?.login ||
          (pr.user as { login?: string; username?: string })?.username ||
          "unknown",
        sourceBranch: (pr.head as { ref?: string })?.ref || "",
        targetBranch: (pr.base as { ref?: string })?.ref || "",
        headRef: (pr.head as { ref?: string })?.ref,
        headSha: (pr.head as { sha?: string })?.sha,
        htmlUrl: pr.html_url as string,
        createdAt: new Date(pr.created_at as string),
        updatedAt: new Date(pr.updated_at as string),
        labels: ((pr.labels as { name?: string }[]) || []).map(
          (l) => l.name || "",
        ),
        reviewers: [],
      };
    }

    return baseEvent;
  }

  // Private helper methods

  private mapRepository(repo: any): Repository {
    return {
      id: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || repo.owner?.username || "",
      private: repo.private,
      defaultBranch: repo.default_branch || "main",
      htmlUrl: repo.html_url,
      description: repo.description || undefined,
      language: repo.language || undefined,
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : new Date(),
    };
  }

  private mapPullRequest(pr: any): PullRequest {
    return {
      id: String(pr.id),
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: this.mapPRState(pr.state, pr.merged),
      draft: pr.draft || false,
      author: pr.user?.login || pr.user?.username || "unknown",
      authorAvatarUrl: pr.user?.avatar_url,
      sourceBranch: pr.head?.ref || "",
      targetBranch: pr.base?.ref || "",
      headRef: pr.head?.ref,
      headSha: pr.head?.sha,
      htmlUrl: pr.html_url,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      labels: pr.labels?.map((label: any) => label.name || "") || [],
      reviewers: pr.requested_reviewers?.map((r: any) => r.login || r.username) || [],
    };
  }

  private mapPRState(
    state: string,
    merged?: boolean,
  ): "open" | "closed" | "merged" {
    if (merged) return "merged";
    if (state === "open") return "open";
    return "closed";
  }

  private mapReviewState(
    state: string,
  ): "approved" | "changes_requested" | "commented" | "pending" {
    const normalized = state.toUpperCase();
    switch (normalized) {
      case "APPROVED":
        return "approved";
      case "REQUEST_CHANGES":
      case "CHANGES_REQUESTED":
        return "changes_requested";
      case "COMMENT":
      case "COMMENTED":
        return "commented";
      default:
        return "pending";
    }
  }

  private mapEventType(
    eventType: string,
  ): "push" | "pull_request" | "installation" | "issue" {
    switch (eventType) {
      case "push":
        return "push";
      case "pull_request":
        return "pull_request";
      case "issues":
        return "issue";
      default:
        return "push";
    }
  }
}
