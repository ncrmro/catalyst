# Tasks: PR Preview Environment Deployment

**Feature Branch**: `001-pr-preview-environments`
**Generated**: 2025-01-08
**Input**: Design documents from `/specs/001-pr-preview-environments/`

**Tests**: Per constitution Principle 5, unit/integration tests with >80% coverage are REQUIRED. Test tasks are included in Phase 9 (T083-T087 for validation testing). TDD workflow (test-first) is recommended but not mandated - tests can be written after implementation during Phase 9.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Review existing codebase architecture in web/src/models/README.md, web/src/actions/README.md, web/src/db/README.md
- [x] T002 [P] Review existing Kubernetes client implementation in web/src/lib/k8s-client.ts
- [x] T003 [P] Review existing pull request pod utilities in web/src/lib/k8s-pull-request-pod.ts
- [x] T004 [P] Review existing GitHub webhook handler in web/src/app/api/github/webhook/route.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add pullRequestPods table definition to web/src/db/schema.ts with all fields, constraints, and indexes per data-model.md
- [x] T006 Add pullRequestPodsRelations to web/src/db/schema.ts for relationship with pullRequests table
- [x] T007 Extend pullRequestsRelations in web/src/db/schema.ts to include pods relationship
- [x] T008 Generate database migration with npm run db:generate
- [x] T009 Apply database migration with npm run db:migrate (requires database running - use `make up` first)
- [x] T010 Create TypeScript types file web/src/types/preview-environments.ts with PodStatus, ResourceAllocation, DeploymentComment, PreviewEnvironmentConfig types

**Checkpoint**: Foundation validated (T010b passed) - user story implementation can now begin in parallel. STOP HERE if schema validation fails.

---

## Phase 3: User Story 1 - Developer Creates PR and Gets Working Preview (Priority: P1) 🎯 MVP

**Goal**: Automatically deploy isolated preview environments for every pull request and post public URL to PR comments

**Independent Test**: Create a PR in a configured repository, verify webhook processes it, deployment succeeds, and working preview URL is posted as a comment within 3 minutes

### Implementation for User Story 1

#### Models Layer - Core Deployment Logic

- [x] T011 [P] [US1] Create helper function generateNamespace() in web/src/models/preview-environments.ts to generate DNS-safe namespace names
- [x] T012 [P] [US1] Create helper function generatePublicUrl() in web/src/models/preview-environments.ts to construct public URLs for preview environments
- [x] T013 [US1] Create helper function deployHelmChart() in web/src/models/preview-environments.ts to deploy Helm charts AFTER image build completes (uses existing k8s-pull-request-pod.ts for image building, adds Helm deployment for application)
- [x] T013b [US1] Update deployHelmChart() to wait for Job completion from k8s-pull-request-pod.ts before deploying Helm chart with built image tag
- [x] T014 [US1] Create helper function upsertGitHubComment() in web/src/lib/github-pr-comments.ts to post or update deployment comments on GitHub PRs
- [x] T015 [US1] Implement createPreviewDeployment() in web/src/models/preview-environments.ts with full orchestration logic (database, K8s, GitHub)
- [x] T016 [US1] Implement watchDeploymentStatus() in web/src/lib/k8s-preview-deployment.ts to monitor Kubernetes deployments using polling
- [x] T017 [US1] Implement listActivePreviewPods() in web/src/models/preview-environments.ts to query active pods with team filtering

#### Webhook Handler - GitHub Integration

- [x] T018 [US1] Add handlePullRequestEvent() function to web/src/app/api/github/webhook/route.ts to route PR events
- [x] T019 [US1] Implement opened action handler in handlePullRequestEvent() to create preview deployments on PR creation
- [x] T020 [US1] Implement synchronize action handler in handlePullRequestEvent() to redeploy on new commits with idempotency checks
- [x] T021 [US1] Implement reopened action handler in handlePullRequestEvent() to recreate preview environments
- [x] T022 [US1] Add idempotency logic using database unique constraints on (pullRequestId, commitSha)
- [x] T023 [US1] Add error handling to webhook handler to always return 200 OK and prevent GitHub retries

#### Actions Layer - React Server Components Boundary

- [x] T024 [P] [US1] Create getPreviewEnvironments() action in web/src/actions/preview-environments.ts with session auth and team filtering
- [x] T025 [P] [US1] Create getPreviewEnvironment() action in web/src/actions/preview-environments.ts to fetch single environment with authorization
- [x] T026 [US1] Add type exports to web/src/actions/preview-environments.ts re-exporting from database and models layers

