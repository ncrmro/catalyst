# VCS Provider Implementation Tasks

Ordered implementation tasks with dependencies. Each task should be completable independently once its dependencies are met.

## Phase 1: Interface Extraction

### 1.1 Create VCS Types

- [ ] Create `src/lib/vcs/types.ts`
  - Define `ProviderId` type union
  - Define `ConnectionStatus` interface
  - Define `Repository` interface
  - Define `FileContent` interface
  - Define `PullRequest` interface
  - Define `Issue` interface
  - Define `PRComment` interface
  - Define `WebhookEvent` interface
  - Define `VCSProvider` interface
  - Define `VCSClient` interface (authenticated client wrapper)
  - Export all types

**Dependencies:** None
**Validation:** TypeScript compiles

### 1.2 Create Provider Registry Shell

- [ ] Create `src/lib/vcs/provider-registry.ts`
  - Define `ProviderRegistry` class
  - Implement `register()`, `get()`, `getAll()`, `getDefault()` methods
  - Export singleton instance

**Dependencies:** 1.1
**Validation:** Can import and use registry

### 1.3 Create VCS Index

- [ ] Create `src/lib/vcs/index.ts`
  - Export all types from `types.ts`
  - Export registry from `provider-registry.ts`
  - Add placeholder `getVCSClient()` function

**Dependencies:** 1.1, 1.2
**Validation:** Can import from `@/lib/vcs`

---

## Phase 2: GitHub Provider Wrapper

### 2.1 Create GitHub Provider Structure

- [ ] Create directory `src/lib/vcs/providers/github/`
- [ ] Create `src/lib/vcs/providers/github/index.ts`
  - Define `GitHubProvider` class implementing `VCSProvider`
  - Implement constructor with Octokit initialization

**Dependencies:** 1.1, 1.2
**Validation:** Can instantiate GitHubProvider

### 2.2 Move Token Management

- [ ] Move `src/lib/github-app/token-crypto.ts` → `src/lib/vcs/token-crypto.ts`
  - Make encryption provider-agnostic
- [ ] Move `src/lib/github-app/token-service.ts` → `src/lib/vcs/providers/github/token-service.ts`
- [ ] Move `src/lib/github-app/token-refresh.ts` → `src/lib/vcs/providers/github/token-refresh.ts`
- [ ] Move `src/lib/github-app/auth.ts` → `src/lib/vcs/providers/github/auth.ts`
- [ ] Update all imports in codebase

**Dependencies:** 2.1
**Validation:** Token operations still work

### 2.3 Implement GitHub Authentication Methods

- [ ] Implement `GitHubProvider.authenticate(userId)`
  - Use existing `getUserOctokit()` logic
- [ ] Implement `GitHubProvider.checkConnection(userId)`
  - Use existing `checkGitHubConnection()` logic
- [ ] Implement `GitHubProvider.storeTokens()`
- [ ] Implement `GitHubProvider.refreshTokensIfNeeded()`

**Dependencies:** 2.2
**Validation:** `const client = await github.authenticate(userId)` works

### 2.4 Implement GitHub Repository Methods

- [ ] Implement `GitHubProvider.listUserRepositories()`
- [ ] Implement `GitHubProvider.listOrgRepositories()`
- [ ] Implement `GitHubProvider.getRepository()`
- [ ] Implement `GitHubProvider.getFileContent()`
- [ ] Implement `GitHubProvider.getDirectoryContent()`

**Dependencies:** 2.3
**Validation:** Repository operations work through provider

### 2.5 Implement GitHub PR Methods

- [ ] Implement `GitHubProvider.listPullRequests()`
- [ ] Implement `GitHubProvider.getPullRequest()`
- [ ] Implement `GitHubProvider.listPullRequestReviews()`

**Dependencies:** 2.3
**Validation:** PR operations work through provider

### 2.6 Implement GitHub Comment Methods

- [ ] Implement `GitHubProvider.listPRComments()`
- [ ] Implement `GitHubProvider.createPRComment()`
- [ ] Implement `GitHubProvider.updatePRComment()`
- [ ] Implement `GitHubProvider.deletePRComment()`

**Dependencies:** 2.3
**Validation:** Comment operations work through provider

### 2.7 Implement GitHub Issue Methods

- [ ] Implement `GitHubProvider.listIssues()`

