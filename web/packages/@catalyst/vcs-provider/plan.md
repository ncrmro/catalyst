# VCS Provider Abstraction Plan

This document outlines the migration plan for abstracting the current GitHub-specific implementation into a multi-provider architecture.

## Current State

The application is tightly coupled to GitHub:

```
src/
├── lib/
│   ├── github.ts              # Octokit utilities, getUserOctokit()
│   ├── github-app/            # GitHub App token management
│   │   ├── auth.ts            # OAuth exchange
│   │   ├── token-crypto.ts    # AES-256-GCM encryption
│   │   ├── token-service.ts   # Token CRUD
│   │   └── token-refresh.ts   # Auto-refresh
│   └── github-pr-comments.ts  # PR comment CRUD
├── actions/
│   ├── repos.github.ts        # Repository listing
│   ├── pull-requests.ts       # PR fetching
│   ├── issues.ts              # Issue fetching
│   └── specs.ts               # File content fetching
└── app/api/github/
    └── webhook/route.ts       # GitHub webhook handler
```

See `spec.md` for functional requirements.

---

## Interface Design

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

  // Authentication (AUTH-001 to AUTH-007)
  authenticate(userId: string): Promise<AuthenticatedClient>;
  checkConnection(userId: string): Promise<ConnectionStatus>;
  storeTokens(userId: string, tokens: TokenData): Promise<void>;
  refreshTokensIfNeeded(userId: string): Promise<TokenData | null>;

  // Repositories (REPO-001 to REPO-006)
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

  // Pull/Merge Requests (PR-001 to PR-006)
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

  // PR Comments (CMT-001 to CMT-005)
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

  // Issues (ISS-001 to ISS-005)
  listIssues(
    client: AuthenticatedClient,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all" },
  ): Promise<Issue[]>;

  // Webhooks (WH-001 to WH-009)
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean;
  parseWebhookEvent(headers: Headers, payload: unknown): WebhookEvent;
}
```

### Provider Registry

```typescript
// src/lib/vcs/provider-registry.ts
export class ProviderRegistry {
  private providers = new Map<ProviderId, VCSProvider>();

  register(provider: VCSProvider): void;
  get(id: ProviderId): VCSProvider | undefined;
  getAll(): VCSProvider[];
  getDefault(): VCSProvider;
}

export const providerRegistry = new ProviderRegistry();

// src/lib/vcs/index.ts
export async function getVCSClient(
  userId: string,
  providerId?: ProviderId,
): Promise<VCSClient>;

export function getProvider(id: ProviderId): VCSProvider;
export function getAllProviders(): VCSProvider[];
```

### GitHub API Mapping

| Requirement | GitHub API                         |
| ----------- | ---------------------------------- |
| REPO-001    | `repos.listForAuthenticatedUser()` |
| REPO-002    | `repos.listForOrg()`               |
| REPO-003    | `repos.get()`                      |
| REPO-004    | `repos.getContent()`               |
| REPO-005    | `repos.getContent()`               |
| REPO-006    | `orgs.listForAuthenticatedUser()`  |
| PR-001      | `pulls.list()`                     |
| PR-002      | `pulls.get()`                      |
| PR-003      | `pulls.listReviews()`              |
| CMT-001     | `GET /issues/{number}/comments`    |
| CMT-002     | `POST /issues/{number}/comments`   |
| CMT-003     | `PATCH /issues/comments/{id}`      |
| CMT-004     | `DELETE /issues/comments/{id}`     |
| ISS-001     | `issues.listForRepo()`             |

### Key Implementation Files

| Component        | File                                  |
| ---------------- | ------------------------------------- |
| Octokit utils    | `src/lib/github.ts`                   |
| Token service    | `src/lib/github-app/token-service.ts` |
| Token refresh    | `src/lib/github-app/token-refresh.ts` |
| Token encryption | `src/lib/github-app/token-crypto.ts`  |
| PR comments      | `src/lib/github-pr-comments.ts`       |
| Repo actions     | `src/actions/repos.github.ts`         |
| PR actions       | `src/actions/pull-requests.ts`        |
| Issue actions    | `src/actions/issues.ts`               |
| Webhook handler  | `src/app/api/github/webhook/route.ts` |
| DB schema        | `src/db/schema.ts`                    |

### Environment Variables

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

# Future: GitLab
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
GITLAB_WEBHOOK_SECRET=
GITLAB_BASE_URL=         # For self-hosted

# Future: Bitbucket
BITBUCKET_CLIENT_ID=
BITBUCKET_CLIENT_SECRET=
BITBUCKET_WEBHOOK_SECRET=

# Future: Azure DevOps
AZURE_DEVOPS_CLIENT_ID=
AZURE_DEVOPS_CLIENT_SECRET=
AZURE_DEVOPS_WEBHOOK_SECRET=
```