**Checkpoint**: At this point, User Story 1 core functionality (webhook → deployment → GitHub comment) should work end-to-end

---

## Phase 4: User Story 2 - Developer Monitors Deployment Progress and Logs (Priority: P2)

**Goal**: Provide UI for viewing deployment status and container logs for debugging

**Independent Test**: Navigate to preview environment page in UI, trigger a deployment error, verify logs are accessible and status is displayed correctly

### Implementation for User Story 2

#### Models Layer - Logs and Status

- [x] T027 [P] [US2] Implement getPreviewPodLogs() in web/src/models/preview-environments.ts to fetch container logs from Kubernetes API
- [x] T028 [P] [US2] Add authorization checks to getPreviewPodLogs() for team membership validation

#### Actions Layer - UI Data Access

- [x] T029 [P] [US2] Create getPodLogs() action in web/src/actions/preview-environments.ts with session auth and team filtering

#### UI Components - Dashboard Pages

- [x] T030 [US2] Create list page component web/src/app/(dashboard)/preview-environments/page.tsx displaying all active preview environments
- [x] T031 [US2] Add table with namespace, status, public URL, PR link columns to list page
- [x] T032 [US2] Create detail page component web/src/app/(dashboard)/preview-environments/[id]/page.tsx showing full pod details
- [x] T033 [US2] Add deployment status display (pending, running, failed, succeeded) to detail page
- [x] T034 [US2] Add logs viewer section to detail page with tail limit selector
- [x] T035 [US2] Add real-time log fetching with timestamps to logs viewer

**Checkpoint**: UI should now display all preview environments, their status, and allow log viewing for debugging

---

## Phase 5: User Story 3 - Developer Pushes Updates and Preview Auto-Redeploys (Priority: P2)

**Goal**: Automatically redeploy preview environments when new commits are pushed to PR branch

**Independent Test**: Push additional commits to an existing PR, verify preview redeploys automatically and GitHub comment is updated with new status

### Implementation for User Story 3

#### GitHub Comment Updates

- [x] T036 [US3] Update upsertGitHubComment() in web/src/models/preview-environments.ts to handle redeployment status updates
- [x] T037 [US3] Add timestamp tracking to GitHub comments for deployment history
- [x] T038 [US3] Add error message display to GitHub comments for failed redeployments

#### Webhook Handler Enhancements

- [x] T039 [US3] Verify synchronize action handler in web/src/app/api/github/webhook/route.ts correctly triggers redeployment
- [x] T040 [US3] Add cancellation logic for pending deployments when new commit pushed
- [x] T041 [US3] Update database record with new commit SHA and reset status to pending

**Checkpoint**: Preview environments should now auto-redeploy on every push and keep GitHub comments updated

---

## Phase 6: User Story 4 - Preview Environment Cleanup on PR Close (Priority: P3)

**Goal**: Automatically delete preview environments when PRs are closed or merged to free cluster resources

**Independent Test**: Close or merge a PR, verify Kubernetes namespace and all resources are deleted within 5 minutes

### Implementation for User Story 4

#### Models Layer - Cleanup Logic

- [x] T042 [P] [US4] Create helper function deleteKubernetesNamespace() in web/src/models/preview-environments.ts to delete namespaces with cascading delete
- [x] T043 [US4] Implement deletePreviewDeployment() in web/src/models/preview-environments.ts with namespace cleanup and database record removal
- [x] T044 [US4] Add retry logic with exponential backoff for failed deletions

#### Webhook Handler - Cleanup Trigger

- [x] T045 [US4] Implement closed action handler in handlePullRequestEvent() in web/src/app/api/github/webhook/route.ts
- [x] T046 [US4] Add final GitHub comment posting when cleanup completes
- [x] T047 [US4] Add error notification for platform operators when deletion fails

#### Actions Layer - Manual Cleanup

- [x] T048 [US4] Create deletePreviewEnvironment() action in web/src/actions/preview-environments.ts for manual cleanup with admin authorization

#### UI Components - Cleanup Actions

- [x] T049 [US4] Add delete button to preview environment detail page with confirmation dialog

**Checkpoint**: Preview environments should automatically cleanup on PR close and support manual deletion

---

## Phase 7: User Story 5 - Platform Operator Views Resource Usage (Priority: P3)

**Goal**: Provide platform operators visibility into all preview environments and their resource consumption

**Independent Test**: View preview environments list page, verify resource metrics are displayed with age and usage stats

### Implementation for User Story 5

#### Models Layer - Resource Metrics

