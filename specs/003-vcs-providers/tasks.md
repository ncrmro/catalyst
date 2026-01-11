# VCS Organization Team Integration - Tasks

## Phase 1: VCS Provider Interface (2-3 days)

### P1.1: Type Definitions

- [ ] T001 [P] [US-2] Add `Organization` interface to `web/packages/@catalyst/vcs-provider/src/types.ts`
- [ ] T002 [P] [US-2] Add `OrganizationMember` interface to `web/packages/@catalyst/vcs-provider/src/types.ts`
- [ ] T003 [P] [US-2] Add `OrganizationRole` type to `web/packages/@catalyst/vcs-provider/src/types.ts`
- [ ] T004 [P] [US-2] Add `MembershipCheck` interface to `web/packages/@catalyst/vcs-provider/src/types.ts`

### P1.2: VCSProvider Interface Methods

- [ ] T005 [US-2] Add `getOrganization()` method to `VCSProvider` interface in `web/packages/@catalyst/vcs-provider/src/types.ts`
- [ ] T006 [US-2] Add `listOrganizationMembers()` method to `VCSProvider` interface in `web/packages/@catalyst/vcs-provider/src/types.ts`
- [ ] T007 [US-2] Add `getMyOrganizationMembership()` method to `VCSProvider` interface in `web/packages/@catalyst/vcs-provider/src/types.ts`

### P1.3: VCSProviderSingleton Extensions

- [ ] T008 [US-2] Create `OrganizationOperations` class in `web/packages/@catalyst/vcs-provider/src/vcs-provider.ts`
- [ ] T009 [US-2] Add `organizations` property to `VCSProviderSingleton` in `web/packages/@catalyst/vcs-provider/src/vcs-provider.ts`
- [ ] T010 [US-2] Extend `ScopedVCSProvider` with organizations namespace in `web/packages/@catalyst/vcs-provider/src/vcs-provider.ts`

### P1.4: GitHub Provider Implementation

- [ ] T011 [US-2] Implement `getOrganization()` in `web/packages/@catalyst/vcs-provider/src/providers/github/provider.ts`
- [ ] T012 [US-2] Implement `listOrganizationMembers()` in `web/packages/@catalyst/vcs-provider/src/providers/github/provider.ts`
- [ ] T013 [US-2] Implement `getMyOrganizationMembership()` in `web/packages/@catalyst/vcs-provider/src/providers/github/provider.ts`
- [ ] T014 [US-2] Add `mapGitHubRoleToOrgRole()` helper in `web/packages/@catalyst/vcs-provider/src/providers/github/provider.ts`
- [ ] T015 [US-2] Update OAuth scopes to include `read:org` in `web/packages/@catalyst/vcs-provider/src/providers/github/auth.ts`

### P1.5: Unit Tests

- [ ] T016 [P] [US-2] Test `getOrganization()` returns correct data in `web/packages/@catalyst/vcs-provider/src/__tests__/organizations.test.ts`
- [ ] T017 [P] [US-2] Test `listOrganizationMembers()` maps roles correctly in `web/packages/@catalyst/vcs-provider/src/__tests__/organizations.test.ts`
- [ ] T018 [P] [US-2] Test `getMyOrganizationMembership()` handles member/non-member in `web/packages/@catalyst/vcs-provider/src/__tests__/organizations.test.ts`
- [ ] T019 [P] [US-2] Test role mapping functions in `web/packages/@catalyst/vcs-provider/src/__tests__/organizations.test.ts`

## Phase 2: Database Schema (1 day)

### P2.1: Schema Extensions

- [ ] T020 [US-2] Add `vcsProviderId` column to teams table in `web/src/db/schema.ts`
- [ ] T021 [US-2] Add `vcsOrgId` column to teams table in `web/src/db/schema.ts`
- [ ] T022 [US-2] Add `vcsOrgLogin` column to teams table in `web/src/db/schema.ts`
- [ ] T023 [US-2] Add `vcsOrgAvatarUrl` column to teams table in `web/src/db/schema.ts`
- [ ] T024 [US-2] Add `isVcsOrg` column to teams table in `web/src/db/schema.ts`
- [ ] T025 [US-2] Add `syncedAt` column to teams table in `web/src/db/schema.ts`

### P2.2: Database Migration

