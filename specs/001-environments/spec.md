# Environments Specification

## Why

Environments provide isolated and pre-configured settings for users to interact with their code. This is crucial for streamlining development, facilitating robust testing, and enabling previews of changes before they are deployed to production. This approach significantly enhances development efficiency and ensures system stability.

## What

Environments, in this context, refer to various specialized contexts for code interaction. Each environment operates within its own dedicated Kubernetes namespace, ensuring strong resource and networking isolation. Containers running within these environments are authorized to perform actions specific to their namespace, with Kubernetes enforcing all necessary resource and networking constraints.

The types of environments include:

*   **Preview Environments:** Designed for showcasing and validating changes in a production-like setting, enabling early feedback and comprehensive review.
*   **Pull-Request/Branch Environments:** Tailored for testing specific code branches or pull requests, allowing developers to isolate and verify new features or fixes without affecting other development streams.
*   **Dev Containers:** Standardized development environments that provide a consistent and reproducible setup for developers, minimizing "it works on my machine" issues.
*   **Agent Environments:** Dedicated environments for automated agents to execute tasks, such as continuous integration/continuous deployment (CI/CD) pipelines or other automated workflows.

## How

Users will interact with and manage these environments through two primary interfaces, both offering a consistent set of functionalities:

*   **CLI/TUI (Command Line Interface/Text User Interface):** This interface will provide OpenID Connect (OIDC) authentication for `kubectl` and `k9s`, allowing users secure access to their Kubernetes resources. It will also enable users to view and manage their environments based on their assigned cluster roles and permissions.
*   **Web Interface:** A comprehensive web-based user interface will mirror all functionalities available in the CLI/TUI. This ensures that users can access and manage their environments with ease, regardless of their preferred interaction method.

---

# Feature Specification: PR Preview Environment Deployment

**Feature Branch**: `001-pr-preview-environments`
**Created**: 2025-01-08
**Status**: Draft
**Input**: User description: "when a user has appropretly configured a project with git repos. Those pull requests in those repos should create deployed preview environments for that PR. We already get a webhook and should be using the pull request pod which has the permissions to deploy kubernetes resources in it's own namespace. This should update a comment on the pull request indicating the public URL that can be used to view this PR. We should have some basic UI for now in the UI to view and browse container logs etc."

## Problem Statement

Developers creating pull requests currently lack visibility into how their changes will behave in a live environment. Without automated preview deployments, teams must manually deploy changes to test environments or wait until merge to see issues, creating slow feedback loops and increasing the risk of bugs reaching production.

**User Impact:** Development teams waste time on manual deployments and debugging integration issues that could have been caught earlier with automated preview environments.

**Current Workaround:** Developers manually deploy branches to shared staging environments or rely on local testing, which doesn't reflect production conditions.

## Goals

**Primary Goal:**
Automatically deploy isolated preview environments for every pull request, providing developers with instant feedback on how their changes behave in a production-like setting.

**Secondary Goals:**

- Enable developers to inspect deployment status and logs without leaving the GitHub interface
- Reduce time from code push to working preview environment from manual hours to automated minutes
- Provide platform operators visibility into resource usage across preview environments

**Non-Goals:**

- Production deployment automation (this feature focuses on preview/staging only)
- Custom domain management per preview environment
- Multi-region preview deployments
- Devcontainer integration with SSH/port forwarding for interactive development (future extension - see Design Considerations)

## Constitutional Alignment

This feature aligns with the following constitutional principles:

1. **Agentic-First Design:** Preview environment creation and management will be accessible via MCP tools, allowing AI agents to trigger deployments, inspect logs, and report status.

2. **Fast Feedback Loops:** Automatic deployment on PR creation provides developers with immediate environment access, eliminating manual deployment wait times and enabling rapid iteration.

3. **Deployment Portability:** Preview environments use standard Kubernetes resources and Helm charts, ensuring consistency across any Kubernetes cluster without vendor lock-in.

4. **Security by Default:** Preview environments are isolated in dedicated namespaces with RBAC restrictions and Kubernetes network policies that prevent access to production namespaces. GitHub tokens are encrypted when stored for webhook authentication.

5. **Layered Architecture Discipline:** Deployment logic resides in the Models layer, webhook handling in Actions layer, with clear separation of concerns.

