/**
 * GitHub VCS Provider
 *
 * Implementation of VCSProvider interface for GitHub.
 *
 * NOTE: Token management (storage, refresh) is handled by VCSProviderSingleton
 * via callbacks provided during initialization. This provider focuses on
 * API operations only.
 */

import { Octokit } from "@octokit/rest";
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
import { getUserOctokit, GITHUB_CONFIG } from "./client";
import { createHmac, timingSafeEqual } from "crypto";

// Check if we're in NextJS build phase - don't validate env vars during build
const isNextJsBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

/**
 * GitHub VCS Provider implementation
 */
export class GitHubProvider implements VCSProvider {
  readonly id: ProviderId = "github";
  readonly name = "GitHub";
  readonly iconName = "github";

  /**
   * Authenticate a user and return an authenticated client
   */
  async authenticate(userId: string): Promise<AuthenticatedClient> {
    const octokit = await getUserOctokit(userId);
    return {
      providerId: this.id,
      raw: octokit,
    };
  }

  /**
   * Validate provider configuration
   */
  validateConfig(): void {
    // Skip validation during build or if explicitly disabled
    if (isNextJsBuild || GITHUB_CONFIG.DISABLE_APP_CHECKS) {
      return;
    }

    const missingVars: string[] = [];

    if (!GITHUB_CONFIG.APP_ID) missingVars.push("GITHUB_APP_ID");
    if (!GITHUB_CONFIG.APP_PRIVATE_KEY)
      missingVars.push("GITHUB_APP_PRIVATE_KEY");
    if (!GITHUB_CONFIG.APP_CLIENT_ID) missingVars.push("GITHUB_APP_CLIENT_ID");
    if (!GITHUB_CONFIG.APP_CLIENT_SECRET)
      missingVars.push("GITHUB_APP_CLIENT_SECRET");
    if (!GITHUB_CONFIG.WEBHOOK_SECRET)
      missingVars.push("GITHUB_WEBHOOK_SECRET");

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required GitHub environment variables: ${missingVars.join(", ")}`,
      );
    }
  }

  /**
   * Check the connection status for a user
   *
   * NOTE: Token refresh is handled by VCSProviderSingleton.getValidToken()
   * which is called before this method. This method uses the authenticated
   * client that was created with refreshed tokens.
   */
  async checkConnection(client: AuthenticatedClient): Promise<ConnectionStatus> {
    try {
      // Validate that client.raw is an Octokit instance for GitHub provider
      if (!client.raw || typeof client.raw.rest !== 'object') {
        throw new Error('Invalid authenticated client: expected Octokit instance');
      }
      
      // Use the authenticated client that was already created with refreshed tokens
      const octokit = client.raw as Octokit;
      const { data: user } = await octokit.rest.users.getAuthenticated();

      return {
        connected: true,
        username: user.login,
        avatarUrl: user.avatar_url,
        authMethod: "oauth", // Default to oauth, could be enhanced to detect app vs oauth
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
    const octokit = client.raw as Octokit;
    const { data: orgs } = await octokit.rest.orgs.listForAuthenticatedUser({
      per_page: 100,
    });

    return orgs.map((org) => ({
      login: org.login,
      id: String(org.id),
      avatarUrl: org.avatar_url,
    }));
  }

  /**
   * List repositories for the authenticated user
   */
  async listUserRepositories(
    client: AuthenticatedClient,
  ): Promise<Repository[]> {
    const octokit = client.raw as Octokit;
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated",
    });

    return repos.map((repo) => this.mapRepository(repo));
  }

  /**
   * List repositories for an organization
   */
  async listOrgRepositories(
    client: AuthenticatedClient,
    org: string,
  ): Promise<Repository[]> {
    const octokit = client.raw as Octokit;
    const { data: repos } = await octokit.rest.repos.listForOrg({
      org,
      per_page: 100,
      sort: "updated",
    });

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
    const octokit = client.raw as Octokit;
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return this.mapRepository(data);
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
    const octokit = client.raw as Octokit;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

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
    const octokit = client.raw as Octokit;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

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
    const octokit = client.raw as Octokit;

    // 1. Get SHA of the base branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    const sha = refData.object.sha;

    // 2. Create new reference
    const { data: newRef } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${name}`,
      sha,
    });

    return {
      name,
      sha: newRef.object.sha,
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
    const octokit = client.raw as Octokit;

    try {
      return await this.fetchCIStatusInternal(octokit, owner, repo, prNumber);
    } catch (error) {
      console.error(`Error fetching CI status:`, error);
      return null;
    }
  }

  private async fetchCIStatusInternal(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<CIStatusSummary | null> {
    // Get PR to get the head SHA
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const headSha = pr.head.sha;

    // Fetch both check runs and commit statuses in parallel
    const [checkRunsResponse, statusesResponse] = await Promise.all([
      octokit.rest.checks
        .listForRef({
          owner,
          repo,
          ref: headSha,
        })
        .catch((error) => {
          console.warn("Could not fetch check runs:", error);
          return null;
        }),
      octokit.rest.repos
        .getCombinedStatusForRef({
          owner,
          repo,
          ref: headSha,
        })
        .catch((error) => {
          console.warn("Could not fetch commit statuses:", error);
          return null;
        }),
    ]);

    const checks: CICheck[] = [];

    // Process check runs (newer GitHub Checks API)
    if (checkRunsResponse) {
      for (const checkRun of checkRunsResponse.data.check_runs) {
        checks.push(this.normalizeCheckRun(checkRun));
      }
    }

    // Process commit statuses (older Status API)
    if (statusesResponse) {
      for (const status of statusesResponse.data.statuses) {
        checks.push(this.normalizeCommitStatus(status));
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
  }

  private normalizeCheckRun(checkRun: Record<string, unknown>): CICheck {
    let state: CICheckState = "pending";
    if (checkRun.status === "completed") {
      switch (checkRun.conclusion) {
        case "success":
          state = "passing";
          break;
        case "failure":
          state = "failing";
          break;
        case "cancelled":
        case "timed_out":
          state = "cancelled";
          break;
        case "skipped":
        case "neutral":
          state = "skipped";
          break;
        default:
          state = "failing";
      }
    } else if (
      checkRun.status === "queued" ||
      checkRun.status === "in_progress"
    ) {
      state = "pending";
    }

    let source: CICheckSource = "external";
    const name = (checkRun.name as string).toLowerCase();
    const app = checkRun.app as Record<string, unknown> | undefined;
    const appSlug = (app?.slug as string | undefined)?.toLowerCase() || "";

    if (name.includes("github") || appSlug.includes("github"))
      source = "github-actions";
    else if (name.includes("cloudflare") || appSlug.includes("cloudflare"))
      source = "cloudflare";
    else if (name.includes("vercel") || appSlug.includes("vercel"))
      source = "vercel";
    else if (name.includes("catalyst") || appSlug.includes("catalyst"))
      source = "catalyst";

    const startedAt = checkRun.started_at
      ? new Date(checkRun.started_at as string)
      : undefined;
    const completedAt = checkRun.completed_at
      ? new Date(checkRun.completed_at as string)
      : undefined;
    const duration =
      startedAt && completedAt
        ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
        : undefined;

    const output = checkRun.output as Record<string, unknown> | undefined;

    return {
      id: String(checkRun.id),
      name: checkRun.name as string,
      state,
      url:
        (checkRun.html_url as string) ||
        (checkRun.details_url as string) ||
        undefined,
      description: (output?.title as string) || undefined,
      context: checkRun.name as string,
      startedAt,
      completedAt,
      duration,
      source,
    };
  }

  private normalizeCommitStatus(status: Record<string, unknown>): CICheck {
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
    const context = (status.context as string).toLowerCase();

    if (context.includes("github") || context.includes("actions"))
      source = "github-actions";
    else if (context.includes("cloudflare")) source = "cloudflare";
    else if (context.includes("vercel")) source = "vercel";
    else if (context.includes("catalyst")) source = "catalyst";

    return {
      id: String(status.id),
      name: status.context as string,
      state,
      url: (status.target_url as string) || undefined,
      description: (status.description as string) || undefined,
      context: status.context as string,
      startedAt: status.created_at
        ? new Date(status.created_at as string)
        : undefined,
      completedAt: status.updated_at
        ? new Date(status.updated_at as string)
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
    const octokit = client.raw as Octokit;

    // 1. Get current file SHA (if it exists)
    let sha: string | undefined;
    try {
      const { data: currentFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (!Array.isArray(currentFile) && currentFile.type === "file") {
        sha = currentFile.sha;
      }
    } catch {
      // File doesn't exist, will be created
    }

    // 2. Update/Create file
    const { data: commit } =
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString("base64"),
        branch,
        sha,
      });

    return {
      name: commit.content?.name || path.split("/").pop() || "unknown",
      path: commit.content?.path || path,
      content, // Return the content we just wrote
      sha: commit.content?.sha || "",
      htmlUrl: commit.content?.html_url || "",
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
    const octokit = client.raw as Octokit;
    const { data: prs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: options?.state || "open",
      per_page: 100,
    });

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
    const octokit = client.raw as Octokit;
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: number,
    });

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
    const octokit = client.raw as Octokit;
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
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
    const octokit = client.raw as Octokit;
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: number,
    });

    return reviews.map((review) => ({
      id: String(review.id),
      author: review.user?.login || "unknown",
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
    const octokit = client.raw as Octokit;
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: number,
    });

    return comments.map((comment) => ({
      id: comment.id,
      body: comment.body || "",
      author: comment.user?.login || "unknown",
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
    const octokit = client.raw as Octokit;
    const { data: comment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });

    return {
      id: comment.id,
      body: comment.body || "",
      author: comment.user?.login || "unknown",
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
    const octokit = client.raw as Octokit;
    const { data: comment } = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    });

    return {
      id: comment.id,
      body: comment.body || "",
      author: comment.user?.login || "unknown",
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
    const octokit = client.raw as Octokit;
    await octokit.rest.issues.deleteComment({
      owner,
      repo,
      comment_id: commentId,
    });
  }

  async listIssues(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]> {
    const octokit = client.raw as Octokit;
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: options?.state || "open",
      per_page: 100,
    });

    // Filter out pull requests (GitHub returns PRs in issues endpoint)
    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: String(issue.id),
        number: issue.number,
        title: issue.title,
        state: issue.state as "open" | "closed",
        author: issue.user?.login || "unknown",
        htmlUrl: issue.html_url,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        labels: issue.labels.map((label) =>
          typeof label === "string" ? label : label.name || "",
        ),
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
    const octokit = client.raw as Octokit;
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
    }));
  }

  /**
   * Verify a webhook signature
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
    const eventType = headers.get("x-github-event") || "";
    const data = payload as Record<string, unknown>;

    const baseEvent: WebhookEvent = {
      type: this.mapEventType(eventType),
      action: data.action as string | undefined,
      sender: (data.sender as { login?: string })?.login || "unknown",
    };

    if (data.repository) {
      const repo = data.repository as Record<string, unknown>;
      baseEvent.repository = {
        id: String(repo.id),
        name: repo.name as string,
        fullName: repo.full_name as string,
        owner: (repo.owner as { login?: string })?.login || "",
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
        author: (pr.user as { login?: string })?.login || "unknown",
        sourceBranch: (pr.head as { ref?: string })?.ref || "",
        targetBranch: (pr.base as { ref?: string })?.ref || "",
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

  private mapRepository(repo: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string } | null;
    private: boolean;
    default_branch?: string;
    html_url: string;
    description?: string | null;
    language?: string | null;
    updated_at?: string | null;
  }): Repository {
    return {
      id: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || "",
      private: repo.private,
      defaultBranch: repo.default_branch || "main",
      htmlUrl: repo.html_url,
      description: repo.description || undefined,
      language: repo.language || undefined,
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : new Date(),
    };
  }

  private mapPullRequest(pr: {
    id: number;
    number: number;
    title: string;
    state: string;
    merged?: boolean;
    draft?: boolean;
    user: { login: string; avatar_url?: string } | null;
    head: { ref: string };
    base: { ref: string };
    html_url: string;
    created_at: string;
    updated_at: string;
    labels: Array<string | { name?: string }>;
    requested_reviewers?: Array<{ login: string }> | null;
  }): PullRequest {
    return {
      id: String(pr.id),
      number: pr.number,
      title: pr.title,
      state: this.mapPRState(pr.state, pr.merged),
      draft: pr.draft || false,
      author: pr.user?.login || "unknown",
      authorAvatarUrl: pr.user?.avatar_url,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      htmlUrl: pr.html_url,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      labels: pr.labels.map((label) =>
        typeof label === "string" ? label : label.name || "",
      ),
      reviewers: pr.requested_reviewers?.map((r) => r.login) || [],
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
    switch (state) {
      case "APPROVED":
        return "approved";
      case "CHANGES_REQUESTED":
        return "changes_requested";
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
      case "installation":
      case "installation_repositories":
        return "installation";
      case "issues":
        return "issue";
      default:
        return "push";
    }
  }
}