- [ ] T026 [US-2] Generate migration with `npm run db:generate`
- [ ] T027 [US-2] Review generated migration SQL
- [ ] T028 [US-2] Add composite unique index on `(vcsProviderId, vcsOrgId)` to migration
- [ ] T029 [US-2] Add index on `(vcsProviderId, vcsOrgLogin)` to migration
- [ ] T030 [US-2] Test migration UP in dev environment
- [ ] T031 [US-2] Test migration DOWN (rollback) in dev environment

## Phase 3: Models Layer (2 days)

### P3.1: Team-Organization Functions

- [ ] T032 [P] [US-2] Implement `getTeamByVCSOrg()` in `web/src/models/teams.ts`
- [ ] T033 [P] [US-2] Implement `createTeamForVCSOrg()` in `web/src/models/teams.ts`
- [ ] T034 [US-2] Implement `syncTeamMembersFromVCSOrg()` in `web/src/models/teams.ts`
- [ ] T035 [P] [US-2] Implement `mapOrgRoleToTeamRole()` helper in `web/src/models/teams.ts`

### P3.2: User Matching Functions

- [ ] T036 [P] [US-2] Implement `findUserByVCSId()` in `web/src/models/teams.ts`
- [ ] T037 [P] [US-2] Implement `findOrCreateUserByVCSId()` in `web/src/models/teams.ts`

### P3.3: Access Control

- [ ] T038 [P] [US-2] Implement `checkRepoAccess()` in `web/src/models/repos.ts`
- [ ] T039 [US-2] Add team membership check for private org repos in `web/src/models/repos.ts`

### P3.4: Unit Tests

- [ ] T040 [P] [US-2] Test `getTeamByVCSOrg()` finds team correctly in `web/__tests__/unit/models/teams.test.ts`
- [ ] T041 [P] [US-2] Test `createTeamForVCSOrg()` creates team with metadata in `web/__tests__/unit/models/teams.test.ts`
- [ ] T042 [P] [US-2] Test `syncTeamMembersFromVCSOrg()` syncs members in `web/__tests__/unit/models/teams.test.ts`
- [ ] T043 [P] [US-2] Test `checkRepoAccess()` enforces team membership in `web/__tests__/unit/models/repos.test.ts`

## Phase 4: Webhook Integration (2 days)

### P4.1: GitHub Webhook Handlers

- [ ] T044 [US-2] Add `organization` event handler to `web/src/app/api/github/webhook/route.ts`
- [ ] T045 [US-2] Implement `handleOrganizationEvent()` in `web/src/app/api/github/webhook/route.ts`
- [ ] T046 [US-2] Implement `handleMemberAdded()` in `web/src/app/api/github/webhook/route.ts`
- [ ] T047 [US-2] Implement `handleMemberRemoved()` in `web/src/app/api/github/webhook/route.ts`
- [ ] T048 [US-2] Implement `handleOrgDeleted()` in `web/src/app/api/github/webhook/route.ts`
- [ ] T049 [P] [US-2] Add `mapGitHubRoleToTeamRole()` helper in `web/src/app/api/github/webhook/route.ts`

### P4.2: Webhook Event Types

- [ ] T050 [US-2] Extend `WebhookEvent` type to include `organization` and `membership` in `web/packages/@catalyst/vcs-provider/src/types.ts`
- [ ] T051 [US-2] Update webhook parsing in GitHub provider to handle organization events

### P4.3: Integration Tests

- [ ] T052 [P] [US-2] Test `member_added` creates team membership in `web/__tests__/integration/webhooks/organization.test.ts`
- [ ] T053 [P] [US-2] Test `member_removed` deletes team membership in `web/__tests__/integration/webhooks/organization.test.ts`
- [ ] T054 [P] [US-2] Test `organization.deleted` soft-deletes team in `web/__tests__/integration/webhooks/organization.test.ts`
- [ ] T055 [P] [US-2] Test user matching via accounts table in `web/__tests__/integration/webhooks/organization.test.ts`
- [ ] T056 [P] [US-2] Test webhook before user signup scenario in `web/__tests__/integration/webhooks/organization.test.ts`

## Phase 5: Actions & UI (3 days)

### P5.1: Team Status Action

- [ ] T057 [US-2] Create `checkOrgTeamStatus()` action in `web/src/actions/teams.ts`
- [ ] T058 [US-2] Add VCS provider membership check to `checkOrgTeamStatus()`
- [ ] T059 [US-2] Add org details fetching to `checkOrgTeamStatus()`
- [ ] T060 [US-2] Handle error cases (not authenticated, not member, API error) in `checkOrgTeamStatus()`