**Dependencies:** 2.3
**Validation:** Issue operations work through provider

### 2.8 Implement GitHub Webhook Methods

- [ ] Implement `GitHubProvider.verifyWebhookSignature()`
- [ ] Implement `GitHubProvider.parseWebhookEvent()`

**Dependencies:** 2.3
**Validation:** Webhook handling works through provider

### 2.9 Register GitHub Provider

- [ ] Register `GitHubProvider` in `provider-registry.ts`
- [ ] Set GitHub as default provider
- [ ] Implement `getVCSClient()` in `src/lib/vcs/index.ts`

**Dependencies:** 2.3-2.8
**Validation:** `getVCSClient(userId, "github")` returns working client

---

## Phase 3: Action Layer Refactoring

### 3.1 Update Repository Actions

- [ ] Rename `src/actions/repos.github.ts` → `src/actions/repos.ts`
- [ ] Add `providerId` parameter to functions
- [ ] Replace `getUserOctokit()` with `getVCSClient()`
- [ ] Update UI components that import from repos

**Dependencies:** 2.9
**Validation:** Repository listing works in UI

### 3.2 Update Pull Request Actions

- [ ] Update `src/actions/pull-requests.ts`
  - Add `providerId` parameter
  - Use `getVCSClient()`
- [ ] Update dashboard PR components

**Dependencies:** 2.9
**Validation:** PR listing works in UI

### 3.3 Update Issue Actions

- [ ] Update `src/actions/issues.ts`
  - Add `providerId` parameter
  - Use `getVCSClient()`
- [ ] Update issue components

**Dependencies:** 2.9
**Validation:** Issue listing works in UI

### 3.4 Update Specs Actions

- [ ] Update `src/actions/specs.ts`
  - Add `providerId` parameter
  - Use `getVCSClient()`
- [ ] Update spec page components

**Dependencies:** 2.9
**Validation:** Spec file loading works

### 3.5 Update Account Actions

- [ ] Update `src/actions/account.ts`
  - Use provider registry for status checks
  - Make `getProviderStatuses()` use actual provider instances
- [ ] Update account page

**Dependencies:** 2.9
**Validation:** Account page shows correct connection status

---

## Phase 4: Webhook Abstraction

### 4.1 Create Webhook Handler

- [ ] Create `src/lib/vcs/webhook-handler.ts`
  - Define common webhook handling logic
  - Route to provider-specific parsers

**Dependencies:** 2.8
**Validation:** Handler routes correctly

### 4.2 Create Provider Webhook Route

- [ ] Create `src/app/api/vcs/webhook/[provider]/route.ts`
  - Accept provider as route parameter
  - Use `providerRegistry.get(provider)`
  - Call provider webhook methods

**Dependencies:** 4.1
**Validation:** Webhook URL `/api/vcs/webhook/github` works

### 4.3 Deprecate Legacy Route

- [ ] Add redirect from `/api/github/webhook` to `/api/vcs/webhook/github`
- [ ] Update GitHub App webhook URL in documentation
- [ ] Log deprecation warning when legacy route used

**Dependencies:** 4.2
**Validation:** Both routes work, deprecation logged

---

## Phase 5: Database Schema Updates

### 5.1 Create Token Table Migration

- [ ] Create migration to rename `github_user_tokens` → `vcs_provider_tokens`
- [ ] Add `provider` column with default `'github'`
- [ ] Update primary key to `(user_id, provider)`

**Dependencies:** None (can run in parallel with Phase 2-4)
**Validation:** Migration runs, existing data preserved

### 5.2 Update Schema Definition

- [ ] Update `src/db/schema.ts`
  - Rename table definition
  - Add provider column
  - Update relations

**Dependencies:** 5.1
**Validation:** Drizzle generates correct queries

### 5.3 Update Token Service

- [ ] Update token service to accept `providerId`
- [ ] Update token queries to include provider filter
- [ ] Update refresh logic for provider awareness

**Dependencies:** 5.2, 2.2
**Validation:** Token operations work with provider parameter

---

## Phase 6: GitLab Provider

### 6.1 Create GitLab Provider Structure

- [ ] Create directory `src/lib/vcs/providers/gitlab/`
- [ ] Create `src/lib/vcs/providers/gitlab/index.ts`
- [ ] Define `GitLabProvider` class

