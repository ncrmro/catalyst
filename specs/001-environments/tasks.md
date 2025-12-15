# Migrated Tasks from PR Preview Environment Deployment

The following tasks were defined for the PR Preview Environment Deployment feature. Their status is noted as completed (`[x]`) or pending (`[ ]`).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Review existing codebase architecture in web/src/models/README.md, web/src/actions/README.md, web/src/db/README.md
- [x] T002 Review existing Kubernetes client implementation in web/src/lib/k8s-client.ts
- [x] T003 Review existing pull request pod utilities in web/src/lib/k8s-pull-request-pod.ts
- [x] T004 Review existing GitHub webhook handler in web/src/app/api/github/webhook/route.ts

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T005 Add pullRequestPods table definition to web/src/db/schema.ts with all fields, constraints, and indexes per data-model.md
- [x] T006 Add pullRequestPodsRelations to web/src/db/schema.ts for relationship with pullRequests table
- [x] T007 Extend pullRequestsRelations in web/src/db/schema.ts to include pods relationship
- [x] T008 Generate database migration with npm run db:generate
- [x] T009 Apply database migration with npm run db:migrate
- [x] T010 Create TypeScript types file web/src/types/preview-environments.ts with PodStatus, ResourceAllocation, DeploymentComment, PreviewEnvironmentConfig types

## Phase 3: User Story 1 - Developer Creates PR and Gets Working Preview (Priority: P1) 🎯 MVP

#### Models Layer - Core Deployment Logic

- [ ] T011 Create helper function generateNamespace() in web/src/models/preview-environments.ts to generate DNS-safe namespace names
- [ ] T012 Create helper function generatePublicUrl() in web/src/models/preview-environments.ts to construct public URLs for preview environments
- [ ] T013 Create helper function deployHelmChart() in web/src/models/preview-environments.ts to deploy Helm charts to Kubernetes with dynamic values
- [ ] T014 Create helper function upsertGitHubComment() in web/src/models/preview-environments.ts to post or update deployment comments on GitHub PRs
- [ ] T015 Implement createPreviewDeployment() in web/src/models/preview-environments.ts with full orchestration logic (database, K8s, GitHub)
- [ ] T016 Implement watchDeploymentStatus() in web/src/models/preview-environments.ts to monitor Kubernetes deployments using Watch API
- [ ] T017 Implement listActivePreviewPods() in web/src/models/preview-environments.ts to query active pods with team filtering

#### Webhook Handler - GitHub Integration

- [ ] T018 Add handlePullRequestEvent() function to web/src/app/api/github/webhook/route.ts to route PR events
- [ ] T019 Implement opened action handler in handlePullRequestEvent() to create preview deployments on PR creation
- [ ] T020 Implement synchronize action handler in handlePullRequestEvent() to redeploy on new commits with idempotency checks
- [ ] T021 Implement reopened action handler in handlePullRequestEvent() to recreate preview environments
- [ ] T022 Add idempotency logic using database unique constraints on (pullRequestId, commitSha)
- [ ] T023 Add error handling to webhook handler to always return 200 OK and prevent GitHub retries

#### Actions Layer - React Server Components Boundary

- [ ] T024 Create getPreviewEnvironments() action in web/src/actions/preview-environments.ts with session auth and team filtering
- [ ] T025 Create getPreviewEnvironment() action in web/src/actions/preview-environments.ts to fetch single environment with authorization
- [ ] T026 Add type exports to web/src/actions/preview-environments.ts re-exporting from database and models layers

## Phase 4: User Story 2 - Developer Monitors Deployment Progress and Logs (Priority: P2)

#### Models Layer - Logs and Status

- [ ] T027 Implement getPreviewPodLogs() in web/src/models/preview-environments.ts to fetch container logs from Kubernetes API
- [ ] T028 Add authorization checks to getPreviewPodLogs() for team membership validation

#### Actions Layer - UI Data Access

- [ ] T029 Create getPodLogs() action in web/src/actions/preview-environments.ts with session auth and team filtering

#### UI Components - Dashboard Pages

- [ ] T030 Create list page component web/src/app/(dashboard)/preview-environments/page.tsx displaying all active preview environments
- [ ] T031 Add table with namespace, status, public URL, PR link columns to list page
- [ ] T032 Create detail page component web/src/app/(dashboard)/preview-environments/[id]/page.tsx showing full pod details
- [ ] T033 Add deployment status display (pending, running, failed, succeeded) to detail page
- [ ] T034 Add logs viewer section to detail page with tail limit selector
- [ ] T035 Add real-time log fetching with timestamps to logs viewer

## Phase 5: User Story 3 - Developer Pushes Updates and Preview Auto-Redeploys (Priority: P2)

#### GitHub Comment Updates

- [ ] T036 Update upsertGitHubComment() in web/src/models/preview-environments.ts to handle redeployment status updates
- [ ] T037 Add timestamp tracking to GitHub comments for deployment history
- [ ] T038 Add error message display to GitHub comments for failed redeployments

#### Webhook Handler Enhancements

- [ ] T039 Verify synchronize action handler in web/src/app/api/github/webhook/route.ts correctly triggers redeployment
- [ ] T040 Add cancellation logic for pending deployments when new commit pushed
- [ ] T041 Update database record with new commit SHA and reset status to pending