- [x] T050 [P] [US5] Add resource usage queries to listActivePreviewPods() in web/src/models/preview-environments.ts to fetch CPU/memory from Kubernetes
- [x] T051 [P] [US5] Add age calculation for preview environments based on createdAt timestamp
- [x] T052 [US5] Add resource quota warning logic to flag environments exceeding limits

#### UI Components - Operator Dashboard

- [x] T053 [US5] Enhance list page web/src/app/(dashboard)/preview-environments/page.tsx with resource usage columns
- [x] T054 [US5] Add CPU/memory usage display to environment list table
- [x] T055 [US5] Add age column showing days since creation
- [x] T056 [US5] Add warning indicators for environments exceeding resource quotas
- [x] T057 [US5] Add filter by status to list page (pending, deploying, running, failed)

#### Actions Layer - Retry Logic

- [x] T058 [US5] Create retryDeployment() action in web/src/actions/preview-environments.ts for manual retry of failed deployments
- [x] T059 [US5] Implement retryFailedDeployment() in web/src/models/preview-environments.ts with status reset and deployment trigger

#### UI Components - Retry Actions

- [x] T060 [US5] Add retry button to detail page for failed deployments

**Checkpoint**: Platform operators can now view all environments, resource usage, and manually manage stale or failed deployments

---

## Phase 8: MCP Tools - AI Agent Access (Priority: P1)

**Goal**: Expose all preview environment management functionality via MCP tools for AI agents

**Independent Test**: Use MCP inspector or Claude Desktop to call each tool and verify responses

### MCP Server Extension

- [x] T061 [P] Register list_preview_environments tool in web/src/app/api/mcp/route.ts with input schema
- [x] T062 [P] Register get_preview_environment tool in web/src/app/api/mcp/route.ts with input schema
- [x] T063 [P] Register get_preview_logs tool in web/src/app/api/mcp/route.ts with input schema
- [x] T064 [P] Register delete_preview_environment tool in web/src/app/api/mcp/route.ts with input schema
- [x] T065 [P] Register retry_preview_deployment tool in web/src/app/api/mcp/route.ts with input schema
- [x] T066 Implement handleListPreviewEnvironments() in web/src/app/api/mcp/route.ts with filtering by status and repo
- [x] T067 Implement handleGetPreviewEnvironment() in web/src/app/api/mcp/route.ts with lookup by ID or namespace
- [x] T068 Implement handleGetPreviewLogs() in web/src/app/api/mcp/route.ts with tail limit and timestamp options
- [x] T069 Implement handleDeletePreviewEnvironment() in web/src/app/api/mcp/route.ts with authorization
- [x] T070 Implement handleRetryPreviewDeployment() in web/src/app/api/mcp/route.ts with status validation
- [x] T071 Add user context extraction from MCP session metadata
- [x] T072 Add structured error responses with error codes (UNAUTHORIZED, NOT_FOUND, INVALID_INPUT, SERVER_ERROR)

**Checkpoint**: All preview environment features should now be accessible via MCP tools with 100% functional parity to UI

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T073 [P] Add logging for all deployment lifecycle events (created, deploying, running, failed, deleted)
- [x] T074 [P] Add validation for namespace DNS-1123 compliance using Zod schema
- [x] T075 [P] Add validation for commit SHA format (40-character hex string)
- [x] T076 [P] Add validation for public URL format (HTTPS only)
- [ ] T077 Add resource quota enforcement per preview environment (CPU: 500m, Memory: 512Mi)
- [ ] T078 Add deployment timeout handling (3 minutes max)
- [ ] T079 Add retry limit enforcement (max 3 attempts with exponential backoff)
- [ ] T080 Add error message sanitization in GitHub comments to prevent information leaks
- [ ] T081 Add transaction rollback handling for failed Kubernetes operations
- [ ] T082 Add database index verification for performance (status, namespace indexes)
- [x] T092 [P] Create Kubernetes NetworkPolicy manifests in deployHelmChart() function following research.md section 5 specifications (allow ingress from ingress-nginx namespace, allow egress to kube-system DNS and docker-registry, deny all other traffic)
- [ ] T083 Test webhook signature validation with invalid signatures
- [ ] T084 Test idempotency with duplicate webhook events
- [ ] T085 Test concurrent deployments (50+ simultaneous PRs)
- [ ] T086 Verify deployment time meets <3 minute requirement
- [ ] T087 Verify cleanup time meets <5 minute requirement
- [x] T088 Run linting with npm run lint
- [x] T089 Run type checking with npm run typecheck
- [x] T090 Run build verification with npm run build
- [x] T091 Update CLAUDE.md with preview environments section documenting new architecture

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - Core deployment functionality
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - Independent from US1 but enhances it with UI
- **User Story 3 (Phase 5)**: Depends on User Story 1 (Phase 3) - Extends core deployment with auto-redeploy
- **User Story 4 (Phase 6)**: Depends on User Story 1 (Phase 3) - Adds cleanup to core deployment
- **User Story 5 (Phase 7)**: Depends on User Story 2 (Phase 4) - Enhances UI with operator features
- **MCP Tools (Phase 8)**: Depends on all models/actions from User Stories 1-5 being complete
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 3 (P2)**: Depends on User Story 1 - Extends deployment logic
- **User Story 4 (P3)**: Depends on User Story 1 - Adds cleanup to deployment
- **User Story 5 (P3)**: Depends on User Story 2 - Enhances UI
- **MCP Tools**: Depends on all user stories for complete feature parity