### P5.2: Repository Connection Flow

- [ ] T061 [US-2] Create/update `connectRepoToProject()` action in `web/src/actions/repos.ts`
- [ ] T062 [US-2] Add team detection logic to `connectRepoToProject()`
- [ ] T063 [US-2] Add team creation logic to `connectRepoToProject()`
- [ ] T064 [US-2] Add team reuse logic to `connectRepoToProject()`
- [ ] T065 [US-2] Add repository-team association to `connectRepoToProject()`

### P5.3: UI Components

- [ ] T066 [US-2] Create `OrgTeamPrompt` component in `web/src/components/repos/org-team-prompt.tsx`
- [ ] T067 [US-2] Add provider-specific messaging to `OrgTeamPrompt`
- [ ] T068 [US-2] Add checkbox confirmation to `OrgTeamPrompt`
- [ ] T069 [US-2] Update `ConnectRepoForm` to integrate `OrgTeamPrompt` in `web/src/components/repos/connect-repo-form.tsx`
- [ ] T070 [US-2] Add submit button disable logic based on confirmation in `web/src/components/repos/connect-repo-form.tsx`

### P5.4: Server Components

- [ ] T071 [US-2] Update repository connection page to call `checkOrgTeamStatus()` in `web/src/app/(dashboard)/repos/[repoId]/connect/page.tsx`
- [ ] T072 [US-2] Pass org team info to `ConnectRepoForm` in `web/src/app/(dashboard)/repos/[repoId]/connect/page.tsx`

### P5.5: Error States

- [ ] T073 [US-2] Create `OrgAccessError` component for non-member scenario in `web/src/components/repos/org-access-error.tsx`
- [ ] T074 [US-2] Add link to view org on VCS provider to `OrgAccessError`

## Phase 6: Access Control Enforcement (1 day)

### P6.1: Actions Layer

- [ ] T075 [US-2] Add access check to `fetchProjectById()` in `web/src/actions/projects.ts`
- [ ] T076 [US-2] Add access check to `fetchProjects()` in `web/src/actions/projects.ts`
- [ ] T077 [US-2] Add access check to repo-related actions in `web/src/actions/repos.ts`

### P6.2: Helper Functions

- [ ] T078 [P] [US-2] Create `canAccessPrivateOrgRepo()` in `web/src/lib/team-auth.ts`
- [ ] T079 [US-2] Update access control helpers to support VCS provider param

### P6.3: Integration Tests

- [ ] T080 [P] [US-2] Test access granted for team members in `web/__tests__/integration/access-control/org-repos.test.ts`
- [ ] T081 [P] [US-2] Test access denied for non-members in `web/__tests__/integration/access-control/org-repos.test.ts`
- [ ] T082 [P] [US-2] Test public repos accessible to all in `web/__tests__/integration/access-control/org-repos.test.ts`

## Phase 7: Login-Time Sync (1 day)

### P7.1: Auth Integration