**Principle Conflicts:** None

## Clarifications

### Session 2025-01-08

- Q: How should preview environments be network-isolated from production and each other? → A: Use kubernetes network policies to limit namespace only (and potentially auxiliary namespace to allow for pushing images etc)
- Q: What key metrics should be tracked and exposed for preview environment operations? → A: Deployment success/failure rate, deployment duration (p50/p95), active preview count, resource utilization per namespace
- Q: What happens to an in-progress deployment when a developer force-pushes to the PR branch? → A: Cancel in-progress deployment and start fresh deployment with new commit SHA
- Q: How should the system handle GitHub API rate limit exhaustion? → A: Exponential backoff with circuit breaker; retry after rate limit reset window
- Q: What happens if the Helm deployment succeeds but application health checks fail? → A: Mark deployment as failed, post error to PR comment with health check logs, allow retry

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Creates PR and Gets Working Preview (Priority: P1)

A developer pushes code to a feature branch and opens a pull request. Within minutes, they receive a comment on the PR with a public URL to access their deployed changes. They click the URL and see their application running with their latest code.

**Why this priority**: This is the core value proposition—automatic preview deployment. Without this, the feature provides no value.

**Independent Test**: Can be fully tested by creating a PR in a configured repository, waiting for webhook processing, and verifying a working preview URL is posted as a comment. Delivers immediate value by showing developers their deployed changes.

**Acceptance Scenarios**:

1. **Given** a project is configured with a GitHub repository, **When** a developer opens a new pull request, **Then** a preview environment is created in a dedicated Kubernetes namespace within 3 minutes
2. **Given** a preview environment is successfully deployed, **When** the deployment completes, **Then** a comment is posted on the pull request with the public URL
3. **Given** a public URL is provided, **When** a developer visits the URL, **Then** they see their application running with the code from the PR branch

---

### User Story 2 - Developer Monitors Deployment Progress and Logs (Priority: P2)

A developer opens the Catalyst UI and navigates to their pull request's preview environment page. They see the deployment status (pending, running, failed) and can view real-time container logs to debug any issues.

**Why this priority**: Debugging failed deployments is critical but secondary to getting the basic deployment working. This enhances the core feature.

**Independent Test**: Can be tested by navigating to the preview environment page in the UI, triggering a deployment error, and verifying logs are accessible. Delivers value by reducing debugging friction.

**Acceptance Scenarios**:

1. **Given** a preview environment exists for a PR, **When** a developer navigates to the preview environment page in Catalyst UI, **Then** they see the current deployment status (pending, running, failed, succeeded)
2. **Given** a developer is viewing the preview environment page, **When** they click "View Logs" for a container, **Then** they see the container's real-time stdout/stderr output
3. **Given** a deployment fails, **When** a developer views the logs, **Then** they can see error messages explaining why the deployment failed

---

### User Story 3 - Developer Pushes Updates and Preview Auto-Redeploys (Priority: P2)

A developer makes changes to their PR branch and pushes new commits. The preview environment automatically redeploys with the latest code, and the GitHub comment is updated with the new deployment status.

**Why this priority**: Continuous updates ensure the preview stays in sync with the PR, but initial deployment is more critical to establish first.

**Independent Test**: Can be tested by pushing additional commits to an existing PR and verifying the preview redeploys automatically. Delivers value by keeping the preview current.

**Acceptance Scenarios**:

1. **Given** a preview environment exists for a PR, **When** a developer pushes new commits to the PR branch, **Then** the preview environment redeploys automatically with the latest code
2. **Given** a redeployment is triggered, **When** the deployment completes, **Then** the GitHub PR comment is updated with the new deployment status and timestamp
3. **Given** a redeployment fails, **When** the failure occurs, **Then** the PR comment is updated with an error message and link to view logs

---

### User Story 4 - Preview Environment Cleanup on PR Close (Priority: P3)

A developer closes or merges their pull request. The preview environment is automatically deleted, freeing up cluster resources and ensuring clean cluster state.

**Why this priority**: Important for resource management but not blocking for core functionality. Can be handled manually initially.

**Independent Test**: Can be tested by closing/merging a PR and verifying the Kubernetes namespace and resources are deleted within 5 minutes. Delivers value by preventing resource waste.