### Within Each User Story

- Models layer before Actions layer
- Actions layer before UI components
- Webhook handlers in parallel with models/actions
- Helper functions before main orchestration functions
- Core implementation before integration

### Parallel Opportunities

**Setup (Phase 1)**:

- All T002, T003, T004 can run in parallel (reading different files)

**Foundational (Phase 2)**:

- T010 can run in parallel with T005-T009 (types independent of schema)

**User Story 1 (Phase 3)**:

- T011, T012 can run in parallel (different helper functions)
- T024, T025 can run in parallel (different action functions)

**User Story 2 (Phase 4)**:

- T027, T028 can run in parallel (logs logic separate from authorization)
- T029 can run in parallel with T027-T028 (actions separate from models)

**User Story 5 (Phase 7)**:

- T050, T051 can run in parallel (different metric queries)

**MCP Tools (Phase 8)**:

- T061-T065 can run in parallel (registering different tools)

**Polish (Phase 9)**:

- T073-T076 can run in parallel (different validation/logging tasks)
- T088-T090 can run in parallel (independent verification commands)

---

## Parallel Example: User Story 1 - Models Layer

```bash
# Launch model helper functions together:
Task T011: "Create helper function generateNamespace()"
Task T012: "Create helper function generatePublicUrl()"

# After helpers complete, launch orchestration:
Task T013: "Create helper function deployHelmChart()"
Task T014: "Create helper function upsertGitHubComment()"
```

---

## Parallel Example: User Story 1 - Actions Layer

```bash
# Launch action functions together (different exports):
Task T024: "Create getPreviewEnvironments() action"
Task T025: "Create getPreviewEnvironment() action"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (review existing code)
2. Complete Phase 2: Foundational (database schema + types) - CRITICAL
3. Complete Phase 3: User Story 1 (webhook → deploy → comment)
4. **STOP and VALIDATE**: Create a test PR, verify deployment works end-to-end
5. Deploy/demo if ready

**This gives you**: Automatic preview deployments with public URLs posted to PRs (core value!)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy/Demo (MVP!)**
3. Add User Story 2 → Test independently → Deploy/Demo (now with UI)
4. Add User Story 3 → Test independently → Deploy/Demo (now with auto-redeploy)
5. Add User Story 4 → Test independently → Deploy/Demo (now with cleanup)
6. Add User Story 5 → Test independently → Deploy/Demo (now with operator features)
7. Add MCP Tools → Test independently → Deploy/Demo (now AI-accessible)

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (webhook + models + actions) - PRIORITY
   - **Developer B**: User Story 2 (UI components) - starts after US1 models/actions complete
   - **Developer C**: MCP Tools (Phase 8) - starts after US1-US5 models/actions complete
3. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 91
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 6 tasks (BLOCKING)
- **User Story 1 (P1 - MVP)**: 16 tasks
- **User Story 2 (P2)**: 9 tasks
- **User Story 3 (P2)**: 6 tasks
- **User Story 4 (P3)**: 8 tasks
- **User Story 5 (P3)**: 13 tasks
- **MCP Tools (P1)**: 12 tasks
- **Polish Phase**: 19 tasks

**Parallel Opportunities**: 23 tasks marked [P] can run in parallel within their phases

**MVP Scope** (recommended first delivery):

- Setup (4 tasks)
- Foundational (6 tasks)
- User Story 1 (16 tasks)
- **Total MVP**: 26 tasks

This delivers the core value proposition: automatic preview deployments with public URLs.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Per Constitution Principle 5, unit tests with >80% coverage are required (T083-T087 cover validation testing)
- Focus on production functionality and operational reliability
