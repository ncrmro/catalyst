# Tasks: CLI Coding Agents Harness

**Spec**: `006-cli-codeing-agents-harness`
**Prerequisites**: spec.md, plan.md

## Phase 0: Spike

**Goal**: Validate core technical assumptions before full implementation

- [ ] T001 [Spike] Validate agent CLI integration (Claude Code, Aider) in container
  - Install CLIs in test container
  - Inject instructions via environment variables
  - Verify agents can make commits
  - Capture and inspect outputs
  - Document findings in plan.md

- [ ] T002 [Spike] Validate secure credential injection pattern
  - Create K8s Secret with test API key
  - Mount as environment variable in Pod
  - Verify agent CLI authentication works
  - Confirm no credential leakage in logs/filesystem
  - Document findings in plan.md

**Checkpoint**: Spike findings documented, technical approach validated

---

## Phase 1: Database Schema & Core Models

**Goal**: Database structure and encryption utilities ready

- [ ] T003 Create database migrations for agent tables
  - `agent_providers` table
  - `user_agent_credentials` table
  - `agent_tasks` table
  - `agent_task_logs` table

- [ ] T004 [P] Implement encryption utilities for agent credentials
  - Reuse existing GitHub token encryption pattern
  - Add credential encryption/decryption functions in `src/lib/encryption.ts`
  - Add tests for encryption utilities

- [ ] T005 [P] Create agent provider model
  - `src/models/agent-providers.ts`
  - CRUD operations for providers
  - Seed initial providers (Claude Code, Aider, Codex CLI)

- [ ] T006 [P] Create agent credential model
  - `src/models/agent-credentials.ts`
  - Encrypt/decrypt credentials
  - Credential validation logic

- [ ] T007 [P] Create agent task model
  - `src/models/agent-tasks.ts`
  - Task lifecycle management
  - Status updates and logging

**Checkpoint**: `npm run db:migrate` succeeds, models exist with tests

---

## Phase 2: Operator Extensions

**Goal**: Kubernetes operator can provision agent workspaces

- [ ] T008 Extend Environment CRD with agent-workspace type
  - Update CRD definition in `operator/api/v1alpha1/environment_types.go`
  - Add `agentConfig` field to spec
  - Generate CRD manifests

- [ ] T009 Implement agent workspace reconciliation
  - `operator/internal/controller/environment_controller.go`
  - Create namespace with ResourceQuota and NetworkPolicy
  - Create Secret with agent credentials
  - Create Job to run agent CLI
  - Update Environment status

- [ ] T010 [P] Create agent-runner container image
  - `dockerfiles/agent-runner/Dockerfile`
  - Install common dependencies (git, node, python)
  - Install agent CLIs (Claude Code, Aider)
  - `entrypoint.sh` script to handle different agents

- [ ] T011 [P] Add NetworkPolicy template for agent workspaces
  - Allow DNS resolution
  - Allow HTTPS to external APIs
  - Block all other egress

- [ ] T012 [P] Add RBAC templates for agent workspaces
  - ServiceAccount creation
  - Role with limited permissions
  - RoleBinding

**Checkpoint**: Operator can create agent workspace environments, manual test with test Environment CR

---

## Phase 3: Backend Actions & API

**Goal**: Server actions for agent management

### Agent Provider Actions

- [ ] T013 [P] Implement agent provider actions
  - `src/actions/agent-providers.ts`
  - `listAgentProviders()`
  - `getAgentProvider(id)`

### Credential Management Actions

- [ ] T014 [P] Implement credential management actions
  - `src/actions/user-agent-credentials.ts`
  - `createUserCredential(input)` - encrypt and store
  - `listUserCredentials()` - list without exposing keys
  - `deleteUserCredential(id)`
  - `testUserCredential(id)` - validate with provider

### Task Management Actions

- [ ] T015 Implement task creation action
  - `src/actions/agent-tasks.ts`
  - `createAgentTask(input)`
  - Validate inputs
  - Create database record
  - Create Environment CR
  - Create K8s Secret with credentials

- [ ] T016 [P] Implement task query actions
  - `getAgentTask(id)`
  - `listAgentTasks(filters)`
  - `getAgentTaskLogs(taskId, options)`

- [ ] T017 [P] Implement task control actions
  - `cancelAgentTask(id)` - delete Environment CR
  - `retryAgentTask(id)` - recreate Environment CR

### Integration Helpers

- [ ] T018 [P] Implement context helpers
  - `src/models/agent-tasks.ts`
  - `createAgentTaskFromPullRequest()`
  - `createAgentTaskFromIssue()`
  - Extract relevant context (diff, comments, etc.)

**Checkpoint**: All actions have unit tests, can create and manage tasks via actions

---

## Phase 4: Credential Management UI

**Goal**: Users can configure agent credentials

- [ ] T019 Create agent settings layout
  - `src/app/settings/agents/layout.tsx`
  - Navigation for credential management

- [ ] T020 Create credential list page
  - `src/app/settings/agents/page.tsx`
  - Display user's configured credentials
  - Show provider info, label, last used
  - Actions: test, delete

- [ ] T021 Create add credential page
  - `src/app/settings/agents/new/page.tsx`
  - Form to select provider and enter API key
  - Validate and test credential before saving

- [ ] T022 [P] Create ProviderCard component
  - `src/components/agents/ProviderCard.tsx`
  - Display provider logo, name, description
  - Show supported features

- [ ] T023 [P] Create CredentialForm component
  - `src/components/agents/CredentialForm.tsx`
  - Input for API key (masked)
  - Optional label and config
  - Test button to validate credential

**Checkpoint**: Users can add, list, test, and delete agent credentials

---

## Phase 5: Task Management UI

**Goal**: Users can create and monitor agent tasks

- [ ] T024 Create project agents page
  - `src/app/projects/[slug]/agents/page.tsx`
  - List agent tasks for project
  - Filter by status, type
  - Quick stats (running, completed, failed)

- [ ] T025 Create task creation page
  - `src/app/projects/[slug]/agents/new/page.tsx`
  - Form to create new agent task
  - Select task type, provide instructions
  - Choose agent provider and credential

- [ ] T026 Create task detail page
  - `src/app/projects/[slug]/agents/[taskId]/page.tsx`
  - Show task status, timeline
  - Display logs with filtering
  - Actions: cancel, retry

- [ ] T027 [P] Create TaskList component
  - `src/components/agents/TaskList.tsx`
  - Table/list of tasks with status badges
  - Links to detail pages

- [ ] T028 [P] Create TaskDetail component
  - `src/components/agents/TaskDetail.tsx`
  - Task metadata display
  - Status timeline
  - Link to results (commits, PRs)

- [ ] T029 [P] Create TaskCreationForm component
  - `src/components/agents/TaskCreationForm.tsx`
  - Multi-step form for task creation
  - Validation and preview

**Checkpoint**: Users can create tasks and view task details with logs

---

## Phase 6: PR/Issue Integration

**Goal**: Quick agent invocation from PRs and issues

- [ ] T030 Add agent button to PR detail page
  - `src/components/pull-requests/AgentButton.tsx`
  - Quick action to invoke agent on PR
  - Pre-fill context from PR

- [ ] T031 [P] Add agent button to issue detail page
  - `src/components/issues/AgentButton.tsx`
  - Quick action to invoke agent on issue
  - Pre-fill context from issue

- [ ] T032 Implement GitHub comment integration
  - Post comment when agent task starts
  - Post comment with results when task completes
  - Include links to task detail page

- [ ] T033 [P] Add webhook handler for agent invocation comments
  - Detect comment patterns like "@catalyst-agent fix this"
  - Extract instructions from comment
  - Create agent task automatically

**Checkpoint**: Users can invoke agents from PR/issue UI with one click

---

## Phase 7: MCP Integration

**Goal**: AI agents can manage agent tasks via MCP

- [ ] T034 Add agent provider MCP tools
  - `src/app/api/mcp/route.ts`
  - `list_agent_providers` tool
  - `get_agent_provider` tool

- [ ] T035 [P] Add agent task MCP tools
  - `create_agent_task` tool
  - `get_agent_task` tool
  - `list_agent_tasks` tool
  - `cancel_agent_task` tool

