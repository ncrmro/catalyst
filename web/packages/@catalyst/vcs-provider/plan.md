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

## Target Architecture

### Directory Structure

```
src/lib/vcs/
├── types.ts                   # Provider-agnostic interfaces
├── provider-registry.ts       # Provider factory & registration
├── token-crypto.ts            # Generic token encryption (moved)
├── providers/
│   ├── github/
│   │   ├── index.ts           # GitHubProvider class
│   │   ├── auth.ts            # GitHub OAuth/App auth
│   │   ├── repositories.ts    # Repo operations
│   │   ├── pull-requests.ts   # PR operations
│   │   ├── issues.ts          # Issue operations
│   │   ├── webhooks.ts        # Webhook parsing
│   │   └── comments.ts        # PR comments
│   ├── gitlab/
│   │   ├── index.ts           # GitLabProvider class
│   │   └── ...
│   ├── bitbucket/
│   │   └── ...
│   └── azure/
│       └── ...
└── index.ts                   # Public API exports
```

### Key Abstractions

```typescript
// src/lib/vcs/types.ts
export interface VCSProvider {
  readonly id: ProviderId;
  readonly name: string;
  authenticate(userId: string): Promise<VCSClient>;
  // ... see spec.md for full interface
}

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

---

## Migration Phases

### Phase 1: Interface Extraction (Non-Breaking)

**Goal:** Define TypeScript interfaces without changing existing behavior.

**Steps:**

1. Create `src/lib/vcs/types.ts` with all interfaces from spec.md
2. Create `src/lib/vcs/provider-registry.ts` as empty shell
3. Add type exports to `src/lib/vcs/index.ts`

**Validation:**

- Existing tests pass
- No runtime changes
- TypeScript compiles

**Duration:** 1-2 hours

---

### Phase 2: GitHub Provider Wrapper

**Goal:** Wrap existing GitHub code as a VCSProvider implementation.

**Steps:**

1. Create `src/lib/vcs/providers/github/index.ts`
2. Implement `GitHubProvider` class using existing functions
3. Move `github-app/` to `vcs/providers/github/`
4. Update imports throughout codebase
5. Register GitHub provider in registry

**Before (current):**

```typescript
import { getUserOctokit } from "@/lib/github";
const octokit = await getUserOctokit(userId);
```

**After (phase 2):**

```typescript
import { getVCSClient } from "@/lib/vcs";
const client = await getVCSClient(userId, "github");
// OR with provider instance
import { getProvider } from "@/lib/vcs";
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

1. Create `src/lib/vcs/webhook-handler.ts`
2. Move GitHub webhook logic to provider
3. Create `/api/vcs/webhook/[provider]/route.ts`
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

1. Create `src/lib/vcs/providers/gitlab/index.ts`
2. Implement GitLabProvider class
3. Add GitLab to NextAuth providers
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
