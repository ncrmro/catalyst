# Tasks: Projects Management

**Input**: Design documents from `/specs/009-projects/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a core feature requiring >80% coverage (Constitution Check: Principle 5)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `web/src/` (Next.js App Router)
- **Database**: `web/src/db/schema.ts`
- **Models**: `web/src/models/`
- **Actions**: `web/src/actions/`
- **Pages**: `web/src/app/`
- **Tests**: `web/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema extensions and core infrastructure

- [ ] T001 Extend projects table with status fields in web/src/db/schema.ts
- [ ] T002 Create projectSpecs table schema in web/src/db/schema.ts
- [ ] T003 [P] Create workItems table schema in web/src/db/schema.ts
- [ ] T004 [P] Create workItemScores table schema in web/src/db/schema.ts
- [ ] T005 [P] Create projectPrioritizationRules table schema in web/src/db/schema.ts
- [ ] T006 Add Drizzle relations for all new entities in web/src/db/schema.ts
- [ ] T007 Generate database migration with npm run db:generate
- [ ] T008 Apply migration with npm run db:migrate and verify with npm run db:studio
- [ ] T009 Create data migration script to backfill `slug` for existing projects

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and lib functions that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Create project status types and validation in web/src/lib/types/projects.ts
- [ ] T011 [P] Create test factory for projects in web/**tests**/factories/project.ts
- [ ] T012 [P] Create test factory for work items in web/**tests**/factories/work-item.ts
- [ ] T013 Implement prioritization rule engine in web/src/lib/prioritization.ts
- [ ] T014 Unit test for prioritization rule engine in web/**tests**/unit/lib/prioritization.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create and Configure a Project (Priority: P1) MVP

**Goal**: Users can create projects with repositories, configure environments, and enable agents

**Independent Test**: Create project via UI, verify in list, confirm repository accessible

### Tests for User Story 1

- [ ] T015 [P] [US1] Integration test for createProject action in web/**tests**/integration/actions/projects.test.ts
- [ ] T016 [P] [US1] Integration test for getProjects action in web/**tests**/integration/actions/projects.test.ts
- [ ] T017 [P] [US1] Integration test for updateProjectStatus action in web/**tests**/integration/actions/projects.test.ts

### Implementation for User Story 1

- [x] T018 [US1] Implement createProject model function in web/src/models/projects.ts
- [x] T019 [US1] Implement getProjects model function in web/src/models/projects.ts
- [x] T020 [US1] Implement getProjectBySlug model function in web/src/models/projects.ts
- [x] T021 [US1] Implement updateProject model function in web/src/models/projects.ts
- [ ] T022 [US1] Implement updateProjectStatus model function in web/src/models/projects.ts
- [ ] T023 [US1] Create createProject server action in web/src/actions/projects.ts
- [x] T024 [US1] Create getProjects server action in web/src/actions/projects.ts
- [x] T025 [US1] Create getProject server action in web/src/actions/projects.ts
- [ ] T026 [US1] Create updateProject server action in web/src/actions/projects.ts
- [ ] T027 [US1] Create updateProjectStatus server action in web/src/actions/projects.ts
- [ ] T028 [US1] Create project creation page in web/src/app/projects/new/page.tsx
- [ ] T029 [US1] Create project detail page in web/src/app/projects/[slug]/page.tsx
- [ ] T030 [US1] Create project settings page in web/src/app/projects/[slug]/settings/page.tsx
- [ ] T031 [US1] E2E test for project creation flow in web/**tests**/e2e/project-creation.spec.ts

**Checkpoint**: User Story 1 complete - projects can be created, viewed, and managed

---

## Phase 4: User Story 2 - View Prioritized Work Dashboard (Priority: P1)

**Goal**: Users see prioritized work across projects with feature and platform work separated

**Independent Test**: View dashboard, verify issues/PRs sorted by priority

### Tests for User Story 2

- [ ] T032 [P] [US2] Unit test for work item aggregation in web/**tests**/unit/models/work-items.test.ts
- [ ] T033 [P] [US2] Unit test for priority scoring in web/**tests**/unit/models/prioritization.test.ts
- [ ] T034 [P] [US2] Integration test for getPrioritizedWork action in web/**tests**/integration/actions/dashboard.test.ts

### Implementation for User Story 2