---

## Target Architecture

### Package Structure

The VCS provider abstraction lives in `web/packages/@catalyst/vcs-provider/` as a standalone package. The main app imports from this package via a re-export barrel file.

```
web/packages/@catalyst/vcs-provider/
├── src/
│   ├── types.ts                   # Provider-agnostic interfaces
│   ├── provider-registry.ts       # Provider factory & registration
│   ├── token-crypto.ts            # Generic token encryption
│   ├── providers/
│   │   ├── github/
│   │   │   ├── index.ts           # GitHubProvider class
│   │   │   ├── auth.ts            # GitHub OAuth/App auth
│   │   │   ├── repositories.ts    # Repo operations
│   │   │   ├── pull-requests.ts   # PR operations
│   │   │   ├── issues.ts          # Issue operations
│   │   │   ├── webhooks.ts        # Webhook parsing
│   │   │   └── comments.ts        # PR comments
│   │   ├── gitlab/
│   │   │   ├── index.ts           # GitLabProvider class
│   │   │   └── ...
│   │   ├── bitbucket/
│   │   │   └── ...
│   │   └── azure/
│   │       └── ...
│   └── index.ts                   # Package public API exports
├── package.json
├── index.ts                       # Root export (re-exports src/index.ts)
├── spec.md
├── plan.md
└── tasks.md

web/src/lib/vcs-providers.ts       # Re-export barrel for main app
```

### Main App Integration

The main app imports from a re-export barrel file:

```typescript
// web/src/lib/vcs-providers.ts
export * from "@catalyst/vcs-provider";
export {
  getVCSClient,
  getProvider,
  getAllProviders,
} from "@catalyst/vcs-provider";
```

This allows the main app to use:

```typescript
import { getVCSClient } from "@/lib/vcs-providers";
```

### Key Abstractions

```typescript
// @catalyst/vcs-provider/src/types.ts
export interface VCSProvider {
  readonly id: ProviderId;
  readonly name: string;
  authenticate(userId: string): Promise<VCSClient>;
  // ... see spec.md for full interface
}

// @catalyst/vcs-provider/src/provider-registry.ts
export class ProviderRegistry {
  private providers = new Map<ProviderId, VCSProvider>();

  register(provider: VCSProvider): void;
  get(id: ProviderId): VCSProvider | undefined;
  getAll(): VCSProvider[];
  getDefault(): VCSProvider;
}

export const providerRegistry = new ProviderRegistry();

// @catalyst/vcs-provider/src/index.ts
export async function getVCSClient(
  userId: string,
  providerId?: ProviderId,
): Promise<VCSClient>;

export function getProvider(id: ProviderId): VCSProvider;
export function getAllProviders(): VCSProvider[];
```

---

## Migration Phases

### Phase 1: Interface Extraction (Non-Breaking)

**Goal:** Define TypeScript interfaces without changing existing behavior.

**Steps:**

1. Create package structure at `web/packages/@catalyst/vcs-provider/`
2. Create `src/types.ts` with all interfaces from spec.md
3. Create `src/provider-registry.ts` as empty shell
4. Create `src/index.ts` with public API exports
5. Create `index.ts` at package root to re-export from `src/index.ts`
6. Create `package.json` with proper exports configuration
7. Create re-export barrel at `web/src/lib/vcs-providers.ts`

**Validation:**

- Existing tests pass
- No runtime changes
- TypeScript compiles
- Can import from `@catalyst/vcs-provider` and `@/lib/vcs-providers`

**Duration:** 1-2 hours

---

### Phase 2: GitHub Provider Wrapper

**Goal:** Wrap existing GitHub code as a VCSProvider implementation.

**Steps:**

1. Create `src/providers/github/index.ts` in the package
2. Implement `GitHubProvider` class using existing functions from `web/src/lib/github.ts`
3. Copy/adapt code from `web/src/lib/github-app/` to package's `src/providers/github/`
4. Update imports in main app to use re-export barrel
5. Register GitHub provider in registry

**Before (current):**

```typescript
import { getUserOctokit } from "@/lib/github";
const octokit = await getUserOctokit(userId);
```

**After (phase 2):**

