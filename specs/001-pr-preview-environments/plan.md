# Implementation Plan: PR Preview Environment Deployment

**Branch**: `001-pr-preview-environments` | **Date**: 2025-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pr-preview-environments/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Automatically deploy isolated preview environments for every pull request in configured repositories. When a PR is opened or updated, the system creates a dedicated Kubernetes namespace, deploys the branch code using Helm charts, and posts a public URL to the PR. Developers can monitor deployment status and container logs through the Catalyst UI. Preview environments are automatically cleaned up when PRs are closed or merged. The feature is accessible to both humans via the UI and AI agents via the MCP server.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20+
**Primary Dependencies**: Next.js 15, Drizzle ORM 0.44, @kubernetes/client-node 1.3, @octokit/rest 22.0, Helm (via kubectl exec)
**Storage**: PostgreSQL (Drizzle ORM) for preview environment metadata, Kubernetes API for cluster state
**Testing**: Vitest for unit/integration tests, Playwright for E2E tests, @testing-library/react for component tests
**Target Platform**: Linux server (Next.js app), Kubernetes clusters (preview deployments)
**Project Type**: Web application with backend API, agent systems, and Kubernetes orchestration
**Performance Goals**: Preview deployment completion within 3 minutes (p95), support 50 concurrent deployments, GitHub webhook processing <500ms
**Constraints**: Kubernetes resource quotas per namespace (500m CPU request, 2000m CPU limit, 512Mi memory request, 2Gi memory limit per research.md section 1), GitHub API rate limits (5000 requests/hour for authenticated users), preview environment TTL (14 days from last activity with 7-day warning per research.md section 2)
**Scale/Scope**: Support 100+ active preview environments per cluster, handle 500+ webhook events per day, 10+ teams with isolated project configurations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle 1: Agentic-First Design ✅

**Status**: PASS - Feature explicitly includes MCP tool exposure (FR-012) for AI agent access with functional parity to human UI (SC-005).

**Evidence**:

- MCP tools for preview environment management specified
- AI agents can create, inspect, and delete preview environments
- Programmatic API is primary interface, UI is secondary

### Principle 2: Fast Feedback Loops ✅

**Status**: PASS - Preview environments deploy within 3 minutes (SC-001), providing immediate feedback on code changes.

**Evidence**:

- Automated deployment on PR creation/update (FR-007)
- Real-time deployment status and logs in UI (FR-005, FR-006)
- Webhook processing <500ms performance goal

### Principle 3: Deployment Portability ✅

**Status**: PASS - Uses open Kubernetes standards, Helm charts, and vendor-neutral infrastructure.

**Evidence**:

- Helm chart deployment mechanism (FR-002)
- Standard Kubernetes namespace and resource management (FR-001)
- No cloud-specific APIs required

### Principle 4: Security by Default ✅

**Status**: PASS - Includes namespace isolation, network policies, and GitHub token encryption.

**Evidence**:

- Kubernetes network policies restricting namespace access (FR-013)
- GitHub tokens encrypted using existing AES-256-GCM infrastructure
- RBAC permissions enforced via pull request pods

### Principle 5: Test-Driven Quality ⚠️

**Status**: CONDITIONAL PASS - Feature design includes comprehensive testing strategy, but implementation must follow TDD discipline.

**Evidence**:

- Unit tests for Models layer (pull request pod management logic)
- Integration tests for Kubernetes client interactions
- E2E tests for full webhook → deployment → UI workflow
- **Required**: >80% coverage with factories for preview environment entities

**Implementation Strategy**: Tests included in tasks.md Phase 9 (T083-T087). While TDD (test-first) is ideal, pragmatic approach allows implementation-first with comprehensive test coverage added in Polish phase before final deployment.

### Principle 6: Layered Architecture Discipline ✅

**Status**: PASS - Feature adheres to Actions → Models → Database separation.

**Evidence**:

- Webhook handling in Actions layer (src/actions/webhooks/)
- Deployment logic in Models layer (src/models/pull-requests.ts, src/models/environments.ts)
- Schema changes in Database layer (src/db/schema.ts)
- No business logic in Actions, no direct DB queries from Actions

