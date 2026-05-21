<!--
Sync Impact Report:
Version change: none → 1.0.0 (Initial constitution)
Modified principles: N/A (initial creation)
Added sections: All (initial creation)
Removed sections: N/A
Templates status:
  ✅ plan-template.md (created)
  ✅ spec-template.md (created)
  ✅ tasks-template.md (created)
  ✅ .specify/README.md (created)
  ⚠ commands/*.md (to be created as needed)
Follow-up TODOs:
  - Create SpecKit command files in .specify/templates/commands/ as they are used
  - Update CLAUDE.md to reference .specify/ system
-->

# Catalyst Project Constitution

**Version:** 1.0.0
**Ratification Date:** 2025-01-08
**Last Amended:** 2025-01-08

## Purpose

This constitution establishes the foundational principles, architectural standards, and governance rules for the Catalyst project. Catalyst is a development platform designed to accelerate software delivery through opinionated deployments, CI/CD pipelines, and agentic workflows. This document serves as the source of truth for all technical and process decisions.

## Core Principles

### Principle 1: Agentic-First Design

**Rule:** All features MUST be designed to be accessible and usable by AI agents via the MCP (Model Context Protocol) server. Human interfaces are secondary to programmatic interfaces.

**Rationale:** Catalyst's mission is to enable autonomous agent workflows. Every capability—from deploying environments to inspecting services—must be agent-accessible. This principle ensures the platform evolves as an agent-first tool, not a human-first tool with agent capabilities bolted on.

**Implications:**
- All API endpoints MUST be exposed through the MCP server
- Documentation MUST include MCP tool usage examples
- Agent personas MUST be considered in feature design
- Human UIs are built on top of the same APIs agents use

### Principle 2: Fast Feedback Loops

**Rule:** CI/CD pipelines MUST run in the same environment as preview deployments. Feedback on pull requests MUST be provided within minutes, not hours.

**Rationale:** Developer velocity depends on tight feedback loops. By co-locating CI execution with preview environments, we eliminate environment discrepancies and reduce latency. This principle prioritizes speed without sacrificing accuracy.

**Implications:**
- Preview environments MUST include CI infrastructure
- Test execution MUST be parallelizable
- Resource quotas MUST support concurrent PR environments
- Build caching MUST be implemented at multiple layers

### Principle 3: Deployment Portability

**Rule:** All deployment infrastructure MUST be based on open standards (Kubernetes, Helm, Docker). Vendor lock-in is prohibited.

**Rationale:** Catalyst must be deployable anywhere—managed cloud, self-hosted infrastructure, or air-gapped environments. Open standards ensure users maintain control and can migrate without rewriting their configurations.

**Implications:**
- No proprietary cloud APIs in core deployment logic
- Helm charts MUST be the deployment mechanism
- Kubernetes manifests MUST be vendor-neutral
- Cloud-specific features MUST be optional add-ons

### Principle 4: Security by Default

**Rule:** All tokens, credentials, and sensitive configuration MUST be encrypted at rest using AES-256-GCM. Authentication MUST use industry-standard OAuth 2.0 flows. Role-based access control MUST be enforced at the database layer.

**Rationale:** Security is not optional. By embedding security into the architecture—encrypted storage, strong authentication, database-level authorization—we prevent entire classes of vulnerabilities before they occur.

**Implications:**
- Token encryption MUST use the `TOKEN_ENCRYPTION_KEY` environment variable
- Database queries MUST filter by user/team ownership
- GitHub tokens MUST be refreshed automatically before expiration
- Secrets MUST never appear in logs or error messages

### Principle 5: Test-Driven Quality

**Rule:** All business logic MUST have unit tests with >80% coverage. All user workflows MUST have end-to-end tests. Changes that decrease coverage MUST NOT be merged.

**Rationale:** High test coverage is the foundation of maintainability and refactorability. Unit tests document behavior, prevent regressions, and enable confident refactoring. E2E tests validate real-world workflows.

**Implications:**
- Models layer MUST be unit tested with factories
- Actions layer MUST have integration tests
- E2E tests MUST use Playwright with mocked GitHub data
- CI MUST fail on coverage decreases

### Principle 6: Layered Architecture Discipline

**Rule:** The codebase MUST maintain strict separation between layers: Actions (boundary), Models (business logic), Database (persistence). Business logic MUST NOT reside in Actions. Actions MUST NOT directly query the database.

**Rationale:** Separation of concerns ensures testability, maintainability, and scalability. The Actions layer handles React Server Components and input validation. The Models layer contains all complex queries and business logic. The Database layer defines schemas and migrations. Violating these boundaries creates technical debt.

**Implications:**
- Actions MUST delegate to Models for business logic
- Models MUST use the Database layer for all queries
- Each layer MUST have its own README.md documenting patterns
- Code reviews MUST enforce layer boundaries

## Governance

### Amendment Procedure

1. Proposed amendments MUST be submitted as pull requests with rationale
2. Amendments MUST increment `CONSTITUTION_VERSION` according to semantic versioning:
   - **MAJOR**: Backward-incompatible governance changes or principle removals
   - **MINOR**: New principles or material expansions
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements
3. Amendments MUST update `LAST_AMENDED_DATE` to the merge date
4. Amendments MUST trigger updates to all dependent templates (plan, spec, tasks)
5. Amendments MUST be approved by project maintainers

### Versioning Policy

Constitution versions follow semantic versioning (MAJOR.MINOR.PATCH):
- Version changes MUST be documented in the Sync Impact Report comment
- Template updates MUST align with the constitution version
- Old versions MUST be archived in git history

### Compliance Review

- All pull requests MUST reference applicable constitutional principles in their description
- Architectural Decision Records (ADRs) MUST cite relevant principles
- Quarterly reviews MUST assess adherence to constitutional rules
- Violations MUST be documented and remediated within one sprint

## Definitions

- **Agent:** An AI-powered autonomous system that interacts with Catalyst via the MCP server
- **Preview Environment:** A temporary Kubernetes namespace containing a deployed PR's application and infrastructure
- **MCP Server:** Model Context Protocol endpoint at `/api/mcp` providing agent-accessible tools
- **Actions Layer:** Next.js React Server Components handling routing, validation, and delegation
- **Models Layer:** Business logic and complex database queries (in `src/models/`)
- **Database Layer:** Drizzle ORM schemas, migrations, and raw SQL when necessary

## Enforcement

This constitution is enforced through:
- Automated linting rules (ESLint, TypeScript)
- CI pipeline checks (test coverage, type safety)
- Code review guidelines (layer boundaries, security patterns)
- Template compliance (spec, plan, tasks templates reference principles)

Non-compliance discovered post-merge MUST be remediated immediately or rolled back.

---

**Living Document:** This constitution evolves with the project. Propose amendments via pull request.
