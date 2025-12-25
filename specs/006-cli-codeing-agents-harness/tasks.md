# Tasks: CLI Coding Agents Harness

**Spec**: `006-cli-codeing-agents-harness`
**Prerequisites**: spec.md, plan.md

<!--
  Phased task breakdown for implementation.

  FORMAT: [ID] [P?] [US#] Description
  - [P] = Can run in parallel (different files, no dependencies)
  - [US#] = User story reference from spec.md
-->

## Phase 0: Spike

**Goal**: Validate risky/unknown functionality before full implementation

- [ ] T001 [Spike] Validate agent CLI installation and invocation in Kubernetes pods (per plan.md)
- [ ] T002 [Spike] Validate AES-256-GCM encryption performance and security (per plan.md)
- [ ] T003 Document spike findings in plan.md

**Checkpoint**: Spikes completed, approach validated

---

## Phase 1: Setup

**Goal**: Project structure and dependencies ready

- [ ] T004 Review and update dependencies if needed (crypto is built-in)
- [ ] T005 Create database migrations for agent tables (providers, credentials, jobs, logs, hooks)
- [ ] T006 [P] Create model file structure (agent-credentials.ts, agent-jobs.ts, agent-providers.ts, agent-hooks.ts)
- [ ] T007 [P] Create action file structure matching models
- [ ] T008 [P] Create lib utilities (agent-encryption.ts, agent-kubernetes.ts, agent-providers.ts)
- [ ] T009 Seed initial agent providers (claude-code, aider, codex-cli, cline) in database

**Checkpoint**: `npm run typecheck` passes, migrations ready

---

## Phase 2: Core Infrastructure

**Goal**: Encryption and Kubernetes orchestration working

### Encryption Module

- [ ] T010 [P] [US-1] Implement AES-256-GCM encryption functions in lib/agent-encryption.ts
- [ ] T011 [P] [US-1] Implement decryption with IV and auth tag validation
- [ ] T012 [P] Unit tests for encryption/decryption

### Kubernetes Integration

- [ ] T013 [P] Implement agent namespace provisioning in lib/agent-kubernetes.ts
- [ ] T014 [P] Implement agent pod creation with API key injection
- [ ] T015 [P] Implement pod monitoring and log streaming
- [ ] T016 [P] Implement namespace cleanup on job completion
- [ ] T017 [P] Integration tests for Kubernetes orchestration

**Checkpoint**: Encryption and K8s modules fully tested

---

## Phase 3: User Story 1 - Configure Agent Credentials (P1)

**Goal**: Users can securely add and manage agent API keys

### Backend

- [ ] T018 [US-1] Implement credential validation in models/agent-credentials.ts
  - Test API key with provider before saving
  - Support multiple provider APIs (Anthropic, OpenAI, etc.)
- [ ] T019 [US-1] Implement saveAgentCredential action with encryption
- [ ] T020 [US-1] Implement getAgentCredentials action (masked keys)
- [ ] T021 [US-1] Implement deleteAgentCredential action
- [ ] T022 [US-1] Add Zod schemas for credential input validation

### UI

- [ ] T023 [US-1] Create AgentCredentialsPage component at /settings/agents
- [ ] T024 [US-1] Create AgentCredentialForm component
  - Provider selection dropdown
  - API key input (masked)
  - Save/cancel buttons
  - Validation feedback
- [ ] T025 [US-1] Create credential list view with masked keys (show last 4 chars)
- [ ] T026 [US-1] Add delete credential confirmation dialog

### Integration & Polish

- [ ] T027 [US-1] Connect UI to server actions
- [ ] T028 [US-1] Add error handling and loading states
- [ ] T029 [US-1] Add success/error toast notifications

### Tests

- [ ] T030 [P] [US-1] Unit tests for credential model
- [ ] T031 [P] [US-1] Integration tests for credential actions
- [ ] T032 [US-1] E2E test: Add valid credential
- [ ] T033 [US-1] E2E test: Add invalid credential (validation error)
- [ ] T034 [US-1] E2E test: Delete credential

**Checkpoint**: US-1 complete, users can manage credentials

---

## Phase 4: User Story 2 - Trigger Agent on Issue Assignment (P1)

**Goal**: Agents can be triggered from issues and create PRs

### Backend

- [ ] T035 [US-2] Implement agent job creation in models/agent-jobs.ts
- [ ] T036 [US-2] Implement job orchestration (provision → execute → capture results)
- [ ] T037 [US-2] Implement triggerAgentJob action
- [ ] T038 [US-2] Implement getAgentJobs action with filters
- [ ] T039 [US-2] Implement getAgentJobDetails action
- [ ] T040 [US-2] Create background worker for job processing (workers/agent-job-processor.ts)
- [ ] T041 [US-2] Implement PR creation from agent results using VCS integration
- [ ] T042 [US-2] Implement issue comment posting with agent summary

### UI

- [ ] T043 [US-2] Create IssueAgentAssignment component
  - Add to issue detail page
  - Provider dropdown
  - Trigger button
- [ ] T044 [US-2] Create AgentJobsPage at /agent-jobs
- [ ] T045 [US-2] Create AgentJobsList component
  - Jobs table with status, project, duration
  - Filters by status, provider, date
  - Click to view details
- [ ] T046 [US-2] Add agent job status indicators (queued, running, completed, failed)

### Integration & Polish

- [ ] T047 [US-2] Connect issue assignment to job trigger
- [ ] T048 [US-2] Add webhook handler for issue assignment events
- [ ] T049 [US-2] Add error handling for job failures
- [ ] T050 [US-2] Add loading states during job creation

### Tests

- [ ] T051 [P] [US-2] Unit tests for job model
- [ ] T052 [P] [US-2] Integration tests for job lifecycle
- [ ] T053 [P] [US-2] Integration tests for background worker
- [ ] T054 [US-2] E2E test: Trigger agent from issue
- [ ] T055 [US-2] E2E test: Verify PR creation after job completion

**Checkpoint**: US-2 complete, agents can be triggered and create PRs

---

## Phase 5: User Story 3 - Monitor Agent Execution (P2)

**Goal**: Users can view real-time logs and job status

### Backend

- [ ] T056 [US-3] Implement log streaming in models/agent-jobs.ts
- [ ] T057 [US-3] Implement streamAgentLogs action with Server-Sent Events
- [ ] T058 [US-3] Implement log storage in database during job execution
- [ ] T059 [US-3] Implement cancelAgentJob action

### UI

- [ ] T060 [US-3] Create AgentJobDetailsPage at /agent-jobs/[id]
- [ ] T061 [US-3] Create AgentLogStream component
  - Real-time log display
  - Auto-scroll with option to pause
  - Syntax highlighting for different log types
- [ ] T062 [US-3] Add job metadata display (trigger, project, timing)
- [ ] T063 [US-3] Add cancel job button (for running jobs)
- [ ] T064 [US-3] Add link to created PR (if completed)

### Integration & Polish

- [ ] T065 [US-3] Connect log streaming to UI with SSE
- [ ] T066 [US-3] Add error handling for log streaming failures
- [ ] T067 [US-3] Add polling fallback if SSE not supported

### Tests

- [ ] T068 [P] [US-3] Unit tests for log streaming
- [ ] T069 [P] [US-3] Integration tests for log storage
- [ ] T070 [US-3] E2E test: View job details with logs
- [ ] T071 [US-3] E2E test: Cancel running job

**Checkpoint**: US-3 complete, monitoring fully functional

---

## Phase 6: User Story 4 - Configure Agent Hooks (P3)

**Goal**: Teams can define custom pre/post execution hooks

### Backend

- [ ] T072 [US-4] Implement hook execution in models/agent-hooks.ts
- [ ] T073 [US-4] Implement createAgentHook action
- [ ] T074 [US-4] Implement getAgentHooks action
- [ ] T075 [US-4] Implement updateAgentHook action
- [ ] T076 [US-4] Implement deleteAgentHook action
- [ ] T077 [US-4] Integrate hooks into job execution flow (run pre-hook before agent, post-hook after)

### UI

- [ ] T078 [US-4] Create AgentHooksPage at /projects/[slug]/agents/hooks
- [ ] T079 [US-4] Create AgentHookEditor component
  - Monaco editor for script editing
  - Hook type selection (pre/post)
  - Timeout configuration
  - Enable/disable toggle
- [ ] T080 [US-4] Create hooks list view
- [ ] T081 [US-4] Add hook execution results to job details page

### Integration & Polish

- [ ] T082 [US-4] Connect UI to hook actions
- [ ] T083 [US-4] Add validation for hook scripts (syntax check)
- [ ] T084 [US-4] Add error handling for hook failures

### Tests

- [ ] T085 [P] [US-4] Unit tests for hook execution
- [ ] T086 [P] [US-4] Integration tests for hook integration in job flow
- [ ] T087 [US-4] E2E test: Create and configure hook
- [ ] T088 [US-4] E2E test: Hook prevents job from proceeding on failure

**Checkpoint**: US-4 complete, hooks fully functional

---

## Phase 7: Security & Hardening

**Goal**: Ensure security boundaries and audit logging

- [ ] T089 [P] Implement API key scrubbing in log output
- [ ] T090 [P] Add audit logging for all agent actions
- [ ] T091 [P] Implement network policies for agent namespaces
- [ ] T092 [P] Add security headers for credential management pages
- [ ] T093 Run security audit with `npm audit`
- [ ] T094 Verify all credentials are encrypted at rest
- [ ] T095 Verify API keys are never logged or exposed in UI

**Checkpoint**: Security review complete

---

## Phase 8: Documentation & Polish

**Goal**: Complete documentation and final improvements

- [ ] T096 [P] Create quickstart.md with setup instructions
- [ ] T097 [P] Add inline code documentation for key modules
- [ ] T098 [P] Create admin documentation for agent provider configuration
- [ ] T099 [P] Add user documentation for agent credentials and job monitoring
- [ ] T100 Run comprehensive linting with `npm run lint`
- [ ] T101 Run type checking with `npm run typecheck`
- [ ] T102 Run build verification with `npm run build`
- [ ] T103 Run full test suite with `npm test`
- [ ] T104 Verify all success criteria from spec.md are met
- [ ] T105 Update AGENTS.md with agent harness patterns if needed

**Checkpoint**: Ready for production deployment

---

## Dependencies

```
Phase 0 (Spikes) ──► Phase 1 (Setup) ──► Phase 2 (Infrastructure)
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                        ▼                        ▼
               Phase 3 (US-1)            Phase 4 (US-2)           Phase 5 (US-3)
               Credentials               Job Execution            Monitoring
                     │                        │                        │
                     └────────────────────────┴────────────────────────┘
                                              │
                                              ▼
                                        Phase 6 (US-4)
                                        Custom Hooks
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                  ▼
               Phase 7 (Security)                               Phase 8 (Polish)
```

## Parallel Opportunities

- All [P] tasks within a phase can run simultaneously
- After Phase 2, Phases 3-6 can proceed in parallel if different developers own each user story
- Phase 7 security tasks can be worked on concurrently
- Phase 8 documentation can be written in parallel with final testing

## Task Summary

- **Total Tasks**: 105
- **Phase 0 (Spikes)**: 3 tasks
- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Infrastructure)**: 8 tasks
- **Phase 3 (US-1)**: 17 tasks
- **Phase 4 (US-2)**: 21 tasks
- **Phase 5 (US-3)**: 16 tasks
- **Phase 6 (US-4)**: 17 tasks
- **Phase 7 (Security)**: 7 tasks
- **Phase 8 (Polish)**: 10 tasks