- [ ] T035 [US2] Implement syncWorkItemsFromGitHub model function in web/src/models/work-items.ts
- [ ] T036 [US2] Implement aggregateWorkItems model function in web/src/models/work-items.ts
- [ ] T037 [US2] Implement calculatePriorityScore model function in web/src/models/prioritization.ts
- [ ] T038 [US2] Implement getPrioritizedWork model function in web/src/models/work-items.ts
- [ ] T039 [US2] Implement recalculateWorkItemPriority model function in web/src/models/prioritization.ts
- [ ] T040 [US2] Create getPrioritizedWork server action in web/src/actions/dashboard.ts
- [ ] T041 [US2] Create getPrioritizationRules server action in web/src/actions/dashboard.ts
- [ ] T042 [US2] Create createPrioritizationRule server action in web/src/actions/dashboard.ts
- [ ] T043 [US2] Create WorkItemList component in web/src/app/dashboard/\_components/WorkItemList.tsx
- [ ] T044 [US2] Create PlatformWorkSection component in web/src/app/dashboard/\_components/PlatformWorkSection.tsx
- [ ] T045 [US2] Create PriorityFilters component in web/src/app/dashboard/\_components/PriorityFilters.tsx
- [ ] T046 [US2] Create dashboard page in web/src/app/dashboard/page.tsx
- [ ] T047 [US2] E2E test for dashboard workflow in web/**tests**/e2e/dashboard.spec.ts

**Checkpoint**: User Stories 1 AND 2 complete - projects and dashboard working

---

## Phase 5: User Story 7 - CI Checks UI for Development Environments (Priority: P1)

**Goal**: Developers can view CI status, manage PR branches, and debug failures with agents

### UI Mocks (Storybook)

- [ ] T048 [US7] Create `environment-ci-panel` component with stories in web/src/app/dashboard/_components/ci/EnvironmentCIPanel.stories.tsx
- [ ] T049 [P] [US7] Create `pr-context-card` component with stories in web/src/app/dashboard/_components/ci/PRContextCard.stories.tsx
- [ ] T050 [P] [US7] Create `ci-checks-summary` component with stories in web/src/app/dashboard/_components/ci/CIChecksSummary.stories.tsx
- [ ] T051 [P] [US7] Create `branch-actions-bar` component with stories in web/src/app/dashboard/_components/ci/BranchActionsBar.stories.tsx
- [ ] T052 [P] [US7] Create `ci-status-badge` component with stories in web/src/app/dashboard/_components/ci/CIStatusBadge.stories.tsx

### Integration Preparation

- [ ] T053 [US7] Create shared TypeScript types for StatusCheck, PRContext in web/src/lib/types/ci-checks.ts
- [ ] T054 [P] [US7] Create mock data factory functions in web/__tests__/factories/ci-checks.ts
- [ ] T055 [P] [US7] Add component tests with Vitest in web/__tests__/unit/components/ci-checks.test.tsx

### Backend Integration

- [ ] T056 [US7] Add `getStatusChecks()` to VCS provider interface in web/src/lib/vcs/types.ts
- [ ] T057 [US7] Implement GitHub adapter for Check Runs API in web/src/lib/vcs/github.ts
- [ ] T058 [US7] Implement GitHub adapter for Commit Statuses API in web/src/lib/vcs/github.ts
- [ ] T059 [US7] Create normalizing function to unify both APIs in web/src/lib/vcs/utils.ts
- [ ] T060 [US7] Create `src/actions/ci-checks.ts` with getStatusChecks
- [ ] T061 [US7] Create `src/actions/branch-management.ts` with updateBranch, squashCommits
- [ ] T062 [US7] Handle `check_run` webhook events in web/src/app/api/github/webhook/route.ts
- [ ] T063 [US7] Handle `status` webhook events (commit statuses) in web/src/app/api/github/webhook/route.ts
- [ ] T064 [US7] Update environment status on webhook receipt in web/src/models/project-environments.ts
- [ ] T065 [US7] Connect `environment-ci-panel` to server actions in web/src/app/dashboard/_components/ci/EnvironmentCIPanel.tsx
- [ ] T066 [US7] Add preview URL display logic in web/src/app/dashboard/_components/ci/EnvironmentCIPanel.tsx
- [ ] T067 [US7] Wire up branch management actions in web/src/app/dashboard/_components/ci/BranchActionsBar.tsx

### Agent Integration

- [ ] T068 [US7] Add "Debug with Agent" action button in web/src/app/dashboard/_components/ci/EnvironmentCIPanel.tsx
- [ ] T069 [US7] Pass environment/PR context to agent chat in web/src/actions/chat.ts
- [ ] T070 [US7] Implement agent dispatch for CI failure analysis in web/src/agents/project-agent.ts

### Polish