- [ ] T083 [US-2] Add org membership sync to JWT callback in `web/src/auth.ts`
- [ ] T084 [US-2] Implement `syncUserOrgMemberships()` in `web/src/models/teams.ts`
- [ ] T085 [US-2] Handle errors gracefully (log but don't block login) in JWT callback

### P7.2: Testing

- [ ] T086 [P] [US-2] Test sync on first login in `web/__tests__/integration/auth/org-sync.test.ts`
- [ ] T087 [P] [US-2] Test sync creates teams for user's orgs in `web/__tests__/integration/auth/org-sync.test.ts`
- [ ] T088 [P] [US-2] Test sync adds user to existing teams in `web/__tests__/integration/auth/org-sync.test.ts`

## Phase 8: E2E Tests (2 days)

### P8.1: Org Repo Connection Flow

- [ ] T089 [P] [US-2] Test user connects org repo → sees confirmation in `web/__tests__/e2e/org-team-integration.spec.ts`
- [ ] T090 [US-2] Test user confirms → team created in `web/__tests__/e2e/org-team-integration.spec.ts`
- [ ] T091 [US-2] Test team already exists → no prompt in `web/__tests__/e2e/org-team-integration.spec.ts`
- [ ] T092 [P] [US-2] Test user not in org → error shown in `web/__tests__/e2e/org-team-integration.spec.ts`

### P8.2: Access Control

- [ ] T093 [P] [US-2] Test team member can access private org repo in `web/__tests__/e2e/org-team-integration.spec.ts`
- [ ] T094 [P] [US-2] Test non-member cannot access private org repo in `web/__tests__/e2e/org-team-integration.spec.ts`

### P8.3: Multi-Provider

- [ ] T095 [P] [US-2] Test same org name on different providers creates separate teams in `web/__tests__/e2e/org-team-integration.spec.ts`

## Phase 9: Documentation (1 day)

### P9.1: VCS Provider Package Docs

- [ ] T096 [P] [US-2] Update README with organization operations in `web/packages/@catalyst/vcs-provider/README.md`
- [ ] T097 [P] [US-2] Add code examples for organization methods in `web/packages/@catalyst/vcs-provider/EXAMPLES.md`
- [ ] T098 [P] [US-2] Update AGENTS.md with organization patterns in `web/packages/@catalyst/vcs-provider/AGENTS.md`

### P9.2: Web Application Docs

- [ ] T099 [P] [US-2] Document team-org integration in `web/CLAUDE.md`
- [ ] T100 [P] [US-2] Update database schema documentation in `web/docs/teams-repos-projects-database.md`
- [ ] T101 [P] [US-2] Add organization team workflow to user documentation

### P9.3: Spec Updates

- [ ] T102 [P] [US-2] Mark US-2 as completed in `specs/003-vcs-providers/spec.md`
- [ ] T103 [P] [US-2] Update implementation status in `specs/003-vcs-providers/plan.md`

## Phase 10: Future Provider Support (Future Work)

### P10.1: GitLab Implementation

- [ ] T104 [P] Implement `getOrganization()` for GitLab using `/groups/:id` API
- [ ] T105 [P] Implement `listOrganizationMembers()` for GitLab
- [ ] T106 [P] Implement `getMyOrganizationMembership()` for GitLab
- [ ] T107 [P] Add GitLab role mapping (owner → owner, maintainer → admin, developer → member)
- [ ] T108 [P] Add GitLab webhook handlers for group membership events
- [ ] T109 [P] Update OAuth scopes for GitLab (`read_api`)

### P10.2: Gitea/Forgejo Implementation

- [ ] T110 [P] Implement `getOrganization()` for Gitea/Forgejo using `/orgs/:orgname` API
- [ ] T111 [P] Implement `listOrganizationMembers()` for Gitea/Forgejo
- [ ] T112 [P] Implement `getMyOrganizationMembership()` for Gitea/Forgejo
- [ ] T113 [P] Add Gitea/Forgejo webhook handlers for org membership events
- [ ] T114 [P] Update OAuth scopes for Gitea/Forgejo (`read:organization`)

### P10.3: Bitbucket Implementation

- [ ] T115 [P] Implement `getOrganization()` for Bitbucket using `/workspaces/:workspace` API
- [ ] T116 [P] Implement `listOrganizationMembers()` for Bitbucket
- [ ] T117 [P] Implement `getMyOrganizationMembership()` for Bitbucket
- [ ] T118 [P] Add Bitbucket webhook handlers for workspace membership events
- [ ] T119 [P] Update OAuth scopes for Bitbucket (`workspace`)

## Success Criteria

- [ ] SC-001 User connects private org repo → sees confirmation dialog
- [ ] SC-002 User confirms → team created with VCS org metadata
- [ ] SC-003 VCS org member added → webhook creates team membership
- [ ] SC-004 VCS org member removed → webhook removes team membership
- [ ] SC-005 User without org membership → cannot access private org repos
- [ ] SC-006 All tests passing (unit, integration, e2e)
- [ ] GitHub implementation complete and documented
- [ ] Database schema supports multiple VCS providers
- [ ] Provider-agnostic interface enables future provider implementations

## Phase 11: Container Registry Integration

- [ ] T120 Define `ProjectRegistrySecret` schema or convention in `web/src/db/schema.ts` (if needed) or utilize existing Secret management.
- [ ] T121 Update VCS Provider logic to expose GHCR credentials (e.g. create Kubernetes Secret `registry-credentials` in project namespace).
- [ ] T122 Implement UI for users to provide generic registry credentials (Docker Hub, etc.).