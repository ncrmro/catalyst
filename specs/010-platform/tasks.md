# Tasks: Platform Management & Automation

**Spec**: `010-platform`
**Prerequisites**: spec.md, plan.md

<!--
  Phased task breakdown for implementation.

  FORMAT: [ID] [P?] [US#] Description
  - [P] = Can run in parallel (different files, no dependencies)
  - [US#] = User story reference from spec.md

  UI-FIRST APPROACH: Mock UI components in Storybook with fixture data
  before implementing backend. This validates UX early.
-->

## Phase 0: Spikes

<!--
  Proof-of-concept work to validate risky/unknown functionality.
-->

- [ ] T001 [Spike] Validate kube-prometheus-stack deployment in K3s VM per plan.md
- [ ] T002 [Spike] Validate AGENTS.md generation from codebase analysis per plan.md
- [ ] T003 [Spike] Validate spec folder parsing and task extraction per plan.md

---

## Phase 1: Database Schema & Setup

**Goal**: Data model and dependencies ready

- [ ] T004 [P] [US-5] Create `convention_rules` table migration
- [ ] T005 [P] [US-6] Create `spec_folders` and `spec_tasks` table migrations
- [ ] T006 [P] [US-3] Create `platform_tasks` table migration
- [ ] T007 [P] [US-9] Create `agent_contexts` table migration
- [ ] T008 [P] [US-7] Create `alert_rules` table migration
- [ ] T009 Add new dependencies: gray-matter, remark/unified, prometheus client

**Checkpoint**: `npm run db:migrate` and `npm run typecheck` pass

---

## Phase 2: UI Mocks (Storybook)

**Goal**: All UI components viewable in Storybook with fixture data

### Platform Dashboard

- [ ] T010 [P] [US-5] Create ConventionStatus component with fixtures
- [ ] T011 [P] [US-6] Create SpecBrowser component with fixtures
- [ ] T012 [P] [US-6] Create SpecTaskList component with fixtures
- [ ] T013 [P] [US-3] Create PlatformTaskQueue component with fixtures

### Observability UI

- [ ] T014 [P] [US-7] Create GoldenSignalDashboard component with fixtures
- [ ] T015 [P] [US-7] Create AlertList component with fixtures
- [ ] T016 [P] [US-8] Create IncidentView component with fixtures
- [ ] T017 [P] [US-8] Create MetricExplorer component with fixtures

### Agent Context UI

- [ ] T018 [P] [US-9] Create AgentContextViewer component with fixtures

- [ ] T019 Add Storybook stories for all new components

**Checkpoint**: UI review complete, UX validated

---

## Phase 3: US-5 - Project Convention Scaffolding (P1)

**Goal**: Platform Agent scaffolds and enforces conventions on onboarded repos

### Backend

- [ ] T020 [US-5] Implement convention rules model in src/models/conventions.ts
- [ ] T021 [US-5] Implement scaffoldProjectConventions action
- [ ] T022 [US-5] Implement detectConventionDrift action
- [ ] T023 [US-5] Implement applyConventionFixes action
- [ ] T024 [US-5] Create convention templates (linting, formatting, commit hooks)
- [ ] T025 [US-5] Add GitHub PR creation for convention scaffolding

### Integration

- [ ] T026 [US-5] Connect ConventionStatus component to server actions
- [ ] T027 [US-5] Add convention onboarding flow in project settings

### Tests

- [ ] T028 [P] [US-5] Unit tests for convention model
- [ ] T029 [P] [US-5] Integration tests for convention scaffolding
- [ ] T030 [US-5] E2E test for convention onboarding flow

**Checkpoint**: US-5 independently testable - can scaffold conventions on new project

---

## Phase 4: US-6 - Spec-Driven Development Workflow (P1)

**Goal**: Spec folders are indexed, rendered in UI, and track completion

### Backend

- [ ] T031 [US-6] Implement spec-parser.ts library (markdown AST parsing)
- [ ] T032 [US-6] Implement spec folders model in src/models/specs.ts
- [ ] T033 [US-6] Implement indexSpecFolders action
- [ ] T034 [US-6] Implement syncSpecTasks action
- [ ] T035 [US-6] Implement updateTaskFromPR action (commit scope matching)
- [ ] T036 [US-6] Add GitHub webhook handler for PR merge → task completion

### Integration

- [ ] T037 [US-6] Create /platform/specs/[projectId] page
- [ ] T038 [US-6] Create /platform/specs/[projectId]/[slug] detail page
- [ ] T039 [US-6] Connect SpecBrowser and SpecTaskList to server actions
- [ ] T040 [US-6] Add spec refresh button and auto-sync on push

### Tests

- [ ] T041 [P] [US-6] Unit tests for spec-parser.ts
- [ ] T042 [P] [US-6] Unit tests for specs model
- [ ] T043 [P] [US-6] Integration tests for spec indexing
- [ ] T044 [US-6] E2E test for spec browser and task tracking

**Checkpoint**: US-6 independently testable - can view specs and track completion

---

## Phase 5: US-9 - Agent Context Distillation (P1)

**Goal**: AGENTS.md generated and maintained for codebases

### Backend

- [ ] T045 [US-9] Implement context-generator.ts library (codebase analysis)
- [ ] T046 [US-9] Implement agent context model in src/models/agent-context.ts
- [ ] T047 [US-9] Implement generateAgentContext action
- [ ] T048 [US-9] Implement checkContextStaleness action
- [ ] T049 [US-9] Add context refresh trigger on major changes

### Integration

- [ ] T050 [US-9] Create /platform/context/[projectId] page
- [ ] T051 [US-9] Connect AgentContextViewer to server actions
- [ ] T052 [US-9] Add context generation button and auto-refresh option

### Tests

- [ ] T053 [P] [US-9] Unit tests for context-generator.ts
- [ ] T054 [P] [US-9] Integration tests for context generation
- [ ] T055 [US-9] E2E test for context viewer

**Checkpoint**: US-9 independently testable - can generate and view AGENTS.md

---

## Phase 6: US-11 - Reproducible Development Environments (P1)

**Goal**: Environment parity between local/deployed/production

### Backend

- [ ] T056 [US-11] Implement environment definition model
- [ ] T057 [US-11] Implement environment drift detection
- [ ] T058 [US-11] Implement README update action for environment changes
- [ ] T059 [US-11] Add environment parity validation in CI scaffold

### Integration

- [ ] T060 [US-11] Add environment configuration to project settings
- [ ] T061 [US-11] Display environment status (Docker/Nix/devcontainer) in UI

### Tests

- [ ] T062 [P] [US-11] Unit tests for environment drift detection
- [ ] T063 [US-11] Integration test for environment parity

**Checkpoint**: US-11 independently testable - environments are reproducible

---

## Phase 7: US-2 - Unified Feedback Loop (P1)

**Goal**: Ephemeral environments for build/test/debug with MCP interface

### Backend

- [ ] T064 [US-2] Extend AgentEnvironment CRD in operator
- [ ] T065 [US-2] Implement ephemeral environment provisioning
- [ ] T066 [US-2] Implement MCP tools: run_tests, build_project, debug_workspace
- [ ] T067 [US-2] Add environment lifecycle management (create, destroy, timeout)

### Integration

- [ ] T068 [US-2] Add debug workspace creation in preview environment UI
- [ ] T069 [US-2] Add MCP endpoint documentation

### Tests

- [ ] T070 [P] [US-2] Integration tests for environment provisioning
- [ ] T071 [US-2] E2E test for MCP tool execution

**Checkpoint**: US-2 independently testable - agents can execute commands in environments

---

## Phase 8: US-1 - Accelerated Feature Development via Conventions (P1)

**Goal**: Conventions injected into agent context automatically

### Backend

- [ ] T072 [US-1] Implement convention injection into MCP context
- [ ] T073 [US-1] Implement Golden Path template system
- [ ] T074 [US-1] Add PR convention check webhook handler

### Integration

- [ ] T075 [US-1] Add Golden Path template selection in project creation
- [ ] T076 [US-1] Display convention check results on PR detail page

### Tests

- [ ] T077 [P] [US-1] Unit tests for convention injection
- [ ] T078 [US-1] E2E test for convention checks on PR

**Checkpoint**: US-1 complete - conventions enforced across projects

---

## Phase 9: US-7 & US-8 - Observability Stack (P2)

**Goal**: Golden signal alerting and unified observability

### Operator

- [ ] T079 [US-8] Implement ObservabilityStack CRD
- [ ] T080 [US-8] Implement observability_controller.go for kube-prometheus-stack
- [ ] T081 [US-8] Add Loki deployment to observability stack
- [ ] T082 [US-7] Implement default golden signal alerting rules

### Backend

- [ ] T083 [US-8] Implement prometheus-client.ts library
- [ ] T084 [US-8] Implement observability model in src/models/observability.ts
- [ ] T085 [US-8] Implement queryMetrics and queryLogs actions
- [ ] T086 [US-7] Implement configureGoldenSignalAlerts action
- [ ] T087 [US-8] Implement correlateIncident action

### Integration

- [ ] T088 [US-7] Create /observability/alerts page
- [ ] T089 [US-8] Create /observability/dashboards page
- [ ] T090 [US-8] Create /observability/investigate/[alertId] page
- [ ] T091 [US-7] Connect AlertList to server actions
- [ ] T092 [US-8] Connect GoldenSignalDashboard to Prometheus queries

### Tests

- [ ] T093 [P] [US-8] Unit tests for prometheus-client.ts
- [ ] T094 [P] [US-8] Integration tests for observability queries
- [ ] T095 [US-7] E2E test for alert configuration

**Checkpoint**: US-7 + US-8 complete - observability stack functional

---

## Phase 10: US-10 - CI/CD & Release Automation (P2)

**Goal**: Standardized CI/CD with semantic release

### Backend

- [ ] T096 [US-10] Implement CI workflow templates (GitHub Actions)
- [ ] T097 [US-10] Implement semantic commit validation
- [ ] T098 [US-10] Implement Release Agent: changelog generation
- [ ] T099 [US-10] Implement Release Agent: version bumping

### Integration

- [ ] T100 [US-10] Add CI/CD configuration to project settings
- [ ] T101 [US-10] Display CI status and release history

### Tests

- [ ] T102 [P] [US-10] Unit tests for semantic commit validation
- [ ] T103 [US-10] Integration test for release agent

**Checkpoint**: US-10 complete - CI/CD standardized

---

## Phase 11: US-3 - Autonomous Platform Maintenance (P2)

**Goal**: Platform Agent handles chore work automatically

### Backend

- [ ] T104 [US-3] Implement platform task scanner (dependency updates)
- [ ] T105 [US-3] Implement platform task scanner (flaky tests)
- [ ] T106 [US-3] Implement CI log analyzer for auto-fix attempts
- [ ] T107 [US-3] Implement configurable approval policies

### Integration

- [ ] T108 [US-3] Create /platform/tasks page
- [ ] T109 [US-3] Connect PlatformTaskQueue to server actions
- [ ] T110 [US-3] Add approval policy configuration

### Tests

- [ ] T111 [P] [US-3] Unit tests for platform task scanner
- [ ] T112 [US-3] E2E test for autonomous maintenance PR

**Checkpoint**: US-3 complete - Platform Agent maintains projects

---

## Phase 12: US-4 - Proactive SRE & Remediation (P3)

**Goal**: Platform Agent investigates and remediates alerts

### Backend

- [ ] T113 [US-4] Implement alert-to-investigation workflow
- [ ] T114 [US-4] Implement scoped telemetry queries for agent
- [ ] T115 [US-4] Implement remediation PR creation with evidence

### Integration

- [ ] T116 [US-4] Add investigation trigger from alert UI
- [ ] T117 [US-4] Display investigation progress and findings

### Tests

- [ ] T118 [US-4] E2E test for alert investigation workflow

**Checkpoint**: US-4 complete - Proactive SRE operational

---

## Phase N: Polish

**Goal**: Cross-cutting improvements and validation

- [ ] T119 [P] Performance optimization for spec indexing
- [ ] T120 [P] Performance optimization for observability queries
- [ ] T121 [P] Accessibility audit for all new UI
- [ ] T122 Verify all success metrics from spec.md (SC-001 through SC-011)
- [ ] T123 Update quickstart.md with final setup instructions
- [ ] T124 Update root AGENTS.md with 010-platform reference

---

## Dependencies

```
Phase 0 (Spikes) ─► Phase 1 (Schema) ─► Phase 2 (UI Mocks)
                                               │
         ┌─────────────────────────────────────┼─────────────────────────────────────┐
         ▼                                     ▼                                     ▼
   Phase 3 (US-5)                        Phase 4 (US-6)                        Phase 5 (US-9)
   Conventions                           Spec-Driven                           Agent Context
         │                                     │                                     │
         └──────────────────┬──────────────────┴─────────────────┬───────────────────┘
                            ▼                                    ▼
                      Phase 6 (US-11)                      Phase 7 (US-2)
                      Reproducible Env                     Feedback Loop
                            │                                    │
                            └────────────────┬───────────────────┘
                                             ▼
                                       Phase 8 (US-1)
                                       Accelerated Dev
                                             │
         ┌───────────────────────────────────┼───────────────────────────────────┐
         ▼                                   ▼                                   ▼
   Phase 9 (US-7/8)                    Phase 10 (US-10)                    Phase 11 (US-3)
   Observability                       CI/CD & Release                     Maintenance
         │                                   │                                   │
         └───────────────────────────────────┴───────────────────────────────────┘
                                             │
                                             ▼
                                       Phase 12 (US-4)
                                       Proactive SRE
                                             │
                                             ▼
                                       Phase N (Polish)
```

## Parallel Opportunities

- All [P] tasks within a phase can run simultaneously
- Phases 3, 4, 5 can proceed in parallel after Phase 2
- Phases 9, 10, 11 can proceed in parallel after Phase 8
- Different developers/agents can own different user story phases
