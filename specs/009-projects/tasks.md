# Tasks: Projects Management

**Input**: Design documents from `/specs/009-projects/`
**Prerequisites**: plan.md, spec.md, data-model.md

**Key Principle**: VCS-First - fetch data from GitHub API, don't sync to database tables.

**Organization**: Tasks grouped by phase/user story. MVP = Phases 1-4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

- **Web app**: `web/src/` (Next.js App Router)
- **Actions**: `web/src/actions/`
- **Lib**: `web/src/lib/`
- **Pages**: `web/src/app/`
- **Tests**: `web/__tests__/`

---

## Phase 1: Setup

**Purpose**: Ensure projects table has slug field for URL routing.

- [x] T001 Slug column exists in projects table with unique per-team constraint (web/src/db/schema.ts)
- [x] T002 VCS provider abstraction exists (web/src/lib/vcs-providers/)
- [ ] T003 [P] Create spec types file in web/src/lib/types/specs.ts (optional - types inline)
- [ ] T004 [P] Create CI check types file in web/src/lib/types/ci-checks.ts

**Checkpoint**: Types defined, schema ready.

---

## Phase 2: US1 - Manage Specs in Repository (Priority: P1)

**Goal**: Users can view and manage specs stored in their repository.

**Independent Test**: Navigate to project specs page, see specs from repo.

### VCS Adapter

- [x] T005 [US1] VCS provider base exists (web/src/lib/vcs-providers/)
- [x] T006 [US1] `listDirectory()` implemented (web/src/actions/version-control-provider.ts)
- [x] T007 [US1] `readFile()` implemented (web/src/actions/version-control-provider.ts)
- [ ] T008 [US1] Implement `createOrUpdateFile()` for spec editing (web/src/actions/version-control-provider.ts)

### Server Actions

- [x] T009 [US1] Spec listing works via `listDirectory` action
- [x] T010 [US1] Spec content reading works via `readFile` action
- [ ] T011 [US1] Create `updateSpec(projectId, specPath, content)` action in web/src/actions/specs.ts
- [ ] T012 [US1] Create `createSpec(projectId, specName)` action in web/src/actions/specs.ts

### UI Pages

- [x] T013 [US1] Spec list page exists (web/src/app/(dashboard)/specs/[project-slug]/page.tsx)
- [x] T014 [US1] Spec detail page with file navigation (web/src/app/(dashboard)/projects/[slug]/spec/[specId]/page.tsx)

**Checkpoint**: Users can view specs from repository. Write capability pending.

---

## Phase 3: US2 - View Current Work (PRs) (Priority: P1)

**Goal**: Users see open PRs with links to preview environments.

**Independent Test**: View project work page, see open PRs with preview env links.

### VCS Adapter

- [x] T015 [US2] `fetchProjectPullRequests()` fetches PRs from GitHub (web/src/actions/projects.ts)
- [x] T016 [US2] `fetchProjectIssues()` fetches issues from GitHub (web/src/actions/projects.ts)

### Server Actions

- [x] T017 [US2] PR fetching action exists (fetchProjectPullRequests in projects.ts)
- [ ] T018 [US2] Create dedicated `getPullRequest(projectId, number)` action for single PR detail
- [ ] T019 [US2] Implement preview environment linking (join PRs with pullRequestPods table)

### UI Pages

- [ ] T020 [US2] Create PR list page (replace mock tasks with real PRs) - web/src/app/(dashboard)/projects/[slug]/work/page.tsx exists but empty
- [ ] T021 [US2] Create PR list item component with preview URL link
- [ ] T022 [US2] Create PR detail page in web/src/app/(dashboard)/projects/[slug]/prs/[number]/page.tsx

### Tests

- [ ] T023 [P] [US2] Unit test for GitHub PR listing
- [ ] T024 [P] [US2] Integration test for work-items actions

**Checkpoint**: Users can see PRs with preview environment links.

---

## Phase 4: US3 - View CI Check Status (Priority: P1)

**Goal**: Developers can see CI check status for PRs.

**Independent Test**: View PR detail, see CI checks with pass/fail status.

### VCS Adapter

- [ ] T025 [US3] Implement `getCheckRuns(owner, repo, ref)` in VCS provider
- [ ] T026 [US3] Implement `getCommitStatuses(owner, repo, ref)` in VCS provider
- [ ] T027 [US3] Implement `normalizeStatusChecks()` utility

### Server Actions

- [ ] T028 [US3] Create `getCIStatus(projectId, prNumber)` action in web/src/actions/ci-checks.ts

### UI Components

- [ ] T029 [US3] Create CIStatusBadge component in web/src/components/ci/CIStatusBadge.tsx
- [ ] T030 [US3] Create CIChecksList component in web/src/components/ci/CIChecksList.tsx

### Integration

- [ ] T031 [US3] Add CI status to PR detail page
- [ ] T032 [US3] Add CI status summary badge to PR list items

### Tests

- [ ] T033 [P] [US3] Unit test for CI status normalization
- [ ] T034 [P] [US3] Integration test for ci-checks action

**Checkpoint**: MVP Complete - Specs, PRs, and CI Checks working.

---

## Phase 5: US4-6 - Polish (Priority: P2)

**Goal**: Enhanced PR context, branch management, project settings.

### US4 - PR Context Display

- [ ] T035 [US4] Display PR description (markdown rendered) on detail page
- [ ] T036 [US4] Parse and link to related issues/specs mentioned in PR
- [ ] T037 [US4] Display commit list on PR detail page

### US5 - Branch Management

- [ ] T038 [US5] Implement `updatePullRequestBranch(owner, repo, number)` in VCS adapter
- [ ] T039 [US5] Create branch update action in web/src/actions/branch-management.ts
- [ ] T040 [US5] Add "Update Branch" button to PR detail page
- [ ] T041 [US5] Display commits behind count and merge-ready indicator

