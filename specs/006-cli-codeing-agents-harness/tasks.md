# Tasks: CLI Coding Agents Harness

**Spec**: `006-cli-coding-agents-harness`
**Prerequisites**: spec.md, plan.md
**Generated**: 2025-01-20

---

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 0: Spike - Agent Non-Interactive Execution

**Goal**: Validate CLI agents can run non-interactively in containers

- [ ] T001 [Spike] Create minimal Docker container with Claude Code installed
- [ ] T002 [Spike] Test non-interactive Claude Code execution: `echo "prompt" | claude -p`
- [ ] T003 [Spike] Verify Claude Code creates git commits without user interaction
- [ ] T004 [Spike] Test Aider with `--yes --auto-commits` flags
- [ ] T005 [Spike] Document agent invocation patterns in spikes/TIMESTAMP_cli_agents_spike/

**Checkpoint**: Both Claude Code and Aider confirmed to work non-interactively

---

## Phase 1: Setup

**Goal**: Database schema and project structure ready

- [ ] T006 Add `agentCredentials` table to web/src/db/schema.ts per plan.md
- [ ] T007 [P] Add `agentTasks` table to web/src/db/schema.ts per plan.md
- [ ] T008 [P] Add `agentExecutions` table to web/src/db/schema.ts per plan.md
- [ ] T009 [P] Add `agentConfigs` table to web/src/db/schema.ts per plan.md
- [ ] T010 Add relations for agent tables in web/src/db/schema.ts
- [ ] T011 Generate database migration with `npm run db:generate`
- [ ] T012 Apply database migration with `npm run db:migrate`
- [ ] T013 [P] Create types file web/src/types/agents.ts with TypeScript interfaces

**Checkpoint**: `npm run typecheck` passes, database has agent tables

---

## Phase 2: UI Mocks (Storybook)

**Goal**: All agent UI components viewable in Storybook with fixture data

- [ ] T014 [P] [US2] Create `CredentialForm` component in web/src/components/agents/credential-form.tsx
- [ ] T015 [P] [US2] Create `CredentialList` component in web/src/components/agents/credential-list.tsx
- [ ] T016 [P] [US4] Create `TaskList` component in web/src/components/agents/task-list.tsx
- [ ] T017 [P] [US4] Create `TaskDetail` component in web/src/components/agents/task-detail.tsx
- [ ] T018 [P] [US4] Create `ActivityLog` component in web/src/components/agents/activity-log.tsx
- [ ] T019 [P] [US5] Create `PlanApprovalDialog` component in web/src/components/agents/plan-approval-dialog.tsx
- [ ] T020 Add Storybook stories for all agent components

**Checkpoint**: UI components visible in Storybook, UX validated

---

## Phase 3: User Story 2 - Configure Agent Credentials (P1)

**Goal**: Users can securely store and manage API credentials for coding agents

**Independent Test**: Add an Anthropic API key, verify it's encrypted in database, delete it

### Models Layer

- [ ] T021 [US2] Create encryption utilities in web/src/lib/crypto.ts (if not exists) for AES-256-GCM
- [ ] T022 [US2] Implement `createCredential()` in web/src/models/agent-credentials.ts with encryption
- [ ] T023 [P] [US2] Implement `listCredentials()` in web/src/models/agent-credentials.ts with masked keys
- [ ] T024 [P] [US2] Implement `deleteCredential()` in web/src/models/agent-credentials.ts
- [ ] T025 [US2] Implement `getDecryptedCredential()` in web/src/models/agent-credentials.ts (internal use only)

### Actions Layer

- [ ] T026 [P] [US2] Create `createAgentCredential()` action in web/src/actions/agent-credentials.ts
- [ ] T027 [P] [US2] Create `listAgentCredentials()` action in web/src/actions/agent-credentials.ts
- [ ] T028 [P] [US2] Create `deleteAgentCredential()` action in web/src/actions/agent-credentials.ts

### UI Integration

- [ ] T029 [US2] Create settings page web/src/app/(dashboard)/settings/agents/page.tsx
- [ ] T030 [US2] Wire `CredentialForm` to `createAgentCredential` action
- [ ] T031 [US2] Wire `CredentialList` to `listAgentCredentials` and `deleteAgentCredential` actions

### Tests

- [ ] T032 [P] [US2] Unit tests for credential encryption/decryption
- [ ] T033 [P] [US2] Integration tests for credential CRUD actions

**Checkpoint**: Users can add, view (masked), and delete API credentials

---

## Phase 4: User Story 1 - Assign Issue to Coding Agent (P1)

