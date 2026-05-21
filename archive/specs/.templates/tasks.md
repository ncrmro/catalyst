# Tasks: [FEATURE NAME]

**Spec**: `###-feature-slug`
**Prerequisites**: spec.md, plan.md

<!--
  Phased task breakdown for implementation.

  FORMAT: [ID] [P?] [US#] Description
  - [P] = Can run in parallel (different files, no dependencies)
  - [US#] = User story reference from spec.md

  UI-FIRST APPROACH: Mock UI components in Storybook with fixture data
  before implementing backend. This validates UX early.
-->

## Phase 0: Spike (if needed)

<!--
  Proof-of-concept work to validate risky/unknown functionality.
  Skip this phase if no spikes defined in plan.md.
-->

- [ ] T001 [Spike] Validate [specific uncertainty] per plan.md

---

## Phase 1: Setup

**Goal**: Project structure and dependencies ready

- [ ] T002 Add new dependencies to package.json
- [ ] T003 [P] Create database migrations
- [ ] T004 [P] Create model file structure

**Checkpoint**: `npm run typecheck` passes

---

## Phase 2: UI Mocks (Storybook)

<!--
  Build UI components with fixture data before backend exists.
  Uses schema types from plan.md for type-safe fixtures.
-->

**Goal**: All UI components viewable in Storybook

- [ ] T005 [P] [US-1] Create ExampleList component with fixtures
- [ ] T006 [P] [US-1] Create ExampleForm component with fixtures
- [ ] T007 [P] [US-2] Create ExampleDetail component with fixtures
- [ ] T008 Add Storybook stories for all components

**Checkpoint**: UI review complete, UX validated

---

## Phase 3: User Story 1 - [Title] (P1)

**Goal**: [What this story delivers - from spec.md]

### Backend

- [ ] T009 [US-1] Implement model layer in src/models/
- [ ] T010 [US-1] Implement server actions in src/actions/
- [ ] T011 [US-1] Add input validation with Zod

### Integration

- [ ] T012 [US-1] Connect UI components to server actions
- [ ] T013 [US-1] Add error handling and loading states

### Tests

- [ ] T014 [P] [US-1] Unit tests for model layer
- [ ] T015 [P] [US-1] Integration tests for server actions
- [ ] T016 [US-1] E2E test for happy path

**Checkpoint**: US-1 independently testable and deployable

---

## Phase 4: User Story 2 - [Title] (P2)

**Goal**: [What this story delivers - from spec.md]

### Backend

- [ ] T017 [US-2] Implement additional model methods
- [ ] T018 [US-2] Implement server actions

### Integration

- [ ] T019 [US-2] Connect UI components to server actions
- [ ] T020 [US-2] Integrate with US-1 components (if needed)

### Tests

- [ ] T021 [P] [US-2] Unit tests
- [ ] T022 [P] [US-2] Integration tests

**Checkpoint**: US-1 + US-2 both work independently

---

## Phase 5: User Story 3 - [Title] (P3)

**Goal**: [What this story delivers - from spec.md]

- [ ] T023 [US-3] Implement backend
- [ ] T024 [US-3] Connect UI
- [ ] T025 [P] [US-3] Tests

**Checkpoint**: All user stories complete

---

## Phase N: Polish

**Goal**: Cross-cutting improvements

- [ ] T026 [P] Performance optimization
- [ ] T027 [P] Accessibility audit
- [ ] T028 Verify success metrics from spec.md
- [ ] T029 Update quickstart.md with final instructions

---

## Dependencies

```
Phase 0 (Spike) ─► Phase 1 (Setup) ─► Phase 2 (UI Mocks)
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                       ▼                       ▼
              Phase 3 (US-1)          Phase 4 (US-2)          Phase 5 (US-3)
                    │                       │                       │
                    └───────────────────────┴───────────────────────┘
                                            │
                                            ▼
                                      Phase N (Polish)
```

## Parallel Opportunities

- All [P] tasks within a phase can run simultaneously
- After Phase 2, user story phases can proceed in parallel
- Different developers can own different user stories