- [ ] T068 [P] [US7] Accessibility audit (ARIA labels, keyboard nav)
- [ ] T069 [P] [US7] Performance optimization (lazy loading, caching)
- [ ] T070 [US7] Verify success metrics from spec.md
- [ ] T071 [US7] E2E tests for full CI workflow in web/__tests__/e2e/ci-checks.spec.ts

**Checkpoint**: User Story 7 complete

---

## Phase 6: User Story 6 - Manage Specs in Repository (Priority: P3)

**Goal**: Spec files in repositories are detected, indexed, and linked to issues/PRs

**Independent Test**: Commit spec file, verify appears in Catalyst UI with proper parsing

### Tests for User Story 6

- [ ] T072 [P] [US6] Unit test for spec pattern detection in web/**tests**/unit/models/project-specs.test.ts
- [ ] T073 [P] [US6] Unit test for spec metadata parsing in web/**tests**/unit/models/project-specs.test.ts
- [ ] T074 [P] [US6] Integration test for syncProjectSpecs action in web/**tests**/integration/actions/project-specs.test.ts

### Implementation for User Story 6

- [ ] T075 [US6] Implement detectSpecFiles model function in web/src/models/project-specs.ts
- [ ] T076 [US6] Implement parseSpecMetadata model function in web/src/models/project-specs.ts
- [ ] T077 [US6] Implement syncProjectSpecs model function in web/src/models/project-specs.ts
- [ ] T078 [US6] Implement linkSpecToIssues model function in web/src/models/project-specs.ts
- [ ] T079 [US6] Create getProjectSpecs server action in web/src/actions/project-specs.ts
- [ ] T080 [US6] Create syncProjectSpecs server action in web/src/actions/project-specs.ts
- [ ] T081 [US6] Create spec file list page in web/src/app/projects/[slug]/specs/page.tsx
- [ ] T082 [US6] Add spec sync to GitHub webhook handler in web/src/app/api/github/webhook/route.ts

**Checkpoint**: All user stories complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T083 [P] Add Storybook stories for WorkItemList component in web/src/app/dashboard/\_components/WorkItemList.stories.tsx
- [ ] T084 [P] Add Storybook stories for PlatformWorkSection component in web/src/app/dashboard/\_components/PlatformWorkSection.stories.tsx
- [ ] T085 [P] Add Storybook stories for PriorityFilters component in web/src/app/dashboard/\_components/PriorityFilters.stories.tsx
- [ ] T086 Optimize dashboard query for <3s load time (SC-002)
- [ ] T087 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1, US2, and US7 are P1 priority - implement first (Phases 3-5)
  - US6 is P3 priority - implement after P1 stories (Phase 6)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - core foundation
- **User Story 2 (P1)**: Can integrate with US1 projects - independently testable
- **User Story 7 (P1)**: Uses US1 projects - independently testable
- **User Story 6 (P3)**: Uses US1 projects and repositories - independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before actions
- Actions before pages
- Core implementation before MCP tools
- Story complete before moving to next priority

---

## Implementation Strategy

### MVP First (User Stories 1, 2, & 7)

1. Complete Phase 1: Setup (schema)
2. Complete Phase 2: Foundational (factories, prioritization engine)
3. Complete Phase 3: User Story 1 (project CRUD)
4. Complete Phase 4: User Story 2 (dashboard)
5. Complete Phase 5: User Story 7 (CI Checks UI)
6. **STOP and VALIDATE**: Test US1, US2, & US7 independently
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (MVP: Project creation)
3. Add User Story 2 → Test → Deploy (Dashboard visible)
4. Add User Story 7 → Test → Deploy (CI Checks)
5. Add User Story 6 → Test → Deploy (Spec Management)
6. Each story adds value without breaking previous stories

---

## Summary

| Phase | Tasks     | User Story            | Priority | Parallel Tasks |
| ----- | --------- | --------------------- | -------- | -------------- |
| 1     | T001-T009 | Setup                 | -        | 6              |
| 2     | T010-T014 | Foundational          | -        | 3              |
| 3     | T015-T031 | US1: Project Creation | P1       | 3              |
| 4     | T032-T047 | US2: Dashboard        | P1       | 3              |
| 5     | T048-T071 | US7: CI Checks UI     | P1       | 3              |
| 6     | T072-T082 | US6: Spec Management  | P3       | 3              |
| 7     | T083-T087 | Polish                | -        | 3              |

**Total Tasks**: 87
**MVP Scope**: Tasks T001-T071 (US1 + US2 + US7)
**Independent Test Criteria**: Each user story has its own checkpoint validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently