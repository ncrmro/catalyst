# Tasks: Agents

**Input**: Design documents from `/specs/007-agents/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Add `@tetrastack/threads` PostgreSQL schema to Catalyst database migrations in `web/src/db/migrations/`
- [ ] T002 [P] Create `external_agent_tasks` table migration in `web/src/db/schema.ts`
- [ ] T003 [P] Configure threads model factory with Catalyst database in `web/src/models/threads.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 Create chat API route skeleton at `web/src/app/api/chat/route.ts`
- [ ] T005 [P] Create base agent configuration with Anthropic client in `web/src/agents/project-agent/index.ts`
- [ ] T006 [P] Create agent context types in `web/src/agents/project-agent/types.ts`
- [ ] T007 Implement thread scoping utilities (project/spec) in `web/src/models/threads.ts`
- [ ] T008 [P] Create base chat server actions in `web/src/actions/chat.ts`

---

## Phase 3: User Story 1 - Project-Context Agent Chat (Priority: P1)

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create `list_issues` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/list-issues.ts`
- [ ] T010 [P] [US1] Create `list_pull_requests` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/list-pull-requests.ts`
- [ ] T011 [P] [US1] Create `create_issue` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/create-issue.ts`
- [ ] T012 [P] [US1] Create `comment_on_pr` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/comment-on-pr.ts`
- [ ] T013 [P] [US1] Create `get_project_status` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/get-project-status.ts`
- [ ] T014 [US1] Create tools barrel export in `web/packages/@catalyst/vcs-provider/src/agents/index.ts`
- [ ] T015 [US1] Implement streaming chat endpoint with tool calling in `web/src/app/api/chat/route.ts`
- [ ] T016 [US1] Add VCS tools to agent tool registry in `web/src/agents/project-agent/index.ts`
- [ ] T017 [US1] Implement thread persistence (create/resume) in chat route
- [ ] T018 [P] [US1] Create `ProjectChatProvider` component in `web/src/components/agent-chat/ProjectChatProvider.tsx`
- [ ] T019 [P] [US1] Create `ExpandableAgentChat` wrapper in `web/src/components/agent-chat/ExpandableAgentChat.tsx`
- [ ] T020 [US1] Create project chat page at `web/src/app/(dashboard)/projects/[projectId]/chat/page.tsx`
- [ ] T021 [US1] Add chat button/link to project dashboard page

---

## Phase 4: User Story 2 - Spec-Grouped Task View (Priority: P2) ✅ DONE

- [x] T022 [US2] Spec-grouped task view on project page
- [x] T023 [US2] Agent button per spec section

---

## Phase 5: User Story 3 - Spec-Context Agent Interaction (Priority: P3)

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create `SpecContext` type and loader in `web/src/models/spec-context.ts`
- [ ] T025 [P] [US3] Implement tasks.md parser in `web/src/lib/tasks-parser.ts`
- [ ] T026 [US3] Load related PRs/issues by spec label in `web/src/models/spec-context.ts`
- [ ] T027 [P] [US3] Create `get_spec_status` tool in `web/src/agents/project-agent/tools/spec-tools.ts`
- [ ] T028 [P] [US3] Create `list_remaining_tasks` tool in `web/src/agents/project-agent/tools/spec-tools.ts`
- [ ] T029 [P] [US3] Create `get_spec_blockers` tool in `web/src/agents/project-agent/tools/spec-tools.ts`
- [ ] T030 [US3] Add spec tools to agent tool registry in `web/src/agents/project-agent/index.ts`
- [ ] T031 [P] [US3] Create `SpecChatProvider` component in `web/src/components/agent-chat/SpecChatProvider.tsx`
- [ ] T032 [US3] Create spec chat page at `web/src/app/(dashboard)/projects/[projectId]/specs/[specSlug]/chat/page.tsx`
- [ ] T033 [US3] Inject spec context into agent system prompt
- [ ] T034 [US3] Auto-tag issues created from spec context with spec label

---

## Phase 6: User Story 4 - Cross-Platform Agent Orchestration (Priority: P4)

### Implementation for User Story 4

- [ ] T035 [P] [US4] Create `assign_to_copilot` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/assign-to-copilot.ts`
- [ ] T036 [P] [US4] Create `mention_external_agent` tool in `web/packages/@catalyst/vcs-provider/src/agents/tools/mention-external-agent.ts`
- [ ] T037 [US4] Add external agent tools to package export in `web/packages/@catalyst/vcs-provider/src/agents/index.ts`
- [ ] T038 [P] [US4] Create `ExternalAgentTask` model in `web/src/models/external-agent-tasks.ts`
- [ ] T039 [US4] Implement task creation and handle bot handle prompt via chat in `web/src/agents/project-agent/index.ts`
- [ ] T040 [US4] Add webhook handler for external agent PR creation in `web/src/app/api/github/webhook/route.ts`
- [ ] T041 [US4] Link external agent PRs to originating issues/tasks
- [ ] T042 [US4] Add external agent task status to spec view

---

## Phase 7: User Story 6 - VCS ChatOps Integration (Priority: P6)

- [ ] T049 [P] [US6] Add @mention detection to webhook handler in `web/src/app/api/github/webhook/route.ts`
- [ ] T050 [P] [US6] Create ChatOps command parser in `web/src/lib/chatops-parser.ts`
- [ ] T051 [US6] Implement webhook-to-agent bridge for processing commands
- [ ] T052 [US6] Post agent responses back to VCS as comments
- [ ] T053 [US6] Handle bot assignment to issues (trigger analysis)

---

## Phase 8: Quality Assurance & Testing

- [ ] T055 [P] Unit tests for VCS agent tools in `web/packages/@catalyst/vcs-provider/src/agents/tools/*.test.ts`
- [ ] T056 [P] Integration tests for `POST /api/chat` in `web/__tests__/integration/chat-api.test.ts`
- [ ] T057 [US3] Happy path E2E test for spec agent chat (mocked SSE) in `web/__tests__/e2e/spec-chat.spec.ts`
- [ ] T060 Security review: validate user WRITE access for ChatOps and tool execution

---

## Phase 9: Deferred Work (Future)

- [ ] T044 [P] [US5] [TUI] Create CLI package structure at `cli/`
- [ ] T045 [US5] [TUI] Implement manual token paste authentication flow for CLI
- [ ] T046 [US5] [TUI] Create terminal chat UI with streaming support
- [ ] T047 [US5] [TUI] Connect CLI to same `/api/chat` endpoint
- [ ] T061 [MCP] Register new agent tools with MCP server at `web/src/app/api/mcp/`

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Add rate limiting handling for VCS API calls
- [ ] T063 [P] Add error handling and user-friendly error messages
- [ ] T064 [P] Add logging for agent tool executions
- [ ] T065 Create quickstart.md for developer onboarding
- [ ] T066 [P] Add loading states and optimistic updates to chat UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (P1): No dependencies on other stories
  - US2 (P2): ✅ Already done
  - US3 (P3): Builds on US1 chat infrastructure
  - US4 (P4): Builds on US1 VCS tools
  - US5 (P5): Builds on US1 chat API
  - US6 (P6): Builds on US1 agent and VCS tools
- **Polish (Phase 10)**: Can run alongside later user stories

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Within US1: VCS tools (T009-T013) can run in parallel, UI components (T018-T019) can run in parallel
- US3 spec tools (T027-T029) can run in parallel
- US4 external agent tools (T035-T036) can run in parallel
- US6 webhook tasks (T049-T050) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test chat with VCS operations
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy (MVP!)
3. US2 → ✅ Already done
4. Add US3 → Spec-context chat → Deploy
5. Add US4 → External agent orchestration → Deploy
6. Add US6 → ChatOps → Deploy
7. Add Polish → Refine UX
8. Future: TUI, MCP

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently completable and testable
- VCS agent tools go in `@catalyst/vcs-provider` package for reusability
- Spec-specific tools stay in `web/src/agents/` as they're Catalyst-specific
- Commit after each task or logical group
- VCS operations require user authentication and permissions checks