**Acceptance Scenarios**:

1. **Given** a preview environment exists for a PR, **When** the PR is closed or merged, **Then** the Kubernetes namespace and all resources are deleted within 5 minutes
2. **Given** a preview environment is being deleted, **When** deletion completes, **Then** a final comment is posted on the PR indicating the environment was cleaned up
3. **Given** deletion fails, **When** the failure occurs, **Then** platform operators are notified to manually investigate

---

### User Story 5 - Platform Operator Views Resource Usage (Priority: P3)

A platform operator opens the Catalyst UI and views a dashboard showing all active preview environments, their resource consumption, and age. They can manually delete stale environments if needed.

**Why this priority**: Operational visibility is valuable for platform health but not critical for developer workflow. Nice-to-have.

**Independent Test**: Can be tested by viewing the preview environments list page and verifying resource metrics are displayed. Delivers value by enabling proactive resource management.

**Acceptance Scenarios**:

1. **Given** multiple preview environments exist, **When** a platform operator views the preview environments list page, **Then** they see all active environments with CPU/memory usage and age
2. **Given** a platform operator identifies a stale environment, **When** they click "Delete Environment", **Then** the environment is removed and resources freed
3. **Given** a preview environment exceeds resource quotas, **When** the operator views the list, **Then** the environment is flagged with a warning indicator

---

### Edge Cases

- What happens when a PR is created but the repository has no deployment configuration? → System posts a comment explaining configuration is missing and provides a link to setup docs
- How does the system handle deployment failures due to invalid Kubernetes manifests? → Deployment fails, error is posted to PR comment with specific YAML validation errors
- What happens when the Kubernetes cluster is at capacity? → Deployment is queued and retried with exponential backoff; PR comment shows "pending" status with queue position
- How does the system handle concurrent pushes to the same PR branch? → Only the latest deployment runs; in-progress deployments are cancelled and a fresh deployment starts with the new commit SHA
- What happens when GitHub webhooks fail or are delayed? → System detects missing deployments via periodic reconciliation (every 5 minutes) and processes missed events
- How are secrets and environment variables handled for preview environments? → Secrets are copied from the project's configured secret store (namespace-specific) with read-only access
- What happens when GitHub API rate limits are exhausted? → System uses exponential backoff with circuit breaker pattern, retrying operations after the rate limit reset window; deployments show "pending" status during rate limit delays
- What happens if Helm deployment succeeds but application health checks fail? → Deployment is marked as failed, error details with health check logs are posted to the PR comment, and the deployment can be retried

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST create a dedicated Kubernetes namespace for each pull request preview environment with format `pr-{repo-name}-{pr-number}`

  > ✅ **IMPLEMENTED**: `web/src/actions/kubernetes.ts:createKubernetesNamespace()`, called from webhook handler at `web/src/app/api/github/webhook/route.ts:283`

- **FR-002**: System MUST deploy the PR branch code to the preview environment using the project's configured Helm chart

  > ⚠️ **PARTIALLY IMPLEMENTED**: Current uses Kubernetes Jobs (`web/src/lib/k8s-pull-request-pod.ts:createPullRequestPodJob()`) for Docker image builds with buildx, NOT Helm chart deployments. Webhook creates job at route.ts:286-307.

- **FR-003**: System MUST post a comment on the pull request with the public URL when deployment succeeds

  > ⚠️ **PARTIALLY IMPLEMENTED**: Posts "hello from catalyst" comment (webhook/route.ts:272-278) using GitHub API, but no public URL or deployment status included.

- **FR-004**: System MUST update the PR comment with deployment status (pending, running, failed, succeeded) and timestamps

  > ❌ **NOT IMPLEMENTED**: Creates new comment instead of updating existing one; no status/timestamp tracking in comments.

- **FR-005**: System MUST provide a UI page showing preview environment deployment status and resource usage

  > ❌ **NOT IMPLEMENTED**: No UI pages exist for preview environments. Expected path: `web/src/app/(dashboard)/preview-environments/`

- **FR-006**: System MUST display container logs (stdout/stderr) in the UI for debugging failed deployments

  > ⚠️ **PARTIALLY IMPLEMENTED**: Log retrieval functions exist (`web/src/lib/k8s-pods.ts:getPodLogs()`), but no UI integration or Actions layer to expose them.

