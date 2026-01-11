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
- [x] T003 [P] Create spec types file in web/src/lib/types/specs.ts (optional - types inline)
- [x] T004 [P] Create CI check types file in web/src/lib/types/ci-checks.ts

**Checkpoint**: Types defined, schema ready.

---

## Phase 2: US1 - Manage Specs in Repository (Priority: P1)

**Goal**: Users can view and manage specs stored in their repository.

**Independent Test**: Navigate to project specs page, see specs from repo.

### VCS Adapter

- [x] T005 [US1] VCS provider base exists (web/src/lib/vcs-providers/)
- [x] T006 [US1] `listDirectory()` implemented (web/src/actions/version-control-provider.ts)
- [x] T007 [US1] `readFile()` implemented (web/src/actions/version-control-provider.ts)
- [x] T008 [US1] Implement `createOrUpdateFile()` for spec editing (web/src/actions/version-control-provider.ts)

### Server Actions

- [x] T009 [US1] Spec listing works via `listDirectory` action
- [x] T010 [US1] Spec content reading works via `readFile` action
- [x] T011 [US1] Create `updateSpec(projectId, specPath, content)` action in web/src/actions/specs.ts
- [x] T012 [US1] Create `createSpec(projectId, specName)` action in web/src/actions/specs.ts

### UI Pages

- [x] T013 [US1] Spec list page exists (web/src/app/(dashboard)/specs/[project-slug]/page.tsx)
- [x] T014 [US1] Spec detail page with file navigation (web/src/app/(dashboard)/projects/[slug]/spec/[specId]/page.tsx)

**Checkpoint**: Users can view and manage specs from repository.

---

## Phase 3: US2 - View Current Work (PRs) (Priority: P1)

**Goal**: Users see open PRs with links to preview environments.

**Independent Test**: View project work page, see open PRs with preview env links.

### VCS Adapter

- [x] T015 [US2] `fetchProjectPullRequests()` fetches PRs from GitHub (web/src/actions/projects.ts)
- [x] T016 [US2] `fetchProjectIssues()` fetches issues from GitHub (web/src/actions/projects.ts)

### Server Actions

- [x] T017 [US2] PR fetching action exists (fetchProjectPullRequests in projects.ts)
- [x] T018 [US2] Create dedicated `getPullRequest(projectId, number)` action for single PR detail
- [x] T019 [US2] Implement preview environment linking (join PRs with pullRequestPods table)

### UI Pages

- [x] T020 [US2] Create PR list page (replace mock tasks with real PRs) - Integrated into project page
- [x] T021 [US2] Create PR list item component with preview URL link
- [x] T022 [US2] Create PR detail page in web/src/app/(dashboard)/projects/[slug]/prs/[number]/page.tsx

### Tests

- [ ] T023 [P] [US2] Unit test for GitHub PR listing
- [ ] T024 [P] [US2] Integration test for work-items actions

**Checkpoint**: Users can see PRs with preview environment links.

---

## Phase 4: US3 - View CI Check Status (Priority: P1)

**Goal**: Developers can see CI check status for PRs.

**Independent Test**: View PR detail, see CI checks with pass/fail status.

### VCS Adapter

- [x] T025 [US3] Implement `getCheckRuns(owner, repo, ref)` in VCS provider
- [x] T026 [US3] Implement `getCommitStatuses(owner, repo, ref)` in VCS provider
- [x] T027 [US3] Implement `normalizeStatusChecks()` utility

### Server Actions

- [x] T028 [US3] Create `getCIStatus(projectId, prNumber)` action in web/src/actions/ci-checks.ts

### UI Components

- [x] T029 [US3] Create CIStatusBadge component in web/src/components/ci/CIStatusBadge.tsx
- [x] T030 [US3] Create CIChecksList component in web/src/components/ci/CIChecksList.tsx

### Integration

- [x] T031 [US3] Add CI status to PR detail page
- [x] T032 [US3] Add CI status summary badge to PR list items

### Tests

- [ ] T033 [P] [US3] Unit test for CI status normalization
- [ ] T034 [P] [US3] Integration test for ci-checks action

**Checkpoint**: MVP Complete - Specs, PRs, and CI Checks working.

---

## Phase 5: US4-6 - Polish (Priority: P2)

**Goal**: Enhanced PR context, branch management, project settings.

### US4 - PR Context Display

- [x] T035 [US4] Display PR description (markdown rendered) on detail page
- [x] T036 [US4] Parse and link to related issues/specs mentioned in PR
- [x] T037 [US4] Display commit list on PR detail page

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

- [x] T045 [P] [US7] Create work categorization utility in web/src/lib/work-categorization.ts
  - Implemented via pr-spec-matching.ts and issue-spec-matching.ts

### VCS Adapter - Branch Listing

- [x] T046 [US7] Add Branch types to VCS provider (packages/@catalyst/vcs-provider/src/types.ts)
- [x] T047 [US7] Implement `fetchRecentBranches(octokit, owner, repo, sinceDays)` in GitHub client
- [x] T048 [US7] Export branch functions from VCS provider index

### Work Item Types

- [x] T049 [P] [US7] Create WorkItem types in web/src/components/tasks/types.ts
  - Implemented in web/src/lib/work-categorization.ts

### Server Action

- [x] T050 [US7] Create `fetchProjectWorkItems(projectSlug)` action in web/src/actions/work-items.ts

### UI Components

- [x] T051 [P] [US7] Create PRItemRow component in web/src/components/tasks/PRItemRow.tsx
- [x] T052 [P] [US7] Create BranchItemRow component in web/src/components/tasks/BranchItemRow.tsx
- [x] T053 [US7] Create WorkItemsSection component in web/src/components/tasks/WorkItemsSection.tsx

### Page Integration

- [x] T054 [US7] Update project page.tsx to call fetchProjectWorkItems(slug)
- [x] T055 [US7] Update project-page-content.tsx to use WorkItemsSection instead of TasksSection

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

## Phase 7: US8 - Adopt Spec-Driven Development (Priority: P2)

**Goal**: Users can bootstrap and adopt spec-driven development through a dedicated workflow UI.

**Independent Test**: Use the spec workflow UI to bootstrap specs, create a new spec, or add code annotations.

### Spec Workflow UI

- [x] T060 [P] [US8] Create spec workflow page structure in web/src/app/(dashboard)/projects/[slug]/specs/workflow/page.tsx
- [x] T061 [P] [US8] Create SpecWorkflowLayout component with step navigation
- [x] T062 [US8] Create BootstrapSpecsPanel component for analyzing repo and proposing structure

### Bootstrap Specs Action

- [x] T063 [US8] Implement `analyzeRepoForSpecs(projectId)` - read README, docs, code structure via VCS API
- [x] T064 [US8] Implement `bootstrapSpecs(projectId)` action - generate specs/AGENTS.md + templates
- [x] T065 [US8] Create PR with proposed spec structure via VCS API

### Distill Spec from Code

- [x] T066 [US8] Create DistillSpecPanel component with file selector and description input
- [x] T067 [US8] Implement `distillSpec(projectId, description, filePaths)` action
- [x] T068 [US8] Agent integration for code analysis and user story extraction

### Create/Amend Spec

- [x] T069 [US8] Create NewSpecPanel component with description input and preview
- [x] T070 [US8] Implement `createSpec(projectId, name, description)` action
- [x] T071 [US8] Create AmendSpecPanel component showing current spec with edit capability
- [x] T072 [US8] Implement `amendSpec(projectId, specPath, changes)` action

### Code Annotations

- [x] T073 [US8] Create CodeAnnotationsPanel component with FR mapping preview
- [x] T074 [US8] Implement `addCodeAnnotations(projectId, specPath)` action - identify code locations, generate comments

### Tests

- [ ] T075 [P] [US8] Unit tests for spec workflow actions
- [ ] T076 [P] [US8] Integration tests for bootstrap and distill flows
- [ ] T077 [US8] E2E test for complete spec creation workflow

**Checkpoint**: Users can bootstrap spec-driven development and create specs via UI.

---

## Phase 8: US9 - Manage Spec Implementation Work (Priority: P2)

**Goal**: Users can manage spec implementation through organized PRs with dependency visualization.

**Independent Test**: View spec implementation dashboard showing PR graph, review priorities, and ask clarification questions.

### Spec Implementation Dashboard

