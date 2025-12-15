# Implementation Plan: PR Preview Environment Deployment

**Branch**: `001-pr-preview-environments` | **Date**: 2025-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pr-preview-environments/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Automatically deploy isolated preview environments for every pull request in configured repositories, providing developers with instant feedback on how their changes behave in a production-like Kubernetes environment. The system processes GitHub webhook events, creates dedicated namespaces, deploys using Helm charts, and posts public URLs as PR comments. Developers can inspect deployment status and logs through the Catalyst UI without requiring kubectl access.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15.4.6, React 19.1.0
**Primary Dependencies**: Next.js, Drizzle ORM (PostgreSQL), @kubernetes/client-node, @octokit/rest, Helm (external), Vitest, Playwright
**Storage**: PostgreSQL (existing schema includes `repos`, `projects`, `pullRequests` tables; needs `pullRequestPods` table for deployment state)
**Testing**: Vitest (unit/integration), Playwright (E2E), @testing-library/react (components), factories via Fishery
**Target Platform**: Linux server (Next.js SSR), Kubernetes cluster (deployment target)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: Deploy preview environment within 3 minutes of PR creation, support 50 concurrent deployments without degradation
**Constraints**: <200ms p95 for GitHub webhook processing, Kubernetes API rate limits, GitHub API rate limits (5000/hour for authenticated apps)
**Scale/Scope**: 50 concurrent preview environments, 10+ projects, 100+ PRs/day, support multi-cluster deployments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle 1: Agentic-First Design ✅
**Rule:** All features MUST be accessible via MCP server

**Status:** COMPLIANT
- FR-012 requires MCP tools for preview environment management
- Deployment operations will be exposed via `/api/mcp` endpoint
- All human UI features built on same APIs agents use

**Action:** Design MCP tools for create/inspect/delete operations in Phase 1

### Principle 2: Fast Feedback Loops ✅
**Rule:** CI/CD pipelines MUST run in same environment as preview deployments

**Status:** COMPLIANT
- FR-001 requires deployment within 3 minutes of PR creation
- Preview environments use same Kubernetes cluster as CI
- Automatic redeployment on commit push (FR-007)

**Action:** Verify performance goals in Phase 1 design

### Principle 3: Deployment Portability ✅
**Rule:** Must use open standards (Kubernetes, Helm, Docker)

**Status:** COMPLIANT
- FR-002 requires Helm chart deployment
- FR-001 uses standard Kubernetes namespaces
- No vendor-specific APIs (uses @kubernetes/client-node)

**Action:** None required

### Principle 4: Security by Default ✅
**Rule:** Tokens encrypted, OAuth 2.0, RBAC at database layer

**Status:** COMPLIANT
- GitHub tokens already encrypted (existing `githubUserTokens` table)
- FR-013 requires network policies for namespace isolation
- Existing NextAuth.js OAuth implementation

**Action:** Design network policy specifications in Phase 1

### Principle 5: Test-Driven Quality ✅
**Rule:** >80% coverage, E2E tests for workflows

**Status:** COMPLIANT
- Testing infrastructure exists (Vitest, Playwright)
- Factories via Fishery for test data
- E2E tests required for user stories

**Action:** Design test strategy in Phase 1

### Principle 6: Layered Architecture Discipline ✅
**Rule:** Actions → Models → Database separation

**Status:** COMPLIANT
- Webhook handling in Actions layer (web/src/actions)
- Deployment logic in Models layer (web/src/models)
- Database schema changes via Drizzle migrations

**Action:** Verify layer boundaries in Phase 1 contracts

**GATE RESULT: ✅ PASS** - No violations detected. All constitutional principles satisfied.

---

## Post-Design Constitution Re-Evaluation

*Performed after Phase 1 completion (2025-01-08)*

### Verification Results

**Principle 1: Agentic-First Design ✅**
- MCP tools implemented in `contracts/mcp-api.md`:
  - `list_preview_environments` - List and filter preview environments
  - `get_preview_environment` - Get detailed pod status
  - `deploy_preview_environment` - Trigger manual deployment
  - `delete_preview_environment` - Clean up preview environment
  - `get_preview_logs` - Retrieve container logs
- All tools use same Models layer APIs as human UI

**Principle 2: Fast Feedback Loops ✅**
- Deployment workflow designed for <3 minute deployment (research.md §2)
- Async webhook processing prevents blocking (contracts/webhook-api.md)
- Helm --wait flag ensures deployment readiness (research.md §2)

**Principle 3: Deployment Portability ✅**
- Helm chart-based deployment (no vendor lock-in)
- Standard Kubernetes resources (Namespace, NetworkPolicy, ResourceQuota)
- Compatible with any Kubernetes cluster (research.md §4)

**Principle 4: Security by Default ✅**
- NetworkPolicy enforces namespace isolation (data-model.md §4, research.md §5)
- GitHub tokens use existing encryption (research.md §3)
- RBAC at database layer via team membership checks (contracts/models-api.md)

**Principle 5: Test-Driven Quality ✅**
- Test strategy defined in quickstart.md §Testing
- Factory pattern for test data (contracts/models-api.md references)
- E2E tests cover all user stories (quickstart.md §Testing)

**Principle 6: Layered Architecture Discipline ✅**
- Actions layer: webhook handlers (contracts/actions-api.md)
- Models layer: business logic (contracts/models-api.md)
- Database layer: schema definition (data-model.md)
- Clear separation maintained throughout design

**FINAL GATE RESULT: ✅ PASS** - All constitutional principles verified in design artifacts.

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
web/
├── src/
│   ├── actions/                      # Next.js Server Actions (boundary layer)
│   │   └── pull-request-pods.ts      # Webhook handler for PR events (NEW)
│   ├── models/                       # Business logic and complex queries
│   │   └── pull-request-pods.ts      # Deployment orchestration logic (NEW)
│   ├── db/                           # Database layer
│   │   ├── schema.ts                 # Add pullRequestPods table (MODIFY)
│   │   └── migrations/               # Generated migration files (NEW)
│   ├── lib/                          # Utilities and clients
│   │   ├── kubernetes.ts             # Kubernetes client wrapper (EXISTS)
│   │   ├── github.ts                 # GitHub API client (EXISTS)
│   │   └── helm.ts                   # Helm deployment wrapper (NEW)
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── webhooks/github/route.ts  # GitHub webhook endpoint (EXISTS)
│   │   │   └── mcp/route.ts          # MCP server endpoint (EXISTS)
│   │   └── projects/[id]/prs/[prId]/ # Preview environment UI page (NEW)
│   └── components/                   # React components
│       └── PreviewEnvironmentStatus.tsx  # Deployment status component (NEW)
└── __tests__/
    ├── unit/
    │   └── models/pull-request-pods.test.ts  # Model logic tests (NEW)
    ├── integration/
    │   └── actions/pull-request-pods.test.ts # Webhook integration tests (NEW)
    ├── components/
    │   └── PreviewEnvironmentStatus.test.tsx # Component tests (NEW)
    ├── e2e/
    │   └── preview-environments.spec.ts      # E2E workflow tests (NEW)
    └── factories/
        └── pull-request-pod.ts       # Test data factory (NEW)
```

**Structure Decision**: Web application (Next.js full-stack). This feature extends the existing Next.js application in `web/` following the established layered architecture pattern documented in `web/src/actions/README.md`, `web/src/models/README.md`, and `web/src/db/README.md`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations detected. This section is not applicable.
