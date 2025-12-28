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

## Summary

| Phase | Tasks     | User Story        | Priority | Done | Remaining |
| ----- | --------- | ----------------- | -------- | ---- | --------- |
| 1     | T001-T004 | Setup             | -        | 2    | 2         |
| 2     | T005-T014 | US1: Manage Specs | P1       | 8    | 2         |
| 3     | T015-T024 | US2: View PRs     | P1       | 3    | 7         |
| 4     | T025-T034 | US3: CI Checks    | P1       | 0    | 10        |
| 5     | T035-T044 | US4-6: Polish     | P2       | 2    | 8         |

**Total Tasks**: 44
**Completed**: 15 (34%)
**Remaining for MVP (Phases 1-4)**: 21 tasks

---

## Next Priority Tasks

1. **T020-T022**: Replace mock tasks with real PRs on project page (high impact)
2. **T019**: Link PRs to preview environments
3. **T025-T032**: Add CI check status display
4. **T008, T011-T012**: Add spec editing capability

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- VCS-first: GitHub API calls, no database tables for PRs/specs/checks
- Existing code uses Octokit for GitHub API calls
- VCS provider abstraction in `web/src/lib/vcs-providers/`