- [x] T078 [US9] Create implementation dashboard page in web/src/app/(dashboard)/projects/[slug]/specs/[specId]/implementation/page.tsx
- [x] T079 [US9] Create ImplementationOverview component showing progress summary

### Task-to-PR Mapping

- [ ] T080 [US9] Create `suggestPRBoundaries(tasks)` utility in web/src/lib/spec-implementation.ts
- [ ] T081 [US9] Create `identifyParallelWork(tasks)` utility - find [P] marked tasks
- [ ] T082 [US9] Create TaskPRPlanView component displaying suggested PR groupings

### PR Dependency Graph

- [ ] T083 [US9] Research graph visualization library (react-flow vs d3) - add findings to research.md
- [ ] T084 [US9] Create PRDependencyGraph component in web/src/components/specs/PRDependencyGraph.tsx
- [ ] T085 [US9] Implement `buildPRDependencyGraph(prs, tasks)` utility
- [ ] T086 [US9] Add interactive features: hover for details, click to navigate to PR

### Review Priority

- [ ] T087 [US9] Create `prioritizeReviews(prs)` utility in web/src/lib/review-priority.ts
- [ ] T088 [US9] Create ReviewPriorityList component with priority badges
- [ ] T089 [US9] Integrate priority list into implementation dashboard

### Spec Clarification Q&A

- [ ] T090 [US9] Create SpecQAPanel component with chat-like interface
- [ ] T091 [US9] Implement `askSpecQuestion(projectId, specPath, question)` action
- [ ] T092 [US9] Implement `recordClarification(specPath, question, answer)` for tracking Q&A
- [ ] T093 [US9] Add clarification-to-amendment suggestion flow

### Tests

- [ ] T094 [P] [US9] Unit tests for PR boundary and priority utilities
- [ ] T095 [P] [US9] Component tests for PRDependencyGraph and ReviewPriorityList
- [ ] T096 [US9] E2E test for implementation dashboard workflow

**Checkpoint**: Users can visualize and manage spec implementation through organized PRs.

---

## Summary

| Phase | Tasks     | User Story             | Priority | Done | Remaining |
| ----- | --------- | ---------------------- | -------- | ---- | --------- |
| 1     | T001-T004 | Setup                  | -        | 4    | 0         |
| 2     | T005-T014 | US1: Manage Specs      | P1       | 10   | 0         |
| 3     | T015-T024 | US2: View PRs          | P1       | 8    | 2         |
| 4     | T025-T034 | US3: CI Checks         | P1       | 8    | 2         |
| 5     | T035-T044 | US4-6: Polish          | P2       | 5    | 5         |
| 6     | T045-T059 | US7: Categorized Work  | P1       | 4    | 11        |
| 7     | T060-T077 | US8: Adopt Spec-Driven | P2       | 0    | 18        |
| 8     | T078-T096 | US9: Manage Spec Work  | P2       | 0    | 19        |
| 9     | T097-T117 | US10: Spec Agent Chat  | P1       | 10   | 11        |

**Total Tasks**: 96
**Completed**: 56 (58%)
**Remaining for MVP (Phases 1-4, 6)**: 15 tasks
**Remaining for Full Feature (All Phases)**: 40 tasks

---

## Next Priority Tasks

### MVP (P1)

1. **T045**: Create work categorization utility (foundation for Phase 6)
2. **T046-T048**: Add branch listing to VCS provider
3. **T049-T050**: Create WorkItem types and server action
4. **T051-T055**: Create UI components and integrate with project page
5. **T020-T022**: Replace mock tasks with real PRs on project page (high impact)
6. **T019**: Link PRs to preview environments
7. **T025-T032**: Add CI check status display

### Post-MVP (P2)

8. **T060-T065**: Spec workflow UI and bootstrap specs functionality
9. **T066-T068**: Distill spec from existing code
10. **T078-T082**: Spec implementation dashboard and task-to-PR mapping
11. **T083-T086**: PR dependency graph visualization
12. **T087-T089**: Review priority system

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- VCS-first: GitHub API calls, no database tables for PRs/specs/checks
- Existing code uses Octokit for GitHub API calls
- VCS provider abstraction in `web/src/lib/vcs-providers/`