**Dependencies:** 1.1, 1.2
**Validation:** Can instantiate GitLabProvider

### 6.2 Add GitLab OAuth

- [ ] Add GitLab provider to NextAuth config
- [ ] Add environment variables to schema
- [ ] Test OAuth flow

**Dependencies:** 6.1
**Validation:** Can authenticate with GitLab

### 6.3 Implement GitLab Token Management

- [ ] Create GitLab token service
- [ ] Implement token storage/refresh

**Dependencies:** 6.2, 5.3
**Validation:** Tokens stored and refreshed correctly

### 6.4 Implement GitLab Repository Methods

- [ ] Implement `listUserRepositories()` - Projects API
- [ ] Implement `listOrgRepositories()` - Groups API
- [ ] Implement `getRepository()`
- [ ] Implement `getFileContent()` - Repository Files API
- [ ] Implement `getDirectoryContent()`

**Dependencies:** 6.3
**Validation:** Can list and access GitLab repositories

### 6.5 Implement GitLab MR Methods

- [ ] Implement `listPullRequests()` - Merge Requests API
- [ ] Implement `getPullRequest()`
- [ ] Implement `listPullRequestReviews()` - Approvals API

**Dependencies:** 6.3
**Validation:** Can list and access merge requests

### 6.6 Implement GitLab Comment Methods

- [ ] Implement `listPRComments()` - MR Notes API
- [ ] Implement `createPRComment()`
- [ ] Implement `updatePRComment()`
- [ ] Implement `deletePRComment()`

**Dependencies:** 6.3
**Validation:** Can manage MR comments

### 6.7 Implement GitLab Issue Methods

- [ ] Implement `listIssues()` - Issues API

**Dependencies:** 6.3
**Validation:** Can list issues

### 6.8 Implement GitLab Webhook Methods

- [ ] Implement `verifyWebhookSignature()` - X-Gitlab-Token
- [ ] Implement `parseWebhookEvent()` - GitLab event format

**Dependencies:** 6.3
**Validation:** Can handle GitLab webhooks

### 6.9 Register GitLab Provider

- [ ] Register in provider registry
- [ ] Add to account page providers list
- [ ] Test full flow

**Dependencies:** 6.4-6.8
**Validation:** GitLab fully functional

---

## Phase 7: UI Updates

### 7.1 Enable Connect Buttons

- [ ] Update account page Connect buttons
- [ ] Implement OAuth initiation for each provider
- [ ] Add loading states

**Dependencies:** 5.3, 6.9 (for GitLab)
**Validation:** Can connect providers from UI

### 7.2 Add Provider Selection

- [ ] Add provider selector to project creation
- [ ] Show provider icon in project list
- [ ] Store provider in project record

**Dependencies:** 7.1
**Validation:** Can create projects from different providers

### 7.3 Provider Icons Throughout

- [ ] Create provider icon component
- [ ] Add to repository list
- [ ] Add to PR list
- [ ] Add to issue list

**Dependencies:** None
**Validation:** Provider icons visible throughout UI

---

## Phase 8: Additional Providers

### 8.1 Bitbucket Provider

- [ ] Create `src/lib/vcs/providers/bitbucket/`
- [ ] Implement all VCSProvider methods
- [ ] Add OAuth configuration
- [ ] Register provider

**Dependencies:** 1.1, 1.2, 5.3
**Validation:** Bitbucket fully functional

### 8.2 Azure DevOps Provider

- [ ] Create `src/lib/vcs/providers/azure/`
- [ ] Implement all VCSProvider methods
- [ ] Add OAuth configuration
- [ ] Register provider

**Dependencies:** 1.1, 1.2, 5.3
**Validation:** Azure DevOps fully functional

---

## Testing Tasks

### T.1 Unit Tests

- [ ] Test `ProviderRegistry` class
- [ ] Test each provider method
- [ ] Test token encryption/decryption
- [ ] Test webhook signature verification

### T.2 Integration Tests

- [ ] Test OAuth flows (mocked)
- [ ] Test repository listing
- [ ] Test PR/MR operations
- [ ] Test webhook handling

### T.3 E2E Tests

- [ ] Test provider connection flow
- [ ] Test project creation from different providers
- [ ] Test preview environment creation
