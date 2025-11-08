# Tasks: [FEATURE_NAME]

**Date:** [YYYY-MM-DD]
**Related Spec:** [Link to spec.md]
**Related Plan:** [Link to plan.md]

## Task Categorization

Tasks are organized by architectural layer and constitutional principle to ensure systematic implementation.

### Constitutional Alignment Tasks

These tasks ensure adherence to core principles:

- [ ] **Agentic-First:** Add MCP tools for agent access
  - Dependencies: None
  - Estimate: [X hours]

- [ ] **Security by Default:** Implement token encryption
  - Dependencies: None
  - Estimate: [X hours]

- [ ] **Test-Driven Quality:** Write unit tests (>80% coverage)
  - Dependencies: Business logic implementation
  - Estimate: [X hours]

### Database Layer Tasks

Schema, migrations, and persistence:

- [ ] **[DB-1]** Create migration for `[table_name]` table
  - File: `src/db/migrations/XXXXXX_add_table.ts`
  - Dependencies: None
  - Estimate: [X hours]

- [ ] **[DB-2]** Add indexes for performance
  - File: `src/db/migrations/XXXXXX_add_indexes.ts`
  - Dependencies: DB-1
  - Estimate: [X hours]

- [ ] **[DB-3]** Update schema exports in `src/db/schema.ts`
  - Dependencies: DB-1
  - Estimate: [X hours]

### Models Layer Tasks

Business logic and complex queries:

- [ ] **[MODEL-1]** Implement `[modelFunction]` in `src/models/[domain].ts`
  - Purpose: [What business logic this encapsulates]
  - Dependencies: DB-1, DB-3
  - Estimate: [X hours]

- [ ] **[MODEL-2]** Add error handling and validation
  - Dependencies: MODEL-1
  - Estimate: [X hours]

- [ ] **[MODEL-3]** Write unit tests with factories
  - File: `__tests__/models/[domain].test.ts`
  - Dependencies: MODEL-1, MODEL-2
  - Estimate: [X hours]

### Actions Layer Tasks

React Server Components, routing, input validation:

- [ ] **[ACTION-1]** Create server action `[actionName]` in `src/actions/[domain].ts`
  - Purpose: [What this action handles]
  - Dependencies: MODEL-1
  - Estimate: [X hours]

- [ ] **[ACTION-2]** Add input validation using Zod
  - Dependencies: ACTION-1
  - Estimate: [X hours]

- [ ] **[ACTION-3]** Write integration tests for action
  - File: `__tests__/actions/[domain].test.ts`
  - Dependencies: ACTION-1, ACTION-2
  - Estimate: [X hours]

### MCP Server Tasks

Agent-accessible tools:

- [ ] **[MCP-1]** Define MCP tool schema in `src/app/api/mcp/tools.ts`
  - Tool Name: `[tool_name]`
  - Dependencies: MODEL-1
  - Estimate: [X hours]

- [ ] **[MCP-2]** Implement tool handler
  - Dependencies: MCP-1, ACTION-1
  - Estimate: [X hours]

- [ ] **[MCP-3]** Add tool documentation and examples
  - File: Update MCP README or docs
  - Dependencies: MCP-2
  - Estimate: [X hours]

### UI Tasks (if applicable)

Frontend components and pages:

- [ ] **[UI-1]** Create component `[ComponentName]` in `src/components/[domain]/`
  - Dependencies: ACTION-1
  - Estimate: [X hours]

- [ ] **[UI-2]** Add client-side state management (if needed)
  - Dependencies: UI-1
  - Estimate: [X hours]

- [ ] **[UI-3]** Write component tests
  - File: `__tests__/components/[domain].test.tsx`
  - Dependencies: UI-1, UI-2
  - Estimate: [X hours]

### Testing Tasks

Comprehensive test coverage:

- [ ] **[TEST-1]** Unit tests: Models layer (>80% coverage)
  - Files: `__tests__/models/*.test.ts`
  - Dependencies: MODEL-*
  - Estimate: [X hours]

- [ ] **[TEST-2]** Integration tests: Actions + Database
  - Files: `__tests__/integration/*.test.ts`
  - Dependencies: ACTION-*, MODEL-*
  - Estimate: [X hours]

- [ ] **[TEST-3]** E2E tests: Complete user/agent workflows
  - Files: `__tests__/e2e/*.spec.ts`
  - Dependencies: All feature tasks
  - Estimate: [X hours]

- [ ] **[TEST-4]** Verify test coverage meets >80% threshold
  - Command: `npm run test:coverage`
  - Dependencies: TEST-1, TEST-2, TEST-3
  - Estimate: [X hours]

### Documentation Tasks

- [ ] **[DOC-1]** Update layer README if new pattern introduced
  - Files: `src/models/README.md`, `src/actions/README.md`
  - Dependencies: Feature complete
  - Estimate: [X hours]

- [ ] **[DOC-2]** Update MCP tool documentation
  - File: API docs or MCP README
  - Dependencies: MCP-3
  - Estimate: [X hours]

- [ ] **[DOC-3]** Update project README if user-facing
  - File: `web/README.md`
  - Dependencies: Feature complete
  - Estimate: [X hours]

### Deployment Tasks

- [ ] **[DEPLOY-1]** Update Helm chart if infrastructure changes
  - Files: `charts/*/`
  - Dependencies: Feature complete
  - Estimate: [X hours]

- [ ] **[DEPLOY-2]** Add environment variable documentation
  - File: `web/README.md` or `.env.example`
  - Dependencies: Feature complete
  - Estimate: [X hours]

- [ ] **[DEPLOY-3]** Test deployment in staging environment
  - Dependencies: DEPLOY-1, DEPLOY-2
  - Estimate: [X hours]

## Dependency Graph

```
DB-1 (Migration) → DB-3 (Schema exports) → MODEL-1 (Business logic)
                                         ↓
                                      ACTION-1 (Server action)
                                         ↓
                         MCP-1 (Tool schema) ← UI-1 (Component)
                                ↓
                             MCP-2 (Handler)
                                ↓
                   TEST-1, TEST-2, TEST-3 (Tests)
                                ↓
                      DOC-1, DOC-2, DOC-3 (Docs)
                                ↓
                   DEPLOY-1, DEPLOY-2, DEPLOY-3 (Deployment)
```

## Task Summary

| Category | Count | Total Estimate |
|----------|-------|----------------|
| Database | [X] | [X hours] |
| Models | [X] | [X hours] |
| Actions | [X] | [X hours] |
| MCP | [X] | [X hours] |
| UI | [X] | [X hours] |
| Testing | [X] | [X hours] |
| Documentation | [X] | [X hours] |
| Deployment | [X] | [X hours] |
| **Total** | **[X]** | **[X hours]** |

## Implementation Order

Recommended task execution order respecting dependencies:

1. DB-1 → DB-2 → DB-3 (Database foundation)
2. MODEL-1 → MODEL-2 (Business logic)
3. ACTION-1 → ACTION-2 (Server actions)
4. MCP-1 → MCP-2 (Agent tools) + UI-1 → UI-2 (If applicable, parallel)
5. TEST-1 → TEST-2 → TEST-3 → TEST-4 (Testing)
6. DOC-1 → DOC-2 → DOC-3 (Documentation)
7. DEPLOY-1 → DEPLOY-2 → DEPLOY-3 (Deployment)

## Progress Tracking

**Completed:** 0/[X]
**In Progress:** [Task IDs]
**Blocked:** [Task IDs with blocker description]

---

**Tasks Status:** [Not Started / In Progress / Completed]
**Last Updated:** [YYYY-MM-DD]