- **FR-007**: System MUST automatically redeploy the preview environment when new commits are pushed to the PR branch; if a deployment is in-progress, it MUST be cancelled before starting the new deployment

  > ❌ **NOT IMPLEMENTED**: Webhook handler (`web/src/app/api/github/webhook/route.ts`) doesn't handle `pull_request.synchronize` event; only handles `opened` and `closed`.

- **FR-008**: System MUST delete the preview environment and Kubernetes namespace when the PR is closed or merged

  > ✅ **IMPLEMENTED**: webhook/route.ts:339-381 handles `pull_request.closed` event, calls `deleteKubernetesNamespace()` and `cleanupPullRequestPodJob()`.

- **FR-009**: System MUST handle deployment failures gracefully by posting error details to the PR comment

  > ⚠️ **PARTIALLY IMPLEMENTED**: Logs errors to console (webhook/route.ts:318-334) but doesn't track failures in database or post structured error messages to PR.

- **FR-010**: System MUST enforce resource quotas per preview environment to prevent cluster exhaustion

  > ❌ **NOT IMPLEMENTED**: No Kubernetes ResourceQuota manifest creation. Pull request pod jobs have resource limits (k8s-pull-request-pod.ts:546-555) but no namespace-level quotas.

- **FR-011**: System MUST retry failed deployments up to 3 times with exponential backoff before marking as permanently failed

  > ⚠️ **PARTIALLY IMPLEMENTED**: Kubernetes Jobs have `backoffLimit: 3` (k8s-pull-request-pod.ts:560), but no application-level retry orchestration or failure tracking.

- **FR-012**: System MUST expose preview environment management via MCP tools for AI agent access

  > ⚠️ **PARTIALLY IMPLEMENTED**: MCP server framework exists (`web/src/app/api/mcp/route.ts`) with authentication and tool registration, but 5 preview-specific tools missing: `list_preview_environments`, `get_preview_environment`, `get_preview_logs`, `delete_preview_environment`, `retry_preview_deployment`.

- **FR-013**: System MUST apply Kubernetes network policies to preview environment namespaces restricting network access to the namespace itself and auxiliary namespaces (e.g., image registry), preventing access to production namespaces

  > ⚠️ **PARTIALLY IMPLEMENTED**: NetworkPolicy creation planned in tasks.md T092 (Phase 9 Polish), implements research.md section 5 specifications.

- **FR-014**: System MUST track and expose metrics for deployment success/failure rate, deployment duration (p50/p95), active preview count, and resource utilization per namespace for operational monitoring

  > ❌ **NOT IMPLEMENTED**: No metrics collection or exposure. `projects.previewEnvironmentsCount` field exists but not actively used for monitoring.

- **FR-015**: System MUST implement exponential backoff with circuit breaker pattern for GitHub API operations to handle rate limit exhaustion gracefully, retrying after the rate limit reset window

  > ⚠️ **PARTIALLY IMPLEMENTED**: GitHub App token refresh exists (`web/src/lib/github-app/token-refresh.ts`) with rate limit awareness, but no circuit breaker pattern or exponential backoff for webhook operations.