### US6 - Project Settings

- [x] T042 [US6] Project pages exist with slug routing (web/src/app/(dashboard)/projects/[slug]/)
- [x] T043 [US6] Repository info displayed on project page
- [ ] T044 [US6] Create dedicated settings page for project configuration

**Checkpoint**: All user stories complete.

---

## Phase 6: US7 - Categorized Work Items (Priority: P1)

**Goal**: Display PRs and branches categorized into Feature Tasks and Platform Tasks.

**Independent Test**: View project page, see PRs/branches in Feature and Platform sections.

### Categorization Utility

- [ ] T045 [P] [US7] Create work categorization utility in web/src/lib/work-categorization.ts
  - `categorizeByText(text: string): WorkCategory`
  - `categorizePR(pr: { title, headBranch }): WorkCategory`
  - `categorizeBranch(branch: { name, lastCommitMessage? }): WorkCategory`
  - Platform patterns: `^chore[:/(]`, `^ci[:/(]`, `^build[:/(]`, `chore/`, `^chore-`

### VCS Adapter - Branch Listing

- [ ] T046 [US7] Add Branch types to VCS provider (packages/@catalyst/vcs-provider/src/types.ts)
  - `Branch`: name, sha, htmlUrl
  - `BranchWithCommit`: extends Branch with lastCommitDate, lastCommitMessage, lastCommitAuthor
- [ ] T047 [US7] Implement `fetchRecentBranches(octokit, owner, repo, sinceDays)` in GitHub client
  - Fetch branches via `octokit.rest.repos.listBranches()`
  - Fetch commit info for each branch
  - Filter to branches with commits in last N days
- [ ] T048 [US7] Export branch functions from VCS provider index

### Work Item Types

- [ ] T049 [P] [US7] Create WorkItem types in web/src/components/tasks/types.ts
  - `WorkItemPR`: kind, id, number, title, author, authorAvatar, repository, url, status, updatedAt, category
  - `WorkItemBranch`: kind, id, name, repository, url, lastCommitMessage, lastCommitAuthor, lastCommitDate, category
  - `WorkItem = WorkItemPR | WorkItemBranch`

### Server Action

- [ ] T050 [US7] Create `fetchProjectWorkItems(projectSlug)` action in web/src/actions/work-items.ts
  - Fetch open PRs from project repos
  - Fetch branches with recent commits (7 days)
  - Filter branches that have open PRs
  - Categorize and return: `{ featurePRs, featureBranches, platformPRs, platformBranches }`

### UI Components

- [ ] T051 [P] [US7] Create PRItemRow component in web/src/components/tasks/PRItemRow.tsx
  - Git PR icon, #{number} {title}
  - Author avatar, repo name
  - Status pill (draft/ready/changes_requested)
- [ ] T052 [P] [US7] Create BranchItemRow component in web/src/components/tasks/BranchItemRow.tsx
  - Git Branch icon
  - Branch name (monospace)
  - Last commit message, author, relative date
- [ ] T053 [US7] Create WorkItemsSection component in web/src/components/tasks/WorkItemsSection.tsx
  - Props: title, type: 'feature' | 'platform', prs, branches, tasksLink
  - Sub-sections: "Pull Requests" and "Active Branches"
  - Empty states for each sub-section

### Page Integration

- [ ] T054 [US7] Update project page.tsx to call fetchProjectWorkItems(slug)
- [ ] T055 [US7] Update project-page-content.tsx to use WorkItemsSection instead of TasksSection
  - Remove mock taskFixtures
  - Accept workItems prop
  - Render Feature Tasks and Platform Tasks with real data

### Mock Data

- [ ] T056 [P] [US7] Add mock branches to web/src/mocks/github-data.yaml
  - Mix of chore/ and feat/ prefixes
  - Ensure mock PRs have headBranch populated

### Tests

- [ ] T057 [P] [US7] Unit tests for work-categorization.ts functions
- [ ] T058 [P] [US7] Component tests for PRItemRow and BranchItemRow
- [ ] T059 [US7] E2E test verifying correct categorization in Feature vs Platform sections

**Checkpoint**: Work items categorized and displayed correctly.

---

## Summary

| Phase | Tasks     | User Story            | Priority | Done | Remaining |
| ----- | --------- | --------------------- | -------- | ---- | --------- |
| 1     | T001-T004 | Setup                 | -        | 2    | 2         |
| 2     | T005-T014 | US1: Manage Specs     | P1       | 8    | 2         |
| 3     | T015-T024 | US2: View PRs         | P1       | 3    | 7         |
| 4     | T025-T034 | US3: CI Checks        | P1       | 0    | 10        |
| 5     | T035-T044 | US4-6: Polish         | P2       | 2    | 8         |
| 6     | T045-T059 | US7: Categorized Work | P1       | 0    | 15        |

**Total Tasks**: 59
**Completed**: 15 (25%)
**Remaining for MVP (Phases 1-4, 6)**: 36 tasks

---

## Next Priority Tasks

1. **T045**: Create work categorization utility (foundation for Phase 6)
2. **T046-T048**: Add branch listing to VCS provider
3. **T049-T050**: Create WorkItem types and server action
4. **T051-T055**: Create UI components and integrate with project page
5. **T020-T022**: Replace mock tasks with real PRs on project page (high impact)
6. **T019**: Link PRs to preview environments
7. **T025-T032**: Add CI check status display

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- VCS-first: GitHub API calls, no database tables for PRs/specs/checks
- Existing code uses Octokit for GitHub API calls
- VCS provider abstraction in `web/src/lib/vcs-providers/`
