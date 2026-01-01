# Implementation Plan: Platform Management & Automation

**Spec**: `010-platform`
**Branch**: `010-platform`
**Created**: 2025-12-30

<!--
  This document defines HOW to implement the feature.
  WHAT the feature does is defined in spec.md.
  Research on libraries/approaches goes in research*.md files.
-->

## Summary

Implement a comprehensive Internal Developer Platform (IDP) that automates project conventions, enables spec-driven development, provides unified observability, and supports autonomous platform maintenance through AI agents.

## Technical Context

**Language/Framework**: TypeScript, Next.js 15 (App Router), Go (Operator)
**Primary Dependencies**: Drizzle ORM, @kubernetes/client-node, kube-prometheus-stack, Loki
**Storage**: PostgreSQL, Kubernetes CRDs
**Testing**: Vitest, Playwright

## Data Model

### Convention & Project Configuration

```typescript
// src/db/schema.ts additions

export const conventionRules = pgTable("convention_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // 'lint', 'commit', 'branch', 'test'
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  config: jsonb("config").notNull(), // Rule-specific configuration
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const specFolders = pgTable("spec_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  slug: varchar("slug", { length: 100 }).notNull(), // e.g., '001-user-auth'
  specNumber: integer("spec_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // 'draft', 'active', 'complete'
  completionPercentage: integer("completion_percentage").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const specTasks = pgTable("spec_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  specFolderId: uuid("spec_folder_id")
    .references(() => specFolders.id)
    .notNull(),
  taskId: varchar("task_id", { length: 20 }).notNull(), // e.g., 'T001'
  userStoryRef: varchar("user_story_ref", { length: 20 }), // e.g., 'US-1'
  description: text("description").notNull(),
  isParallelizable: boolean("is_parallelizable").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'in_progress', 'complete'
  linkedPrNumber: integer("linked_pr_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformTasks = pgTable("platform_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull(), // 'dependency_update', 'convention_fix', 'flaky_test'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  priority: varchar("priority", { length: 10 }).default("medium").notNull(),
  linkedPrNumber: integer("linked_pr_number"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const agentContexts = pgTable("agent_contexts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  generatedContent: text("generated_content").notNull(),
  lastGeneratedAt: timestamp("last_generated_at").defaultNow().notNull(),
  needsRefresh: boolean("needs_refresh").default(false).notNull(),
});

export const alertRules = pgTable("alert_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  signalType: varchar("signal_type", { length: 20 }).notNull(), // 'latency', 'error_rate', 'traffic', 'saturation'
  threshold: decimal("threshold", { precision: 10, scale: 4 }).notNull(),
  operator: varchar("operator", { length: 10 }).notNull(), // 'gt', 'lt', 'gte', 'lte'
  duration: varchar("duration", { length: 20 }).notNull(), // e.g., '5m'
  severity: varchar("severity", { length: 20 }).default("warning").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Operator CRDs (Go)

```go
// operator/api/v1alpha1/observability_types.go

type ObservabilityStackSpec struct {
    // Enable kube-prometheus-stack deployment
    Enabled bool `json:"enabled"`

    // Prometheus configuration
    Prometheus PrometheusConfig `json:"prometheus,omitempty"`

    // Loki configuration
    Loki LokiConfig `json:"loki,omitempty"`

    // Alertmanager configuration
    Alertmanager AlertmanagerConfig `json:"alertmanager,omitempty"`
}

type GoldenSignalAlerts struct {
    // Latency alert threshold (p99 in ms)
    LatencyThresholdMs int `json:"latencyThresholdMs,omitempty"`

    // Error rate threshold (percentage)
    ErrorRatePercent float64 `json:"errorRatePercent,omitempty"`

    // Traffic anomaly detection
    TrafficAnomalyEnabled bool `json:"trafficAnomalyEnabled,omitempty"`
}
```

## API/Actions

### Convention Management

```typescript
// src/actions/conventions.ts

export async function scaffoldProjectConventions(
  projectId: string,
): Promise<Result<ConventionScaffoldResult, ConventionError>> {
  // Generate PR with linting, formatting, commit hooks, CI workflows
}

export async function detectConventionDrift(
  projectId: string,
): Promise<Result<DriftReport, ConventionError>> {
  // Compare project conventions against platform standards
}

export async function applyConventionFixes(
  projectId: string,
  driftReport: DriftReport,
): Promise<Result<PullRequest, ConventionError>> {
  // Create PR to remediate drift
}
```

### Spec Management

```typescript
// src/actions/specs.ts

export async function indexSpecFolders(
  projectId: string,
): Promise<Result<SpecFolder[], SpecError>> {
  // Parse specs/###-slug/ directories from repository
}

export async function syncSpecTasks(
  specFolderId: string,
): Promise<Result<SpecTask[], SpecError>> {
  // Parse tasks.md and update database
}

export async function updateTaskFromPR(
  prNumber: number,
  commitScope: string,
): Promise<Result<SpecTask, SpecError>> {
  // Link PR to task via commit scope matching
}
```

### Agent Context

```typescript
// src/actions/agent-context.ts

export async function generateAgentContext(
  projectId: string,
): Promise<Result<AgentContext, ContextError>> {
  // Analyze codebase and generate AGENTS.md content
}

export async function checkContextStaleness(
  projectId: string,
): Promise<Result<boolean, ContextError>> {
  // Compare content hash to detect significant changes
}
```

### Observability

```typescript
// src/actions/observability.ts

export async function configureGoldenSignalAlerts(
  projectId: string,
  config: GoldenSignalConfig,
): Promise<Result<AlertRule[], ObservabilityError>> {
  // Create Prometheus alerting rules
}

