# VCS Provider Specification

This specification defines the interface requirements for Version Control System (VCS) providers in Catalyst, along with the current GitHub implementation status.

## Overview

Catalyst integrates with VCS providers to:

- Authenticate users and access their repositories
- List and manage repositories
- Handle pull/merge requests and preview deployments
- Process webhooks for CI/CD automation
- Fetch file content (specs, configs)

## Provider Interface

### Core Types

```typescript
type ProviderId = "github" | "gitlab" | "bitbucket" | "azure";

interface ConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  error?: string;
  authMethod?: "oauth" | "pat" | "app";
}

interface Repository {
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

interface FileContent {
  name: string;
  path: string;
  content: string; // decoded content
  sha: string;
  htmlUrl: string;
}

interface PullRequest {
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

interface Issue {
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

interface PRComment {
  id: number;
  body: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookEvent {
  type: "push" | "pull_request" | "installation" | "issue";
  action?: string;
  repository?: Repository;
  pullRequest?: PullRequest;
  sender: string;
}
```

### VCSProvider Interface

```typescript
interface VCSProvider {
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
  ): Promise<FileContent[]>;

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
```

---

## Current GitHub Implementation Status

### Authentication

| Capability        | Status        | Implementation                 |
| ----------------- | ------------- | ------------------------------ |
| OAuth Login       | ✓ Implemented | NextAuth.js GitHub provider    |
| PAT Fallback      | ✓ Implemented | `GITHUB_PAT` env var, dev mode |
| App Tokens        | ✓ Implemented | GitHub App with 8-hour tokens  |
| Token Refresh     | ✓ Implemented | Auto-refresh with 5-min buffer |
| Token Encryption  | ✓ Implemented | AES-256-GCM in database        |
| Installation Auth | ✓ Implemented | For webhook operations         |

**Key Files:**

- `src/lib/github.ts` - `getUserOctokit()`, `GITHUB_CONFIG`
- `src/lib/github-app/token-service.ts` - Token CRUD with encryption
- `src/lib/github-app/token-refresh.ts` - Auto-refresh logic
- `src/lib/github-app/token-crypto.ts` - AES-256-GCM encryption

**OAuth Scopes:** `read:user user:email read:org repo`

### Repository Operations

| Capability         | Status        | GitHub API                         |
| ------------------ | ------------- | ---------------------------------- |
| List user repos    | ✓ Implemented | `repos.listForAuthenticatedUser()` |
| List org repos     | ✓ Implemented | `repos.listForOrg()`               |
| Get repository     | ✓ Implemented | `repos.get()`                      |
| Get file content   | ✓ Implemented | `repos.getContent()`               |
| Get directory      | ✓ Implemented | `repos.getContent()`               |
| List organizations | ✓ Implemented | `orgs.listForAuthenticatedUser()`  |

**Key Files:**

- `src/actions/repos.github.ts` - Repository listing actions
- `src/actions/specs.ts` - File content fetching

### Pull Request Operations

| Capability      | Status            | GitHub API            |
| --------------- | ----------------- | --------------------- |
| List PRs        | ✓ Implemented     | `pulls.list()`        |
| Get PR details  | ✓ Implemented     | via webhook payload   |
| List PR reviews | ✓ Implemented     | `pulls.listReviews()` |
| Create PR       | ✗ Not implemented | `pulls.create()`      |
| Update PR       | ✗ Not implemented | `pulls.update()`      |
| Merge PR        | ✗ Not implemented | `pulls.merge()`       |

**Key Files:**

- `src/lib/github.ts` - `fetchUserRepositoryPullRequests()`
- `src/actions/pull-requests.ts` - Server actions

### PR Comments (Deployment Status)

| Capability       | Status        | GitHub API                       |
| ---------------- | ------------- | -------------------------------- |
| List comments    | ✓ Implemented | `GET /issues/{number}/comments`  |
| Create comment   | ✓ Implemented | `POST /issues/{number}/comments` |
| Update comment   | ✓ Implemented | `PATCH /issues/comments/{id}`    |
| Delete comment   | ✓ Implemented | `DELETE /issues/comments/{id}`   |
| Find bot comment | ✓ Implemented | Pattern matching for marker      |

