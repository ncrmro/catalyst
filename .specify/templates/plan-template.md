# Implementation Plan: [FEATURE_NAME]

**Date:** [YYYY-MM-DD]
**Author:** [AUTHOR_NAME]
**Related Spec:** [Link to spec.md if exists]

## Overview

[Brief 1-2 sentence description of what will be implemented]

## Constitution Alignment Check

Before proceeding, verify alignment with constitutional principles:

- [ ] **Agentic-First Design:** Will this feature be accessible via MCP server?
- [ ] **Fast Feedback Loops:** Does this maintain/improve CI/preview environment performance?
- [ ] **Deployment Portability:** Does this rely only on open standards (K8s, Helm, Docker)?
- [ ] **Security by Default:** Are credentials encrypted? Is RBAC enforced?
- [ ] **Test-Driven Quality:** Are unit tests (>80%) and E2E tests planned?
- [ ] **Layered Architecture:** Does this respect Actions/Models/Database boundaries?

**Violations:** [List any principle violations with justification, or state "None"]

## Implementation Phases

### Phase 1: [Phase Name]

**Goal:** [What this phase achieves]

**Tasks:**
1. [Specific task]
2. [Specific task]

**Deliverables:**
- [Concrete output]
- [Concrete output]

**Success Criteria:**
- [Measurable criterion]
- [Measurable criterion]

### Phase 2: [Phase Name]

**Goal:** [What this phase achieves]

**Tasks:**
1. [Specific task]
2. [Specific task]

**Deliverables:**
- [Concrete output]

**Success Criteria:**
- [Measurable criterion]

## Architecture Changes

### Database Schema Changes

[Describe new tables, columns, indexes, or state "None"]

```sql
-- Example migration
ALTER TABLE projects ADD COLUMN deployment_config JSONB;
```

### API Changes

[Describe new endpoints, MCP tools, or state "None"]

**New MCP Tools:**
- `tool_name`: [Description]

**New REST Endpoints:**
- `POST /api/resource`: [Description]

### Layer Modifications

**Actions Layer:**
- [Changes to server components/actions]

**Models Layer:**
- [New business logic functions]

**Database Layer:**
- [Schema/migration changes]

## Dependencies

**External:**
- [npm packages, services, APIs]

**Internal:**
- [Other features/components this depends on]

**Blockers:**
- [Any blockers or prerequisite work]

## Testing Strategy

### Unit Tests

**Coverage Target:** >80%

**Key Test Scenarios:**
1. [Scenario]
2. [Scenario]

### Integration Tests

**Scenarios:**
1. [Database operation scenario]
2. [API endpoint scenario]

### E2E Tests

**User Workflows:**
1. [End-to-end workflow]
2. [End-to-end workflow]

## Rollout Plan

### Development

1. [Step]
2. [Step]

### Staging

1. [Validation step]
2. [Validation step]

### Production

1. [Deployment step]
2. [Monitoring/verification step]

**Rollback Plan:** [Describe rollback procedure if issues arise]

## Monitoring & Observability

**Metrics to Track:**
- [Metric name]: [Purpose]
- [Metric name]: [Purpose]

**Alerts to Configure:**
- [Alert condition]: [Action]

**Logs to Add:**
- [Log point]: [Information captured]

## Documentation Updates

- [ ] Update README.md if user-facing changes
- [ ] Update API documentation
- [ ] Update MCP tool documentation
- [ ] Update architecture diagrams if applicable

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk description] | Low/Med/High | Low/Med/High | [Mitigation strategy] |

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | [X days] | [Dependencies] |
| Phase 2 | [X days] | Phase 1 |
| **Total** | **[X days]** | |

## Open Questions

1. [Question requiring resolution before implementation]
2. [Question requiring resolution]

**Resolution Deadline:** [Date by which questions must be answered]

---

**Plan Status:** [Draft / Approved / In Progress / Completed]
**Last Updated:** [YYYY-MM-DD]