export async function queryMetrics(
  projectId: string,
  query: PrometheusQuery,
  timeRange: TimeRange,
): Promise<Result<MetricResult, ObservabilityError>> {
  // Query Prometheus with project scoping
}

export async function queryLogs(
  projectId: string,
  query: LokiQuery,
  timeRange: TimeRange,
): Promise<Result<LogResult, ObservabilityError>> {
  // Query Loki with project scoping
}

export async function correlateIncident(
  projectId: string,
  alertId: string,
): Promise<Result<IncidentCorrelation, ObservabilityError>> {
  // Correlate logs, metrics, traces for incident
}
```

## UI Components

### Platform Dashboard

- `ConventionStatus` - Shows convention compliance status per project
- `SpecBrowser` - Navigate and view spec folders with completion tracking
- `SpecTaskList` - Display tasks with status and PR links
- `PlatformTaskQueue` - View pending/active platform maintenance tasks

### Observability UI

- `GoldenSignalDashboard` - Four golden signals visualization
- `AlertList` - Active and historical alerts
- `IncidentView` - Correlated logs/metrics/traces for investigation
- `MetricExplorer` - Ad-hoc Prometheus queries

### Agent Context UI

- `AgentContextViewer` - View generated AGENTS.md content
- `ContextRefreshButton` - Trigger manual context regeneration

## Spike Work

### Spike: kube-prometheus-stack Integration

**Goal**: Validate deploying kube-prometheus-stack via operator and querying from web app

**Approach**:

1. Deploy kube-prometheus-stack in local K3s VM
2. Implement Prometheus/Loki query proxies in web app
3. Validate project-scoped queries work correctly

**Success Criteria**: Can query metrics/logs scoped to specific namespace from web UI

**Findings**: [To be filled after spike]

### Spike: AGENTS.md Generation

**Goal**: Validate automated context distillation from codebase analysis

**Approach**:

1. Implement codebase analyzer that identifies patterns, conventions, structure
2. Generate AGENTS.md template from analysis
3. Test on multiple project types (Next.js, Rails, Go)

**Success Criteria**: Generated AGENTS.md captures >80% of relevant conventions

**Findings**: [To be filled after spike]

### Spike: Spec Parser

**Goal**: Validate parsing spec folders and extracting task/PR linkage

**Approach**:

1. Build markdown parser for spec.md, tasks.md format
2. Extract task IDs, user story refs, parallelization markers
3. Match commit scopes to spec slugs

**Success Criteria**: Can parse existing Catalyst specs and track completion

**Findings**: [To be filled after spike]

## Metrics

| Metric                                 | Target  | Measurement Method                    |
| -------------------------------------- | ------- | ------------------------------------- |
| SC-001: Lint violation auto-resolution | >50%    | Track Platform Agent PR success rate  |
| SC-002: Debug Workspace provisioning   | <5 min  | Measure environment creation time     |
| SC-003: PR convention checks           | 100%    | GitHub webhook coverage audit         |
| SC-005: Onboarding time                | <10 min | Measure scaffold PR creation to merge |
| SC-006: Spec indexing                  | 100%    | Compare DB records to repo scan       |
| SC-007: Environment startup            | <5 min  | Measure docker-compose/nix-shell time |
| SC-008: Alert latency                  | <2 min  | Prometheus alerting rule evaluation   |

## Risks & Mitigations

| Risk                                 | Impact | Mitigation                                        |
| ------------------------------------ | ------ | ------------------------------------------------- |
| kube-prometheus-stack resource usage | High   | Resource limits, optional components              |
| AGENTS.md generation accuracy        | Medium | Human review before commit, iterative improvement |
| Spec parser edge cases               | Medium | Extensive test suite, graceful degradation        |
| Convention drift false positives     | Medium | Configurable sensitivity, allowlists              |
| Platform Agent infinite loops        | High   | Max retry limits, circuit breakers                |

## File Structure

```
web/src/
├── db/schema/
│   ├── conventions.ts       # Convention rules schema
│   ├── specs.ts             # Spec folders and tasks schema
│   ├── platform-tasks.ts    # Platform maintenance tasks
│   └── observability.ts     # Alert rules schema
├── models/
│   ├── conventions.ts       # Convention management logic
│   ├── specs.ts             # Spec parsing and tracking
│   ├── agent-context.ts     # Context generation
│   └── observability.ts     # Metrics/logs queries
├── actions/
│   ├── conventions.ts       # Convention server actions
│   ├── specs.ts             # Spec server actions
│   ├── agent-context.ts     # Context server actions
│   └── observability.ts     # Observability server actions
├── app/
│   ├── platform/
│   │   ├── conventions/     # Convention management UI
│   │   ├── specs/           # Spec browser UI
│   │   └── tasks/           # Platform task queue UI
│   └── observability/
│       ├── dashboards/      # Golden signal dashboards
│       ├── alerts/          # Alert management
│       └── investigate/     # Incident investigation
└── lib/
    ├── spec-parser.ts       # Markdown spec parser
    ├── context-generator.ts # AGENTS.md generator
    └── prometheus-client.ts # Prometheus query client

operator/
├── api/v1alpha1/
│   └── observability_types.go
├── controllers/
│   └── observability_controller.go
└── helm/
    └── kube-prometheus-stack/  # Vendored or reference chart
```

## Dependencies

- `@prometheus-io/client` - Prometheus query client
- `gray-matter` - Markdown frontmatter parsing
- `remark` / `unified` - Markdown AST parsing for spec files
- `kube-prometheus-stack` - Helm chart for observability stack (operator-deployed)
