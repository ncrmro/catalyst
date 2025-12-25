# Research: Projects Management

**Feature Branch**: `009-projects`
**Date**: 2025-12-25

This document consolidates research findings for the Projects Management feature implementation.

## 1. AI Agent Architecture Patterns

### Decision

Implement AI agents as **Next.js server actions with scheduled webhook triggers**, using the Vercel AI SDK with provider abstraction (Anthropic Claude + OpenAI GPT), storing agent state in PostgreSQL, and exposing capabilities via MCP for agent-to-agent communication.

### Rationale

1. **Proven Pattern**: The existing `PeriodicReportAgent` in `web/src/agents/periodic-report.ts` demonstrates this architecture works
2. **Provider Abstraction**: Vercel AI SDK v5 provides unified interface across Claude (better reasoning) and GPT (faster inference)
3. **Server Actions Boundary**: Agents live at the server/database boundary, avoiding client exposure
4. **Structured Output**: Zod schemas ensure deterministic outputs parseable by other agents
5. **MCP Integration**: Allows agents to access tools and communicate with external services
6. **Database Persistence**: PostgreSQL tracks agent outputs for auditing and historical analysis

### Alternatives Considered

| Alternative                         | Rejected Because                                      |
| ----------------------------------- | ----------------------------------------------------- |
| Docker-based workers (Celery, Bull) | Higher complexity, requires additional infrastructure |
| External task services (AWS Lambda) | Vendor lock-in, additional cost                       |
| Simple setTimeout/setInterval       | No persistence, fails on process restart              |
| Single monolithic agent             | Violates SRP, hard to test individual capabilities    |

### Implementation Approach

**Task Queuing**: Use database-backed task queue with `projectAgentTasks` table:

- For scheduled agents: GitHub Actions or Vercel Cron triggers
- For immediate agents: Async processing via Next.js API routes
- Task states: `pending`, `running`, `completed`, `failed`

**Rate Limiting & Cost Management**:

- Configurable per-project, per-day execution limits
- Cost tracking per agent task (input/output tokens)
- Exponential backoff with jitter for API rate limits

---

## 2. Spec File Detection Patterns

### Decision

Implement **webhook-driven spec file detection with git tree polling fallback**, using filename patterns (RFC-\*, ADR-\*, spec.md, etc.), git diff analysis on webhook events, and a nightly polling job for missed files.

### Rationale

1. **Low Latency**: Webhook-driven detection provides near-instant spec file awareness
2. **Reliability**: Polling fallback catches webhooks missed due to downtime
3. **Standard Patterns**: Supports common spec conventions across teams
4. **Efficient**: Only analyzes changed files, not entire repositories

### Alternatives Considered

| Alternative              | Rejected Because                   |
| ------------------------ | ---------------------------------- |
| Polling-only             | 5-30min latency, high API costs    |
| Full repo re-indexing    | O(n) cost, doesn't scale           |
| Full-text search engines | Overkill for team-scale            |
| Git hooks on client      | Unreliable, requires user adoption |

### Implementation Approach

**Pattern Matching**:

```typescript
const SPEC_PATTERNS = {
  RFC: /^RFC-\d{3,5}.*\.(md|txt)$/i,
  ADR: /^ADR-\d{3,5}.*\.(md|txt)$/i,
  SPEC: /(^|\/)(spec|specification|SPEC)\.md$/i,
  PROPOSAL: /^PROPOSAL[_-].*\.(md|txt)$/i,
};
```

**Detection Flow**:

1. GitHub `push` webhook → analyze `added`/`modified` files
2. Match against spec patterns
3. Store in `projectSpecs` table with SHA and metadata
4. Nightly poll for repos with stale last-sync timestamps

**Metadata Extraction**:

- YAML frontmatter parsing (title, status, owner)
- GitHub issue reference extraction (#123)
- Linked PR detection

---

## 3. Work Item Prioritization Algorithms

### Decision

Implement a **multi-factor priority scoring system** with configurable weights per project, real-time recalculation on state changes, and rule conflict resolution via precedence hierarchy.

### Rationale

1. **Flexibility**: Configurable weights allow teams to tune priorities to their workflow
2. **Multi-dimensional**: Captures impact, effort, urgency, alignment, and risk
3. **Dynamic**: Recalculates on relevant events (label change, assignment, milestone)
4. **Deterministic**: Clear precedence rules resolve conflicts predictably

### Alternatives Considered

| Alternative                | Rejected Because                                |
| -------------------------- | ----------------------------------------------- |
| Static labels (P0, P1, P2) | Doesn't scale, requires manual updates          |
| Time-based (FIFO)          | Ignores impact and effort                       |
| Single-factor scoring      | Misses urgency and risk dimensions              |
| Machine learning models    | Overkill for team scale, requires training data |

### Implementation Approach

**Priority Formula**:

```
priority_score = (
  factor_impact * weight_impact +
  factor_effort * weight_effort +
  factor_urgency * weight_urgency +
  factor_alignment * weight_alignment +
  factor_risk * weight_risk
) / sum(weights)
```

**Factor Calculations** (each normalized 0-100):

- **Impact**: Scope of change, affected users, labels, discussion volume
- **Effort**: Estimated hours (inverted: low effort = high priority)
- **Urgency**: Age, milestone deadline, critical labels
- **Alignment**: Match to project goals, constitutional alignment
- **Risk**: Breaking changes, test coverage, dependency count (inverted)

**Conflict Resolution**:

```typescript
enum RulePrecedence {
  SECURITY = 1, // Security issues always highest
  BLOCKING = 2, // Blockers for other work
  PLANNED_MILESTONE = 3, // Items in current milestone
  STAKEHOLDER = 4, // Assigned to core team
  USER_FACING = 5, // User-visible features
  TECHNICAL_DEBT = 6, // Refactoring
  DEFAULT = 100, // Fallback
}
```

When multiple rules apply, lowest precedence value wins.

---

## 4. Agent Approval Workflows

### Decision

Implement a **risk-based auto-approval system** with approval rules stored in `projectAgentApprovalPolicies` table, GitHub App permissions for agent commits, batched PR creation for efficiency, and human review escalation for high-risk changes.

### Rationale

1. **Efficiency**: Low-risk changes auto-approved to maximize agent productivity
2. **Safety**: High-risk changes require human review
3. **Batching**: Reduces review fatigue by grouping similar changes
4. **Transparency**: Clear audit trail of approval decisions

### Alternatives Considered

| Alternative                     | Rejected Because                       |
| ------------------------------- | -------------------------------------- |
| All PRs require manual approval | Bottleneck, defeats agent productivity |
| Always auto-merge               | Risk of broken main, security issues   |
| Centralized approval service    | Additional infrastructure complexity   |
| Random sampling                 | Unpredictable, creates technical debt  |

### Implementation Approach

**Risk Assessment**:

```typescript
enum ApprovalRiskLevel {
  LOW = "low", // Auto-approve
  MEDIUM = "medium", // Schedule batch review
  HIGH = "high", // Human review required
  CRITICAL = "critical", // Block until approval
}
```

**Risk Scoring Factors**:

- Files changed count (>50 = high)
- Test coverage (<50% = +30 risk)
- Breaking change indicators
- Dependency updates (+20 risk)
- Auto-generated (-10 risk)

**Approval Policies**:

- Per-project, per-agent-type configuration
- Conditions: risk level, file count, file patterns
- Actions: `auto`, `batch`, `required`
- Batch settings: max items, review window

**GitHub App Permissions Required**:

```json
{
  "permissions": {
    "pull_requests": "write",
    "contents": "write",
    "commit_statuses": "read",
    "checks": "write"
  }
}
```

---

## 5. Project Lifecycle States

### Decision

Implement three lifecycle states: **Active**, **Suspended**, and **Archived**.

### Rationale

1. **Active**: Normal operation, all agents running
2. **Suspended**: Pause agents without losing data (e.g., budget concerns, team transition)
3. **Archived**: Soft-delete, read-only access for historical reference

### Implementation

State transitions:

- Active → Suspended: Pauses all agent tasks, retains data
- Suspended → Active: Resumes agent tasks
- Active/Suspended → Archived: Marks project read-only
- Archived → Active: Restores project (admin only)

---

## 6. Repository Connection States

### Decision

Implement two connection states: **Connected** and **Disconnected**.

### Rationale

Graceful degradation when repository access is lost (deleted, permissions revoked).

### Implementation

- **Connected**: Normal operation
- **Disconnected**: Retain project data, disable sync, notify users
- Transition to Disconnected on GitHub API 404 or permission errors
- User action required to reconnect or remove repository link

---

## Summary

| Topic                 | Decision                                     | Risk Level      |
| --------------------- | -------------------------------------------- | --------------- |
| Agent Architecture    | Next.js Server Actions + AI SDK + PostgreSQL | Low (proven)    |
| Spec Detection        | Webhook-driven + nightly polling             | Low             |
| Prioritization        | Multi-factor scoring + precedence rules      | Medium (tuning) |
| Approval Workflow     | Risk-based auto-approval + batched review    | Medium          |
| Project Lifecycle     | Active/Suspended/Archived states             | Low             |
| Repository Connection | Connected/Disconnected with retention        | Low             |