- **FR-016**: System MUST monitor application health checks after Helm deployment; if health checks fail, mark the deployment as failed, post health check logs to the PR comment, and allow retry
  > ❌ **NOT IMPLEMENTED**: No health check monitoring after deployment (current implementation doesn't deploy applications, only builds images).

### Key Entities

- **Preview Environment**: Represents a deployed instance of a PR's code, including Kubernetes namespace, deployment status, public URL, resource usage metrics, and creation timestamp
- **Pull Request Event**: Webhook event from GitHub indicating PR opened, updated, closed, or synchronized with new commits
- **Deployment Log**: Container output from the preview environment, including stdout, stderr, timestamps, and container name for debugging

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can access a working preview environment within 3 minutes of opening a pull request

  > ⚠️ **PARTIALLY TESTABLE**: Infrastructure exists (namespace creation, pod jobs) but end-to-end workflow incomplete. Current implementation builds images but doesn't deploy applications with public URLs.

- **SC-002**: 95% of preview deployments succeed on the first attempt without manual intervention

  > ❌ **NOT MEASURABLE**: No tracking mechanism exists for deployment success/failure rates. `pull_request_pods` table needed for lifecycle tracking.

- **SC-003**: Developers can view container logs in the UI without SSH access or kubectl commands

  > ⚠️ **PARTIALLY ACHIEVABLE**: Log retrieval functions exist (`web/src/lib/k8s-pods.ts:getPodLogs()`), but no UI pages or Actions layer to surface them. Backend capability present, frontend missing.

- **SC-004**: Preview environments are automatically cleaned up within 5 minutes of PR closure, preventing resource waste

  > ✅ **ACHIEVABLE**: Cleanup implemented in webhook handler (route.ts:339-381). Namespace deletion and pod job cleanup triggered on `pull_request.closed` event.

- **SC-005**: AI agents can create, inspect, and delete preview environments via MCP tools with 100% functional parity to human UI

  > ⚠️ **FRAMEWORK READY, TOOLS MISSING**: MCP server framework operational (`web/src/app/api/mcp/route.ts`) with auth/tool registration, but 5 preview-specific tools not implemented. UI also missing, so parity cannot be measured.

- **SC-006**: System handles 50 concurrent preview environment deployments without performance degradation
  > ❓ **UNTESTED**: No concurrency controls, queueing, or load testing. Kubernetes Job limits exist (backoffLimit: 3, ttlSecondsAfterFinished: 3600) but system-level concurrency handling absent.

### Assumptions

- GitHub webhooks are already configured and functioning for pull request events
- Projects have valid Helm charts configured for deployment
- Kubernetes clusters have sufficient resources to support multiple concurrent preview environments
- Pull request pods have appropriate RBAC permissions to create namespaces and deploy resources
- Public URLs are accessible via configured ingress controller (e.g., nginx-ingress, Traefik)
- Developers have GitHub OAuth authentication configured to view preview environment pages in Catalyst UI

### Dependencies

- GitHub App integration for webhook authentication and token management
- Kubernetes client library for namespace and resource management
- Existing pull request pod infrastructure with deployment permissions
- Ingress controller for exposing public URLs
- Drizzle ORM for persisting preview environment state

## Implementation Status

### ✅ Implemented Infrastructure

The following building blocks already exist in the codebase:

- **Kubernetes Client**: `web/src/lib/k8s-client.ts` - Full K8s API client with cluster config management
- **Pull Request Pod Jobs**: `web/src/lib/k8s-pull-request-pod.ts` (687 lines) - Complete Job-based deployment system with:
  - Service account + RBAC creation (`createBuildxServiceAccount()`)
  - GitHub PAT secret management (`createGitHubPATSecret()`)
  - Docker buildx integration for image building
  - Job status checking (`getPullRequestPodJobStatus()`)
  - Cleanup operations (`cleanupPullRequestPodJob()`)
- **Namespace Management**: `web/src/lib/k8s-namespaces.ts`, `web/src/actions/kubernetes.ts` - Create/delete operations
- **Pod Operations**: `web/src/lib/k8s-pods.ts` - Log retrieval and pod management functions
- **Webhook Handler**: `web/src/app/api/github/webhook/route.ts` - Handles PR `opened` and `closed` events (lines 264-381)
- **Pull Request Tracking**:
  - Database schema: `web/src/db/schema.ts` (`pullRequests` table with provider-agnostic design)
  - Models layer: `web/src/models/pull-requests.ts` (upsert, query operations)
  - Actions layer: `web/src/actions/pull-requests.ts`, `web/src/actions/pull-requests-db.ts`
- **MCP Server Framework**: `web/src/app/api/mcp/route.ts` - Authentication, tool registration, and JSON-RPC handling ready
- **Test Factories**: `web/__tests__/factories/pull-request.factory.ts` - Factory for `pullRequests` table

### ⚠️ Partially Implemented

- **Database Schema**: `pullRequests` table exists, but **`pull_request_pods` table missing** (no deployment lifecycle tracking with status, namespace, publicUrl, etc.)
- **Webhook Events**: Handles `opened` and `closed`, but **missing `synchronize` event** for redeployments on new commits
- **GitHub Comments**: Posts basic "hello from catalyst" comment (webhook/route.ts:272-278), but **missing structured status updates** with URL/logs/deployment status
- **Preview Counting**: `projects.previewEnvironmentsCount` field exists with `incrementPreviewCount()` function in models layer
- **Environment Management**: `web/src/actions/environments.ts` handles environment types including "preview", but no preview-specific deployment logic

### ❌ Not Implemented (Requires New Code)

- **Helm Deployment**: Current implementation uses Kubernetes **Jobs** for Docker image builds (`web/src/lib/k8s-pull-request-pod.ts`), NOT Helm for application deployment (FR-002)
- **Models Layer**: `web/src/models/preview-environments.ts` - Business logic orchestration doesn't exist
  - Missing: `createPreviewDeployment()`, `watchDeploymentStatus()`, `getPreviewPodLogs()`, `deletePreviewDeployment()`, `retryFailedDeployment()`
- **Actions Layer**: `web/src/actions/preview-environments.ts` - UI delegation layer doesn't exist
  - Missing: `getPreviewEnvironments()`, `getPreviewEnvironment()`, `getPodLogs()`, `retryDeployment()`, `deletePreviewEnvironment()`
- **NetworkPolicy**: Namespace isolation (FR-013) - No NetworkPolicy manifest creation
- **Resource Quotas**: Per-namespace limits (FR-010) - No ResourceQuota manifest creation
- **UI Pages**: Preview environment list/detail views - No pages in `web/src/app/(dashboard)/`
- **MCP Tools**: 5 preview environment tools missing from MCP server (FR-012):
  - `list_preview_environments`, `get_preview_environment`, `get_preview_logs`, `delete_preview_environment`, `retry_preview_deployment`
- **Deployment Status Tracking**: No Kubernetes Watch API integration for real-time status updates
- **Comment Upsert Pattern**: GitHub comment updates in-place (research.md section 4) not implemented
- **Cleanup Agent**: TTL-based stale environment removal (research.md section 2) - No periodic agent
- **Tests**:
  - Missing factory for `pull_request_pods` table (table doesn't exist yet)
  - No E2E tests for full PR preview workflow (`web/__tests__/e2e/preview-environments.spec.ts`)
  - No integration tests for deployment orchestration

### Architecture Decision: Hybrid Build + Deploy Approach

**Chosen Strategy**: Option C - Hybrid approach

- **Build Phase**: Use existing Kubernetes Jobs (`k8s-pull-request-pod.ts`) for Docker image building with buildx
- **Deploy Phase**: Add Helm chart deployment using built image from previous step

**Implementation**:

1. Job completes and pushes image to registry (existing functionality)
2. Helper function `deployHelmChart()` deploys application using Helm with image tag from Job
3. Namespace already created by existing webhook handler

**Benefits**: Preserves 687 lines of working build infrastructure while adding Helm for application deployment (FR-002 compliance)

**Impact**: ~65-70% of the specification requires new implementation. The existing infrastructure (K8s client, webhooks, PR tracking) provides a solid foundation but the core deployment orchestration and lifecycle tracking are missing.

## Design Considerations for Future Extensions

### Devcontainer Support (Out of Scope - Future Work)

While not part of this initial specification, the preview environment architecture should be designed with future devcontainer support in mind. This would enable preview environments to serve as full interactive development environments for both humans and AI agents.

**Future Capabilities:**

- SSH access to preview environment containers for interactive development
- Port forwarding to enable local IDE connections (VS Code Remote, JetBrains Gateway)
- Devcontainer configuration support for standardized development environments
- AI agent access to development containers via SSH for autonomous coding workflows

**Architectural Implications for Current Design:**

- Preview environment containers should expose SSH ports (even if not immediately used)
- Namespace security policies should anticipate future SSH access requirements
- Container images should be structured to support both runtime and development modes
- Resource quotas should account for potential interactive development workloads

**Why Out of Scope:**
The initial preview environment deployment must focus on core deployment functionality (P1 user story). Adding interactive development support adds significant complexity around authentication, session management, and security that would delay delivery of core value. However, designing the architecture to accommodate this future use case ensures we don't create technical debt.

### Open Questions



None - all critical decisions have reasonable defaults based on existing Catalyst architecture and industry standards.