**Goal**: Developers can assign GitHub issues to agents, who autonomously create PRs

**Independent Test**: Assign issue to catalyst-agent user, verify environment provisioned, agent runs, PR created

### Agent Registry

- [ ] T034 [US1] Create agent registry in web/src/lib/agents/registry.ts with Claude Code and Aider definitions
- [ ] T035 [P] [US1] Create context builder in web/src/lib/agents/context.ts for constructing agent prompts
- [ ] T036 [P] [US1] Create invocation utilities in web/src/lib/agents/invocation.ts for CLI execution

### Models Layer - Task Management

- [ ] T037 [US1] Implement `createAgentTask()` in web/src/models/agent-tasks.ts
- [ ] T038 [US1] Implement `updateTaskStatus()` in web/src/models/agent-tasks.ts
- [ ] T039 [P] [US1] Implement `getAgentTask()` in web/src/models/agent-tasks.ts
- [ ] T040 [P] [US1] Implement `listAgentTasks()` in web/src/models/agent-tasks.ts with filtering

### Models Layer - Execution

- [ ] T041 [US1] Implement `executeAgentTask()` in web/src/models/agent-execution.ts - main orchestration
- [ ] T042 [US1] Implement `recordExecution()` in web/src/models/agent-execution.ts
- [ ] T043 [US1] Add credential injection logic to `executeAgentTask()` (ephemeral env vars)
- [ ] T044 [US1] Add result capture (commits, exit code) to `executeAgentTask()`

### GitHub Integration

- [ ] T045 [US1] Create `createAgentTaskFromIssue()` in web/src/models/agent-tasks.ts
- [ ] T046 [US1] Add issue assignment handler to web/src/app/api/github/webhook/route.ts
- [ ] T047 [US1] Create `postAgentStatusComment()` in web/src/lib/github-agent-comments.ts
- [ ] T048 [US1] Update webhook handler to post "Agent started" comment on task creation
- [ ] T049 [US1] Update webhook handler to post "Agent completed" or "Agent failed" comment

### Actions Layer

- [ ] T050 [P] [US1] Create `createAgentTask()` action in web/src/actions/agent-tasks.ts
- [ ] T051 [P] [US1] Create `getAgentTask()` action in web/src/actions/agent-tasks.ts
- [ ] T052 [P] [US1] Create `listAgentTasks()` action in web/src/actions/agent-tasks.ts

### Tests

- [ ] T053 [P] [US1] Unit tests for agent registry and context builder
- [ ] T054 [P] [US1] Integration tests for task creation and execution
- [ ] T055 [US1] E2E test: issue assignment triggers agent workflow

**Checkpoint**: Assigning an issue to catalyst-agent triggers full workflow: environment → agent → PR → comment

---

## Phase 5: User Story 3 - Agent-Assisted Code Review (P2)

**Goal**: Agents can perform preliminary code reviews on PRs

**Independent Test**: Request review from catalyst-agent on a PR, verify inline comments posted

### Models Layer

- [ ] T056 [US3] Create `createAgentTaskForReview()` in web/src/models/agent-tasks.ts
- [ ] T057 [US3] Implement PR diff extraction in context builder
- [ ] T058 [US3] Add review-specific prompt template to web/src/lib/agents/context.ts

### GitHub Integration

- [ ] T059 [US3] Add review_requested handler to web/src/app/api/github/webhook/route.ts
- [ ] T060 [US3] Create `postReviewComment()` in web/src/lib/github-agent-comments.ts for inline comments
- [ ] T061 [US3] Create `postReviewSummary()` in web/src/lib/github-agent-comments.ts

### Tests

- [ ] T062 [P] [US3] Integration tests for PR review task creation
- [ ] T063 [US3] E2E test: review request triggers agent review workflow

**Checkpoint**: Requesting review from catalyst-agent posts inline comments and summary

---

## Phase 6: User Story 4 - Monitor Agent Progress (P2)

**Goal**: Developers can monitor agent progress in real-time and intervene

**Independent Test**: Start agent task, view live logs in UI, terminate running agent

### Models Layer

- [ ] T064 [US4] Implement `getAgentTaskLogs()` in web/src/models/agent-execution.ts
- [ ] T065 [US4] Implement `terminateAgentTask()` in web/src/models/agent-execution.ts

### Actions Layer

- [ ] T066 [P] [US4] Create `getAgentTaskLogs()` action in web/src/actions/agent-tasks.ts
- [ ] T067 [P] [US4] Create `cancelAgentTask()` action in web/src/actions/agent-tasks.ts