- [ ] T036 [P] Add agent logs MCP tool
  - `get_agent_task_logs` tool
  - Support filtering by level, time range

**Checkpoint**: MCP tools work, AI agents can create and monitor tasks

---

## Phase 8: Multi-Agent Support

**Goal**: Support for multiple agent providers with provider-specific features

- [ ] T037 Add Aider-specific configuration
  - Install script for Aider
  - Config template for Aider options
  - Test Aider integration

- [ ] T038 [P] Add Codex CLI configuration
  - Install script for Codex CLI
  - Config template
  - Test Codex integration

- [ ] T039 [P] Add Cline configuration
  - Install script for Cline (headless mode)
  - Config template
  - Test Cline integration

- [ ] T040 Implement advanced agent features
  - Support for agent hooks (pre/post execution)
  - Support for agent plans (approval workflow)
  - Support for subagents (parallel execution)

**Checkpoint**: All four agent providers working (Claude Code, Aider, Codex CLI, Cline)

---

## Phase 9: Testing & Polish

**Goal**: Comprehensive testing and production readiness

- [ ] T041 [P] Unit tests for models
  - Agent provider model tests
  - Agent credential model tests
  - Agent task model tests
  - Encryption utility tests

- [ ] T042 [P] Integration tests for actions
  - Credential management action tests
  - Task management action tests
  - Context helper tests

- [ ] T043 E2E test for full workflow
  - Add credential via UI
  - Create agent task
  - Verify task execution
  - Check results captured

- [ ] T044 [P] Operator tests
  - Unit tests for agent workspace reconciliation
  - Integration tests with test cluster

- [ ] T045 [P] Security audit
  - Verify credential encryption
  - Test NetworkPolicy enforcement
  - Verify RBAC restrictions
  - Test timeout enforcement

- [ ] T046 [P] Performance testing
  - Test concurrent task execution
  - Verify resource limits enforced
  - Test operator performance under load

- [ ] T047 Documentation updates
  - Update quickstart.md with final instructions
  - Add agent usage guide
  - Document troubleshooting

- [ ] T048 [P] Metrics and monitoring
  - Add metrics for task creation, completion
  - Add dashboards for agent usage
  - Set up alerts for failures

**Checkpoint**: All tests pass, security verified, ready for production

---

## Dependencies

```
Phase 0 (Spike) ─► Phase 1 (Schema) ─► Phase 2 (Operator) ─► Phase 3 (Backend)
                                                                     │
                                ┌────────────────────────────────────┴────────────────────┐
                                ▼                                                         ▼
                          Phase 4 (Credentials UI)                             Phase 5 (Task UI)
                                │                                                         │
                                └────────────────────┬────────────────────────────────────┘
                                                     │
                                ┌────────────────────┴────────────────────┐
                                ▼                                         ▼
                          Phase 6 (PR/Issue)                    Phase 7 (MCP)
                                │                                         │
                                └────────────────────┬────────────────────┘
                                                     │
                                                     ▼
                                            Phase 8 (Multi-Agent)
                                                     │
                                                     ▼
                                            Phase 9 (Testing)
```

## Parallel Opportunities

- All [P] tasks within a phase can run simultaneously
- Phase 4 (Credentials UI) and Phase 5 (Task UI) can proceed in parallel after Phase 3
- Phase 6 (PR/Issue) and Phase 7 (MCP) can proceed in parallel after Phases 4 and 5
- Different developers can own different phases (UI vs Operator vs Backend)

## Estimated Timeline

- **Phase 0**: 2-3 days (spike work)
- **Phase 1**: 3-4 days (database and models)
- **Phase 2**: 5-7 days (operator extensions, most complex)
- **Phase 3**: 4-5 days (backend actions)
- **Phase 4**: 3-4 days (credentials UI)
- **Phase 5**: 4-5 days (task management UI)
- **Phase 6**: 2-3 days (PR/issue integration)
- **Phase 7**: 2-3 days (MCP tools)
- **Phase 8**: 3-4 days (multi-agent support)
- **Phase 9**: 4-5 days (testing and polish)

**Total Estimated**: 6-8 weeks for full implementation with 2-3 developers