## Phase 6: User Story 4 - Preview Environment Cleanup on PR Close (Priority: P3)

#### Models Layer - Cleanup Logic

- [ ] T042 Create helper function deleteKubernetesNamespace() in web/src/models/preview-environments.ts to delete namespaces with cascading delete
- [ ] T043 Implement deletePreviewDeployment() in web/src/models/preview-environments.ts with namespace cleanup and database record removal
- [ ] T044 Add retry logic with exponential backoff for failed deletions

#### Webhook Handler - Cleanup Trigger

- [ ] T045 Implement closed action handler in handlePullRequestEvent() in web/src/app/api/github/webhook/route.ts
- [ ] T046 Add final GitHub comment posting when cleanup completes
- [ ] T047 Add error notification for platform operators when deletion fails

#### Actions Layer - Manual Cleanup

- [ ] T048 Create deletePreviewEnvironment() action in web/src/actions/preview-environments.ts for manual cleanup with admin authorization

#### UI Components - Cleanup Actions

- [ ] T049 Add delete button to preview environment detail page with confirmation dialog

## Phase 7: User Story 5 - Platform Operator Views Resource Usage (Priority: P3)

#### Models Layer - Resource Metrics

- [ ] T050 Add resource usage queries to listActivePreviewPods() in web/src/models/preview-environments.ts to fetch CPU/memory from Kubernetes
- [ ] T051 Add age calculation for preview environments based on createdAt timestamp
- [ ] T052 Add resource quota warning logic to flag environments exceeding limits

#### UI Components - Operator Dashboard

- [ ] T053 Enhance list page web/src/app/(dashboard)/preview-environments/page.tsx with resource usage columns
- [ ] T054 Add CPU/memory usage display to environment list table
- [ ] T055 Add age column showing days since creation
- [ ] T056 Add warning indicators for environments exceeding resource quotas
- [ ] T057 Add filter by status to list page (pending, deploying, running, failed)

#### Actions Layer - Retry Logic

- [ ] T058 Create retryDeployment() action in web/src/actions/preview-environments.ts for manual retry of failed deployments
- [ ] T059 Implement retryFailedDeployment() in web/src/models/preview-environments.ts with status reset and deployment trigger

#### UI Components - Retry Actions

- [ ] T060 Add retry button to detail page for failed deployments

## Phase 8: MCP Tools - AI Agent Access (Priority: P1)

### MCP Server Extension

- [ ] T061 Register list_preview_environments tool in web/src/app/api/mcp/route.ts with input schema
- [ ] T062 Register get_preview_environment tool in web/src/app/api/mcp/route.ts with input schema
- [ ] T063 Register get_preview_logs tool in web/src/app/api/mcp/route.ts with input schema
- [ ] T064 Register delete_preview_environment tool in web/src/app/api/mcp/route.ts with input schema
- [ ] T065 Register retry_preview_deployment tool in web/src/app/api/mcp/route.ts with input schema
- [ ] T066 Implement handleListPreviewEnvironments() in web/src/app/api/mcp/route.ts with filtering by status and repo
- [ ] T067 Implement handleGetPreviewEnvironment() in web/src/app/api/mcp/route.ts with lookup by ID or namespace
- [ ] T068 Implement handleGetPreviewLogs() in web/src/app/api/mcp/route.ts with tail limit and timestamp options
- [ ] T069 Implement handleDeletePreviewEnvironment() in web/src/app/api/mcp/route.ts with authorization
- [ ] T070 Implement handleRetryPreviewDeployment() in web/src/app/api/mcp/route.ts with status validation
- [ ] T071 Add user context extraction from MCP session metadata
- [ ] T072 Add structured error responses with error codes (UNAUTHORIZED, NOT_FOUND, INVALID_INPUT, SERVER_ERROR)

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T073 Add logging for all deployment lifecycle events (created, deploying, running, failed, deleted)
- [ ] T074 Add validation for namespace DNS-1123 compliance using Zod schema
- [ ] T075 Add validation for commit SHA format (40-character hex string)
- [ ] T076 Add validation for public URL format (HTTPS only)
- [ ] T077 Add resource quota enforcement per preview environment (CPU: 500m, Memory: 512Mi)
- [ ] T078 Add deployment timeout handling (3 minutes max)
- [ ] T079 Add retry limit enforcement (max 3 attempts with exponential backoff)
- [ ] T080 Add error message sanitization in GitHub comments to prevent information leaks
- [ ] T081 Add transaction rollback handling for failed Kubernetes operations
- [ ] T082 Add database index verification for performance (status, namespace indexes)
- [ ] T083 Test webhook signature validation with invalid signatures
- [ ] T084 Test idempotency with duplicate webhook events
- [ ] T085 Test concurrent deployments (50+ simultaneous PRs)
- [ ] T086 Verify deployment time meets <3 minute requirement
- [ ] T087 Verify cleanup time meets <5 minute requirement
- [ ] T088 Run linting with npm run lint
- [ ] T089 Run type checking with npm run typecheck
- [ ] T090 Run build verification with npm run build
- [ ] T091 Update CLAUDE.md with preview environments section documenting new architecture