**Key Files:**

- `src/lib/github-pr-comments.ts` - Full CRUD implementation

### Issue Operations

| Capability     | Status            | GitHub API                 |
| -------------- | ----------------- | -------------------------- |
| List issues    | ✓ Implemented     | `issues.listForRepo()`     |
| Filter PRs out | ✓ Implemented     | `pull_request` field check |
| Get issue      | ⚠ Partial         | Via list only              |
| Create issue   | ✗ Not implemented | `issues.create()`          |
| Update issue   | ✗ Not implemented | `issues.update()`          |

**Key Files:**

- `src/lib/github.ts` - `fetchIssuesFromRepos()`
- `src/actions/issues.ts` - Server actions

### Webhook Handling

| Event                       | Status        | Actions                   |
| --------------------------- | ------------- | ------------------------- |
| `installation`              | ✓ Implemented | Log activity              |
| `installation_repositories` | ✓ Implemented | Log repo changes          |
| `push`                      | ✓ Implemented | Log activity              |
| `pull_request.opened`       | ✓ Implemented | Create preview deployment |
| `pull_request.synchronize`  | ✓ Implemented | Update preview deployment |
| `pull_request.reopened`     | ✓ Implemented | Create preview deployment |
| `pull_request.closed`       | ✓ Implemented | Delete preview deployment |
| Signature verification      | ✓ Implemented | HMAC-SHA256               |

**Key Files:**

- `src/app/api/github/webhook/route.ts` - Webhook handler

### Database Schema

| Table                | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `accounts`           | NextAuth OAuth accounts (provider-agnostic) |
| `github_user_tokens` | GitHub App tokens (encrypted)               |
| `repos`              | Repository records                          |
| `pull_requests`      | PR records with `provider` field            |

**Key Files:**

- `src/db/schema.ts` - Drizzle schema definitions

---

## Provider-Specific Features

### GitHub-Only Features (Not Abstractable)

1. **GitHub App Installation** - Org-level permissions and webhooks
2. **Installation Tokens** - Short-lived tokens for app operations
3. **GitHub Actions OIDC** - Kubernetes auth via GitHub identity

### Cross-Provider Equivalents

| GitHub       | GitLab               | Bitbucket    | Azure DevOps      |
| ------------ | -------------------- | ------------ | ----------------- |
| Pull Request | Merge Request        | Pull Request | Pull Request      |
| GitHub App   | Project Access Token | App Password | Service Principal |
| Actions      | CI/CD Pipelines      | Pipelines    | Azure Pipelines   |
| Webhooks     | Webhooks             | Webhooks     | Service Hooks     |

---

## Environment Variables

### Current GitHub Configuration

```bash
# GitHub App (Primary)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=

# Security
GITHUB_WEBHOOK_SECRET=
TOKEN_ENCRYPTION_KEY=

# Optional Fallbacks
GITHUB_PAT=              # Personal Access Token
GITHUB_TOKEN=            # Alias for PAT
GITHUB_GHCR_PAT=         # Container registry

# Feature Flags
GITHUB_REPOS_MODE=       # "mocked" for testing
GITHUB_ALLOW_PAT_FALLBACK=true  # Allow PAT in production
GITHUB_DISABLE_APP_CHECKS=true  # Skip validation
```

### Future Provider Configuration

```bash
# GitLab
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
GITLAB_WEBHOOK_SECRET=

# Bitbucket
BITBUCKET_CLIENT_ID=
BITBUCKET_CLIENT_SECRET=
BITBUCKET_WEBHOOK_SECRET=

# Azure DevOps
AZURE_DEVOPS_CLIENT_ID=
AZURE_DEVOPS_CLIENT_SECRET=
AZURE_DEVOPS_WEBHOOK_SECRET=
```
