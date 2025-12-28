# Research & Decisions: Projects Management

**Feature**: `009-projects`
**Date**: 2025-12-25
**Status**: Completed

## 1. Needs Clarification Resolution

All clarifications were addressed in the spec phase or during initial setup. No major unknowns remain that block Phase 1.

## 2. Technology Choices

### Database Schema Extension
- **Decision**: Extend `web/src/db/schema.ts` with new tables (`projectAgents`, `projectSpecs`, `workItems`, `prioritizationRules`).
- **Rationale**: Keeps data model unified in the single Postgres instance. Drizzle ORM relations provide type-safe joins.
- **Alternatives**: Separate microservices DBs (rejected for MVP simplicity).

### Prioritization Logic
- **Decision**: Implement a customizable scoring engine in `src/lib/prioritization.ts`.
- **Rationale**: Allows separating business logic from database models. Easy to unit test.
- **Alternatives**: Hardcoded SQL queries (too rigid).

### Agent Integration
- **Decision**: Use existing MCP server pattern in `src/app/api/mcp/route.ts`.
- **Rationale**: Aligns with "Agentic-First Design" constitution principle.
- **Alternatives**: Custom REST API for agents (violates principle).

### VCS Integration
- **Decision**: Start with GitHub (MVP), plan for generic provider interface.
- **Rationale**: Spec FR-014 prioritizes GitHub.
- **Alternatives**: Build all providers at once (too much scope for MVP).

## 3. Patterns

### Feature/Platform Work Separation
- **Pattern**: Distinct UI sections in Dashboard.
- **Implementation**: Filter `workItems` by type/category at the query level.

### Spec Indexing
- **Pattern**: Webhook-driven sync.
- **Implementation**: Listen for push events, parse `.spec.md` files, update `projectSpecs` table.