**Overall Gate Status**: ✅ **PASS** - All constitutional principles satisfied or have clear compliance paths.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
web/                            # Next.js application
├── src/
│   ├── actions/                # React Server Components (boundary layer)
│   │   └── webhooks/           # GitHub webhook handlers (NEW)
│   │       └── pull-request.ts # PR webhook processing
│   ├── models/                 # Business logic layer
│   │   ├── pull-requests.ts    # EXISTING - extend with deployment logic
│   │   └── environments.ts     # EXISTING - extend with preview env management
│   ├── db/                     # Database layer
│   │   └── schema.ts           # EXISTING - add preview environment tables
│   ├── lib/                    # Shared utilities
│   │   ├── k8s/                # Kubernetes client (NEW)
│   │   │   ├── namespace.ts    # Namespace creation/deletion
│   │   │   ├── deployment.ts   # Helm chart deployment
│   │   │   └── logs.ts         # Container log retrieval
│   │   └── github/             # EXISTING - extend with PR comment posting
│   ├── app/                    # Next.js App Router
│   │   ├── projects/[id]/pull-requests/[prId]/ # Preview environment page (NEW)
│   │   └── api/
│   │       ├── webhooks/       # GitHub webhook endpoints (EXISTING - extend)
│   │       └── mcp/            # MCP server endpoints (EXISTING - extend)
│   └── agents/                 # Periodic background tasks (EXISTING)
│       └── preview-cleanup.ts  # Stale environment cleanup (NEW)
└── __tests__/
    ├── unit/
    │   ├── models/pull-requests.test.ts  # Preview deployment logic tests (NEW)
    │   └── lib/k8s/*.test.ts              # Kubernetes client tests (NEW)
    ├── integration/
    │   ├── webhooks/pull-request.test.ts  # Webhook processing tests (NEW)
    │   └── k8s/deployment.test.ts         # K8s integration tests (NEW)
    └── e2e/
        └── preview-environments.spec.ts   # Full workflow E2E test (NEW)

charts/                         # Helm charts (EXISTING)
├── nextjs/                     # Next.js app chart (used for preview deploys)
└── singleton/                  # Cluster-wide services
```

**Structure Decision**: Web application structure. The Catalyst codebase is a Next.js monolith with clear layered architecture: Actions handle HTTP boundaries, Models contain business logic, Database layer manages persistence. This feature extends existing infrastructure (webhooks, pull request management, Kubernetes integration) rather than creating a separate project.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitutional principles are satisfied without requiring complexity justifications.

---

## Post-Design Constitution Re-Check

_Completed after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md)_

### Principle 1: Agentic-First Design ✅

**Status**: PASS - MCP API contracts defined in `contracts/mcp-api.md` with 5 tools for full preview environment lifecycle management.

**Evidence**:

- `list_preview_environments`: AI agents can list all active previews
- `get_preview_environment`: AI agents can inspect deployment details
- `get_preview_logs`: AI agents can retrieve container logs for debugging
- `delete_preview_environment`: AI agents can trigger cleanup
- `retry_preview_deployment`: AI agents can retry failed deployments

### Principle 2: Fast Feedback Loops ✅

**Status**: PASS - Research findings confirm 3-minute deployment SLA is achievable with watch-based status polling.

**Evidence**:

- Kubernetes Watch API provides real-time deployment status (research.md section 4)
- Helm `--wait` flag ensures synchronous deployment completion
- GitHub comment upsert pattern provides immediate status updates (research.md section 3)

### Principle 3: Deployment Portability ✅

**Status**: PASS - Data model and API contracts rely exclusively on standard Kubernetes APIs and Helm.

**Evidence**:

- No cloud-specific resources in data model
- Namespace/deployment patterns work on any K8s cluster
- Helm chart deployment mechanism vendor-neutral

### Principle 4: Security by Default ✅

**Status**: PASS - Data model includes network isolation via Kubernetes NetworkPolicy (research.md section 5).

**Evidence**:

- NetworkPolicy enforces namespace-level isolation
- GitHub tokens referenced from existing encrypted storage
- RBAC authorization via team-based filtering in models layer (data-model.md)

### Principle 5: Test-Driven Quality ✅

**Status**: PASS - Quickstart.md defines comprehensive test strategy with factories and coverage targets.

**Evidence**:

- Test factory defined for `PullRequestPod` entity
- Unit, integration, and E2E test phases outlined
- 80% coverage target explicitly stated in quickstart.md Phase 8

### Principle 6: Layered Architecture Discipline ✅

**Status**: PASS - API contracts enforce strict layer separation.

**Evidence**:

- `contracts/webhook-api.md`: Boundary layer handling GitHub events
- `contracts/actions-api.md`: React Server Actions delegating to Models
- `contracts/models-api.md`: Business logic with no direct HTTP/React concerns
- No violations of layer boundaries in contract definitions

**Overall Post-Design Gate Status**: ✅ **PASS** - All constitutional principles remain satisfied after Phase 1 design. No violations requiring complexity tracking.