```typescript
import { getVCSClient } from "@/lib/vcs-providers";
const client = await getVCSClient(userId, "github");
// OR with provider instance
import { getProvider } from "@/lib/vcs-providers";
const github = getProvider("github");
const client = await github.authenticate(userId);
```

**Validation:**

- All existing functionality works
- Tests pass
- GitHub operations unchanged

**Duration:** 4-6 hours

---

### Phase 3: Action Layer Refactoring

**Goal:** Update server actions to use provider abstraction.

**Steps:**

1. Update `src/actions/repos.github.ts` → `src/actions/repos.ts`
   - Accept `providerId` parameter
   - Use `getVCSClient()` instead of `getUserOctokit()`

2. Update `src/actions/pull-requests.ts`
   - Use provider abstraction

3. Update `src/actions/issues.ts`
   - Use provider abstraction

4. Update `src/actions/specs.ts`
   - Use provider abstraction for file fetching

5. Update `src/actions/account.ts`
   - Use provider registry for connection status

**Validation:**

- UI works unchanged
- All provider operations go through abstraction

**Duration:** 3-4 hours

---

### Phase 4: Webhook Abstraction

**Goal:** Create provider-agnostic webhook handling.

**Steps:**

1. Create `src/webhook-handler.ts` in the package for common webhook logic
2. Move GitHub webhook logic to `src/providers/github/webhooks.ts`
3. Create `/api/vcs/webhook/[provider]/route.ts` in main app
4. Deprecate `/api/github/webhook/route.ts`

**Validation:**

- GitHub webhooks still work
- Webhook URL structure supports multiple providers

**Duration:** 2-3 hours

---

### Phase 5: Database Schema Updates

**Goal:** Generalize token storage for multiple providers.

**Steps:**

1. Rename `github_user_tokens` → `vcs_provider_tokens`
2. Add `provider` column
3. Create migration
4. Update token service to be provider-aware

**Schema Change:**

```sql
-- Before
CREATE TABLE github_user_tokens (
  user_id TEXT PRIMARY KEY,
  ...
);

-- After
CREATE TABLE vcs_provider_tokens (
  user_id TEXT,
  provider TEXT,
  ...
  PRIMARY KEY (user_id, provider)
);
```

**Validation:**

- Migration runs cleanly
- Existing tokens preserved
- Token operations work

**Duration:** 2-3 hours

---

### Phase 6: GitLab Provider Implementation

**Goal:** Add GitLab as second provider.

**Steps:**

1. Create `src/providers/gitlab/index.ts` in the package
2. Implement GitLabProvider class
3. Add GitLab to NextAuth providers (in main app)
4. Add GitLab environment variables
5. Implement GitLab-specific auth flow
6. Implement repository operations
7. Implement merge request operations
8. Implement webhook handling

**Environment Variables:**

```bash
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
GITLAB_WEBHOOK_SECRET=
GITLAB_BASE_URL=  # For self-hosted instances
```

**Validation:**

- GitLab OAuth works
- Repository listing works
- MR operations work

**Duration:** 8-12 hours

---

### Phase 7: UI Updates

**Goal:** Allow users to connect multiple providers.

**Steps:**

1. Update account page to show all providers
2. Add "Connect" buttons that work
3. Add provider selection in project creation
4. Show provider icons throughout UI

**Duration:** 4-6 hours

---

### Phase 8: Bitbucket & Azure DevOps

**Goal:** Add remaining providers.

Follow same pattern as Phase 6 for each provider.

**Duration:** 8-12 hours per provider

---

## Risk Mitigation

### Breaking Changes

- **Minimize:** Phases 1-4 are backwards compatible
- **Feature flag:** Use `VCS_MULTI_PROVIDER_ENABLED` to gate new features
- **Gradual rollout:** Keep GitHub as default, add others incrementally

### Data Migration

- **Preserve tokens:** Rename table, add column, don't delete data
- **Rollback plan:** Keep old column until verified

### Testing

- **Unit tests:** Each provider method
- **Integration tests:** OAuth flows, API calls
- **E2E tests:** Full user workflows

---

## Success Criteria

1. **Phase 1-4 Complete:**
   - GitHub works exactly as before
   - Code is organized for multi-provider
   - No user-facing changes

2. **Phase 5-6 Complete:**
   - GitLab users can authenticate
   - GitLab repos appear in project list
   - MR webhooks create preview environments

3. **Phase 7-8 Complete:**
   - All four providers functional
   - Users can connect multiple providers
   - Unified experience across providers