### UI Integration

- [ ] T068 [US4] Create task list page web/src/app/(dashboard)/agent-tasks/page.tsx
- [ ] T069 [US4] Create task detail page web/src/app/(dashboard)/agent-tasks/[id]/page.tsx
- [ ] T070 [US4] Wire `TaskList` component to `listAgentTasks` action
- [ ] T071 [US4] Wire `TaskDetail` component to `getAgentTask` and `getAgentTaskLogs` actions
- [ ] T072 [US4] Wire `ActivityLog` component to real-time log updates
- [ ] T073 [US4] Add terminate button to task detail page, wire to `cancelAgentTask`

### Tests

- [ ] T074 [P] [US4] Integration tests for log retrieval
- [ ] T075 [US4] E2E test: view running task, terminate, verify cleanup

**Checkpoint**: Users can view all tasks, see live logs, and terminate running agents

---

## Phase 7: User Story 5 - Plan Approval Workflow (P3)

**Goal**: Agents can submit plans for approval before execution

**Independent Test**: Enable plan approval, assign issue, verify plan posted, approve, verify execution continues

### Models Layer

- [ ] T076 [US5] Add plan detection to `executeAgentTask()` (parse Claude Code plan output)
- [ ] T077 [US5] Implement `submitPlanForApproval()` in web/src/models/agent-execution.ts
- [ ] T078 [US5] Implement `approvePlan()` in web/src/models/agent-execution.ts
- [ ] T079 [US5] Implement `rejectPlan()` in web/src/models/agent-execution.ts

### Actions Layer

- [ ] T080 [P] [US5] Create `getPendingPlans()` action in web/src/actions/agent-tasks.ts
- [ ] T081 [P] [US5] Create `approvePlan()` action in web/src/actions/agent-tasks.ts
- [ ] T082 [P] [US5] Create `rejectPlan()` action in web/src/actions/agent-tasks.ts

### UI Integration

- [ ] T083 [US5] Create project agent settings page web/src/app/(dashboard)/projects/[slug]/settings/agents/page.tsx
- [ ] T084 [US5] Add "Require Plan Approval" toggle to project settings
- [ ] T085 [US5] Wire `PlanApprovalDialog` to approval actions
- [ ] T086 [US5] Add plan approval queue to task list page

### Tests

- [ ] T087 [P] [US5] Integration tests for plan approval workflow
- [ ] T088 [US5] E2E test: enable approval, submit plan, approve, verify execution

**Checkpoint**: Plan approval workflow works end-to-end when enabled

---

## Phase 8: MCP Tools - AI Agent Access (P1)

**Goal**: Expose agent management via MCP for programmatic access

**Independent Test**: Use MCP inspector to list tasks, get task details, cancel task

### MCP Server Extension

- [ ] T089 [P] Register `list_agent_tasks` tool in web/src/app/api/mcp/route.ts
- [ ] T090 [P] Register `get_agent_task` tool in web/src/app/api/mcp/route.ts
- [ ] T091 [P] Register `create_agent_task` tool in web/src/app/api/mcp/route.ts
- [ ] T092 [P] Register `cancel_agent_task` tool in web/src/app/api/mcp/route.ts
- [ ] T093 [P] Register `get_agent_task_logs` tool in web/src/app/api/mcp/route.ts
- [ ] T094 Implement MCP tool handlers calling existing actions
- [ ] T095 Add structured error responses with error codes

### Tests

- [ ] T096 [P] MCP tool integration tests

**Checkpoint**: All agent features accessible via MCP with parity to UI

---

## Phase 9: Agent Environment Integration

**Goal**: Agent environments provisioned via operator with proper isolation

### Operator Extension

- [ ] T097 Add `agent` type support to Environment CR spec (operator/api/v1alpha1/environment_types.go)
- [ ] T098 Add agent-specific NetworkPolicy: allow egress to api.anthropic.com, api.openai.com
- [ ] T099 Add timeout handling in operator reconciler for agent environments
- [ ] T100 Add cleanup on agent completion (environment deletion)

### Web App Integration

- [ ] T101 [US1] Update `executeAgentTask()` to create Environment CR with agent config
- [ ] T102 [US1] Add environment status polling to update task status
- [ ] T103 [US1] Add environment cleanup on task completion/failure

### Tests

- [ ] T104 [P] Integration tests for agent environment provisioning
- [ ] T105 E2E test: full workflow with K3s VM

**Checkpoint**: Agent environments isolated with proper network policies

---

