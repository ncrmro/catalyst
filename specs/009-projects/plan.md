# Implementation Plan: Projects Management

**Branch**: `009-projects` | **Date**: 2025-12-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-projects/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Projects Management provides the foundational entity for Catalyst, enabling users to create and manage software projects that integrate with Git repositories, configure deployment environments, and leverage AI agents (Platform Agent, Project Agent, QA Agent) to automate platform work, prioritize tasks, and ensure quality. The system extends the existing database schema with project lifecycle states, agent configurations, spec tracking, and work item prioritization.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**: Next.js 15, NextAuth.js, Drizzle ORM, @kubernetes/client-node, Playwright
**Storage**: PostgreSQL with Drizzle ORM (existing database schema extends with project entities)
**Testing**: Vitest (unit/integration), Playwright (E2E), factory-based test data
**Target Platform**: Linux server (Docker/Kubernetes deployment)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**: Dashboard load <3s (SC-002), project creation <5min user flow (SC-001)
**Constraints**: Team-based access control required, MCP agent compatibility required
**Scale/Scope**: Multi-team, multi-project, integration with VCS providers (GitHub, GitLab, Gitea)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle 1: Agentic-First Design ✅

- **Rule**: All features MUST be accessible via MCP server
- **Compliance**: Projects CRUD, agent configuration, work prioritization, and spec management will be exposed as MCP tools
- **Deliverables**: MCP tools for `create_project`, `list_projects`, `get_project`, `configure_agent`, `get_prioritized_work`, `list_project_specs`

### Principle 2: Fast Feedback Loops ✅

- **Rule**: Feedback on pull requests MUST be provided within minutes
- **Compliance**: Dashboard displays prioritized work within 3 seconds (SC-002); agent status updates are real-time via webhook processing
- **Deliverables**: Optimized queries for work item aggregation, webhook handlers for agent task completion

### Principle 3: Deployment Portability ✅

- **Rule**: Infrastructure MUST be based on open standards (Kubernetes, Helm, Docker)
- **Compliance**: Project environments use existing Kubernetes operator pattern; no vendor lock-in
- **Deliverables**: Environment configuration stored in database, orchestrated via Environment CRs

### Principle 4: Security by Default ✅

- **Rule**: Credentials encrypted at rest, RBAC at database layer
- **Compliance**: Team-based access control for projects (existing pattern), agent tokens encrypted using existing token encryption infrastructure
- **Deliverables**: Project access queries filter by team membership, agent credentials use githubUserTokens encryption pattern

### Principle 5: Test-Driven Quality ✅

- **Rule**: Business logic MUST have >80% coverage, E2E for user workflows
- **Compliance**: Models layer unit tested with factories, Playwright E2E for project creation and dashboard workflows
- **Deliverables**: Factory for projects/agents, unit tests for priority algorithms, E2E for User Stories 1-2

### Principle 6: Layered Architecture Discipline ✅

- **Rule**: Strict separation between Actions (boundary), Models (logic), Database (persistence)
- **Compliance**: Following existing patterns in `src/actions/`, `src/models/`, `src/db/schema.ts`
- **Deliverables**: `src/models/projects.ts` (business logic), `src/actions/projects.ts` (server actions), schema extensions in `src/db/schema.ts`

## Project Structure

### Documentation (this feature)

```text
specs/009-projects/
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
│   ├── db/
│   │   └── schema.ts                    # Schema extensions (projectAgents, projectSpecs, workItems, prioritizationRules)
│   ├── models/
│   │   ├── projects.ts                  # Extended project business logic
│   │   ├── project-agents.ts            # Agent configuration and execution
│   │   ├── project-specs.ts             # Spec file indexing and sync
│   │   ├── work-items.ts                # Unified work item aggregation
│   │   └── prioritization.ts            # Priority calculation algorithms
│   ├── actions/
│   │   ├── projects.ts                  # Extended project server actions
│   │   ├── project-agents.ts            # Agent management actions
│   │   ├── project-specs.ts             # Spec management actions
│   │   └── dashboard.ts                 # Dashboard data actions
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 # Prioritized work dashboard
│   │   │   └── _components/
│   │   │       ├── WorkItemList.tsx     # Feature work section
│   │   │       ├── PlatformWorkSection.tsx  # Platform agent work
│   │   │       └── PriorityFilters.tsx  # Prioritization controls
│   │   ├── projects/
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Create project form
│   │   │   └── [slug]/
│   │   │       ├── page.tsx             # Project detail
│   │   │       ├── settings/
│   │   │       │   ├── page.tsx         # Project settings
│   │   │       │   └── agents/
│   │   │       │       └── page.tsx     # Agent configuration
│   │   │       └── specs/
│   │   │           └── page.tsx         # Spec file list
│   │   └── api/
│   │       └── mcp/
│   │           └── route.ts             # Extended MCP tools
│   ├── agents/
│   │   ├── platform-agent.ts            # Platform maintenance agent
│   │   ├── project-agent.ts             # Work prioritization agent
│   │   └── qa-agent.ts                  # Smoke test agent
│   └── lib/
│       └── prioritization.ts            # Prioritization rule engine
├── __tests__/
│   ├── factories/
│   │   ├── project-agent.ts             # Agent test factory
│   │   └── work-item.ts                 # Work item test factory
│   ├── unit/
│   │   ├── models/
│   │   │   ├── project-agents.test.ts
│   │   │   ├── prioritization.test.ts
│   │   │   └── work-items.test.ts
│   │   └── lib/
│   │       └── prioritization.test.ts
│   ├── integration/
│   │   └── actions/
│   │       ├── projects.test.ts
│   │       └── dashboard.test.ts
│   └── e2e/
│       ├── project-creation.spec.ts     # User Story 1
│       └── dashboard.spec.ts            # User Story 2
```

**Structure Decision**: Web application structure using Next.js App Router. Extends existing codebase in `web/` directory following layered architecture (schema → models → actions → pages). Agent implementations go in `src/agents/` following existing pattern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All principles pass compliance check.