## Phase 10: Polish & Cross-Cutting Concerns

**Goal**: Production-ready reliability and observability

### Logging & Monitoring

- [ ] T106 [P] Add structured logging for all agent lifecycle events
- [ ] T107 [P] Add Prometheus metrics for agent execution (duration, success rate)
- [ ] T108 [P] Add secret scrubbing to all log outputs

### Validation & Error Handling

- [ ] T109 [P] Add Zod validation for all agent action inputs
- [ ] T110 [P] Add retry logic with exponential backoff for transient failures
- [ ] T111 [P] Add timeout enforcement (kill agent after configured timeout)
- [ ] T112 Add graceful error messages for common failures (invalid credentials, rate limits)

### Security

- [ ] T113 [P] Add pre-push hook for secret detection (prevent committing secrets)
- [ ] T114 [P] Add credential access audit logging
- [ ] T115 Verify network policies block unauthorized egress

### Documentation

- [ ] T116 Update CLAUDE.md with agent harness documentation
- [ ] T117 Update web/README.md with agent configuration guide
- [ ] T118 Add agent troubleshooting guide

### Verification

- [ ] T119 Run linting with `npm run lint`
- [ ] T120 Run type checking with `npm run typecheck`
- [ ] T121 Run build verification with `npm run build`
- [ ] T122 Verify SC-001: Issue to PR time < 30 min for simple tasks
- [ ] T123 Verify SC-003: 95% environment provisioning within 60s

**Checkpoint**: All tests pass, metrics meet success criteria

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 0 (Spike) ─► Phase 1 (Setup) ─► Phase 2 (UI Mocks)
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    ▼                        ▼                        ▼
              Phase 3 (US2)            Phase 4 (US1)                  │
              Credentials              Issue Assignment               │
                    │                        │                        │
                    └────────────┬───────────┘                        │
                                 ▼                                    │
                           Phase 5 (US3)                              │
                           Code Review                                │
                                 │                                    │
                    ┌────────────┴────────────┐                       │
                    ▼                         ▼                       ▼
              Phase 6 (US4)             Phase 7 (US5)           Phase 8 (MCP)
              Monitoring                Plan Approval                 │
                    │                         │                       │
                    └─────────────┬───────────┴───────────────────────┘
                                  ▼
                          Phase 9 (Environment)
                                  │
                                  ▼
                          Phase 10 (Polish)
```

### Critical Path

1. **Phase 0**: Must validate non-interactive agent execution before proceeding
2. **Phase 1**: Database schema blocks all other phases
3. **Phase 3 (US2)**: Credentials required before agents can run (Phase 4)
4. **Phase 4 (US1)**: Core functionality, enables other user stories

### Parallel Opportunities

**Within Phase 1**:

- T007, T008, T009 (different tables)
- T013 (types independent of schema)

**Within Phase 2**:

- All component creation tasks (T014-T019)

**Within Phase 3**:

- T023, T024 (different model methods)
- T026, T027, T028 (different actions)

**Within Phase 4**:

- T035, T036 (different utilities)
- T039, T040 (different model methods)
- T050, T051, T052 (different actions)

**Within Phase 8**:

- T089-T093 (different MCP tool registrations)

---

## MVP Scope

**Recommended first delivery** (Issue → Agent → PR):

- Phase 0: Spike (5 tasks)
- Phase 1: Setup (8 tasks)
- Phase 3: Credentials (13 tasks) - subset: T021-T028
- Phase 4: Issue Assignment (22 tasks)

**Total MVP**: ~40 tasks

This delivers the core value: assign an issue to an agent, get a PR back.

---

## Task Summary

- **Total Tasks**: 123
- **Phase 0 (Spike)**: 5 tasks
- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (UI Mocks)**: 7 tasks
- **Phase 3 (US2 - Credentials)**: 13 tasks
- **Phase 4 (US1 - Issue Assignment)**: 22 tasks
- **Phase 5 (US3 - Code Review)**: 8 tasks
- **Phase 6 (US4 - Monitoring)**: 12 tasks
- **Phase 7 (US5 - Plan Approval)**: 13 tasks
- **Phase 8 (MCP)**: 8 tasks
- **Phase 9 (Environment)**: 9 tasks
- **Phase 10 (Polish)**: 18 tasks

**Parallel Opportunities**: ~40 tasks marked [P] can run in parallel within phases

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Phase 0 (Spike) is CRITICAL - do not proceed if agents cannot run non-interactively
- Credential encryption uses existing `ENCRYPTION_KEY` env var from platform
