# Data Model: Projects Management

**Feature Branch**: `009-projects`
**Date**: 2025-12-25

This document defines the database entities and relationships for the Projects Management feature.

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Existing Entities                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  users ──┬── teams ──┬── projects ──┬── projectsRepos ── repos              │
│          │           │              │                                        │
│          │           │              └── projectEnvironments                  │
│          │           │              └── projectManifests                     │
│          │           │                                                       │
│          └── teamsMemberships                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               New Entities                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  projects ──┬── projectAgents ──── projectAgentTasks                        │
│             │                                                                │
│             ├── projectSpecs                                                 │
│             │                                                                │
│             ├── projectPrioritizationRules                                   │
│             │                                                                │
│             └── projectAgentApprovalPolicies                                 │
│                                                                              │
│  repos ──── workItems (unified issues/PRs/agent tasks)                       │
│             └── workItemScores                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Schema Extensions

### 1. Projects Table (Extended)

Add lifecycle state to existing `projects` table:

```typescript
// Extension to existing projects table
{
  // ... existing fields ...

  // NEW: Lifecycle state
  status: text("status")
    .notNull()
    .default("active")
    .$type<"active" | "suspended" | "archived">(),

  // NEW: Suspended/archived timestamps
  suspendedAt: timestamp("suspended_at", { mode: "date" }),
  archivedAt: timestamp("archived_at", { mode: "date" }),
}
```

| Field       | Type      | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| status      | text      | Lifecycle state: `active`, `suspended`, `archived` |
| suspendedAt | timestamp | When project was suspended                         |
| archivedAt  | timestamp | When project was archived                          |

### 2. ProjectAgents Table

Configuration for AI agents enabled on a project.

```typescript
export const projectAgents = pgTable(
  "project_agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Agent type
    agentType: text("agent_type")
      .notNull()
      .$type<"platform" | "project" | "qa">(),

    // Enabled/disabled
    enabled: boolean("enabled").notNull().default(true),

    // Agent-specific configuration
    config: jsonb("config").$type<{
      // Platform Agent config
      testMaintenance?: boolean;
      dependencyUpdates?: boolean;
      ciImprovements?: boolean;
      conventionEnforcement?: boolean;

      // Project Agent config
      prioritizationEnabled?: boolean;
      taskBreakdownEnabled?: boolean;

      // QA Agent config
      smokeTestsEnabled?: boolean;
      testWritingEnabled?: boolean;
    }>(),

    // Rate limiting
    maxExecutionsPerDay: integer("max_executions_per_day").default(10),
    dailyCostCapUsd: text("daily_cost_cap_usd").default("1.00"),

    // Retry configuration (from spec clarification)
    maxRetries: integer("max_retries").default(1),
    retryBackoffSeconds: integer("retry_backoff_seconds").default(60),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.projectId, table.agentType)],
);
```

| Field               | Type      | Constraints    | Description                 |
| ------------------- | --------- | -------------- | --------------------------- |
| id                  | text      | PK             | UUID                        |
| projectId           | text      | FK → projects  | Parent project              |
| agentType           | text      | NOT NULL       | `platform`, `project`, `qa` |
| enabled             | boolean   | NOT NULL       | Agent on/off                |
| config              | jsonb     | -              | Agent-specific settings     |
| maxExecutionsPerDay | integer   | DEFAULT 10     | Rate limit                  |
| dailyCostCapUsd     | text      | DEFAULT "1.00" | Cost cap                    |
| maxRetries          | integer   | DEFAULT 1      | Retry count                 |
| retryBackoffSeconds | integer   | DEFAULT 60     | Backoff duration            |
| createdAt           | timestamp | NOT NULL       | Created                     |
| updatedAt           | timestamp | NOT NULL       | Updated                     |

**Unique Constraint**: `(projectId, agentType)` - one agent config per type per project.

### 3. ProjectAgentTasks Table

Tracks individual agent task executions.

```typescript
export const projectAgentTasks = pgTable(
  "project_agent_tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectAgentId: text("project_agent_id")
      .notNull()
      .references(() => projectAgents.id, { onDelete: "cascade" }),

    // Task status
    status: text("status")
      .notNull()
      .$type<"pending" | "running" | "completed" | "failed">(),

    // Execution details
    input: jsonb("input"),
    output: jsonb("output"),
    error: text("error"),

    // Cost tracking
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: text("cost_usd"),

    // Retry tracking
    attempt: integer("attempt").notNull().default(1),

    // Timing
    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_agent_task_status").on(table.status),
    index("idx_agent_task_created").on(table.createdAt),
  ],
);
```

| Field          | Type      | Description                                 |
| -------------- | --------- | ------------------------------------------- |
| id             | text      | UUID                                        |
| projectAgentId | text      | FK → projectAgents                          |
| status         | text      | `pending`, `running`, `completed`, `failed` |
| input          | jsonb     | Task input parameters                       |
| output         | jsonb     | Task result                                 |
| error          | text      | Error message if failed                     |
| inputTokens    | integer   | LLM input token count                       |
| outputTokens   | integer   | LLM output token count                      |
| costUsd        | text      | Calculated cost                             |
| attempt        | integer   | Retry attempt number                        |
| startedAt      | timestamp | When execution started                      |
| completedAt    | timestamp | When execution completed                    |
| createdAt      | timestamp | When task was created                       |

### 4. ProjectSpecs Table

Indexed specification files from project repositories.

```typescript
export const projectSpecs = pgTable(
  "project_specs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),

    // File info
    path: text("path").notNull(),
    name: text("name").notNull(),
    pattern: text("pattern").notNull(), // "RFC", "ADR", "SPEC", "PROPOSAL"
    sha: text("sha").notNull(), // Git commit SHA

    // Parsed metadata
    title: text("title"),
    specStatus: text("spec_status"), // "draft", "review", "approved", "superseded"
    owner: text("owner"),

    // Linked entities
    linkedIssues: jsonb("linked_issues").$type<number[]>(),
    linkedPrs: jsonb("linked_prs").$type<number[]>(),

    // Sync tracking
    sourceEvent: text("source_event").notNull(), // "webhook", "polling"
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }).notNull(),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.projectId, table.repoId, table.path),
    index("idx_spec_pattern").on(table.pattern),
    index("idx_spec_status").on(table.specStatus),
  ],
);
```

| Field        | Type      | Description                                 |
| ------------ | --------- | ------------------------------------------- |
| id           | text      | UUID                                        |
| projectId    | text      | FK → projects                               |
| repoId       | text      | FK → repos                                  |
| path         | text      | File path in repo                           |
| name         | text      | File name                                   |
| pattern      | text      | Detection pattern used                      |
| sha          | text      | Git SHA for change detection                |
| title        | text      | Parsed title from content                   |
| specStatus   | text      | `draft`, `review`, `approved`, `superseded` |
| owner        | text      | Spec author                                 |
| linkedIssues | jsonb     | GitHub issue numbers                        |
| linkedPrs    | jsonb     | GitHub PR numbers                           |
| sourceEvent  | text      | `webhook` or `polling`                      |
| lastSyncedAt | timestamp | Last sync time                              |

### 5. WorkItems Table

Unified representation of issues, PRs, and agent tasks for dashboard display.

```typescript
export const workItems = pgTable(
  "work_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: text("repo_id").references(() => repos.id, { onDelete: "cascade" }),

    // Item type and source
    itemType: text("item_type")
      .notNull()
      .$type<"issue" | "pull_request" | "agent_task">(),
    source: text("source").notNull(), // "github", "gitlab", "agent"

    // External reference
    externalId: text("external_id"), // GitHub issue/PR ID
    externalNumber: integer("external_number"), // Issue/PR number
    externalUrl: text("external_url"),

    // Content
    title: text("title").notNull(),
    description: text("description"),

    // State
    state: text("state").notNull(), // "open", "closed", "merged"
    status: text("status").notNull(), // "draft", "ready", "in_progress", "blocked"

    // Categorization
    category: text("category").notNull(), // "feature", "platform", "bug", "docs"
    labels: jsonb("labels").$type<string[]>(),

    // Assignment
    authorLogin: text("author_login"),
    assignees: jsonb("assignees").$type<string[]>(),

    // Timestamps
    externalCreatedAt: timestamp("external_created_at", { mode: "date" }),
    externalUpdatedAt: timestamp("external_updated_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.projectId, table.source, table.externalId),
    index("idx_work_item_state").on(table.state),
    index("idx_work_item_category").on(table.category),
  ],
);
```

| Field             | Type      | Description                                |
| ----------------- | --------- | ------------------------------------------ |
| id                | text      | UUID                                       |
| projectId         | text      | FK → projects                              |
| repoId            | text      | FK → repos (optional)                      |
| itemType          | text      | `issue`, `pull_request`, `agent_task`      |
| source            | text      | `github`, `gitlab`, `agent`                |
| externalId        | text      | External system ID                         |
| externalNumber    | integer   | Issue/PR number                            |
| externalUrl       | text      | Link to external item                      |
| title             | text      | Item title                                 |
| description       | text      | Item body                                  |
| state             | text      | `open`, `closed`, `merged`                 |
| status            | text      | `draft`, `ready`, `in_progress`, `blocked` |
| category          | text      | `feature`, `platform`, `bug`, `docs`       |
| labels            | jsonb     | Label array                                |
| authorLogin       | text      | Author username                            |
| assignees         | jsonb     | Assigned users                             |
| externalCreatedAt | timestamp | Created in external system                 |
| externalUpdatedAt | timestamp | Updated in external system                 |

### 6. WorkItemScores Table

Priority scores for work items.

```typescript
export const workItemScores = pgTable("work_item_scores", {
  workItemId: text("work_item_id")
    .primaryKey()
    .references(() => workItems.id, { onDelete: "cascade" }),

  // Individual factors (0-100)
  factorImpact: integer("factor_impact").notNull().default(50),
  factorEffort: integer("factor_effort").notNull().default(50),
  factorUrgency: integer("factor_urgency").notNull().default(50),
  factorAlignment: integer("factor_alignment").notNull().default(50),
  factorRisk: integer("factor_risk").notNull().default(50),

  // Computed final score
  finalScore: integer("final_score").notNull().default(50),

  // Applied rules
  appliedRules: jsonb("applied_rules").$type<string[]>(),

  // Recalculation tracking
  lastCalculatedAt: timestamp("last_calculated_at", { mode: "date" }).notNull(),
  calculationReason: text("calculation_reason"), // "created", "label_changed", "assigned"
});
```

| Field             | Type      | Description                  |
| ----------------- | --------- | ---------------------------- |
| workItemId        | text      | PK, FK → workItems           |
| factorImpact      | integer   | 0-100 impact score           |
| factorEffort      | integer   | 0-100 effort score           |
| factorUrgency     | integer   | 0-100 urgency score          |
| factorAlignment   | integer   | 0-100 alignment score        |
| factorRisk        | integer   | 0-100 risk score             |
| finalScore        | integer   | Weighted final score         |
| appliedRules      | jsonb     | Rule IDs that contributed    |
| lastCalculatedAt  | timestamp | When score was calculated    |
| calculationReason | text      | What triggered recalculation |

### 7. ProjectPrioritizationRules Table

Configurable prioritization rules per project.

```typescript
export const projectPrioritizationRules = pgTable(
  "project_prioritization_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Rule identification
    name: text("name").notNull(),
    description: text("description"),

    // Rule condition (when to apply)
    condition: jsonb("condition").notNull().$type<{
      type: "label" | "author" | "category" | "milestone" | "age";
      operator: "equals" | "contains" | "gt" | "lt";
      value: string | number;
    }>(),

    // Factor adjustments (multipliers)
    factorWeights: jsonb("factor_weights").notNull().$type<{
      impact?: number;
      effort?: number;
      urgency?: number;
      alignment?: number;
      risk?: number;
    }>(),

    // Precedence for conflict resolution (lower = higher priority)
    precedence: integer("precedence").notNull().default(100),

    // Active toggle
    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
);
```

| Field         | Type    | Description               |
| ------------- | ------- | ------------------------- |
| id            | text    | UUID                      |
| projectId     | text    | FK → projects             |
| name          | text    | Rule name                 |
| description   | text    | Rule description          |
| condition     | jsonb   | When rule applies         |
| factorWeights | jsonb   | Factor multipliers        |
| precedence    | integer | Conflict resolution order |
| active        | boolean | Rule enabled/disabled     |

### 8. ProjectAgentApprovalPolicies Table

Approval rules for agent-generated work.

```typescript
export const projectAgentApprovalPolicies = pgTable(
  "project_agent_approval_policies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agentType: text("agent_type")
      .notNull()
      .$type<"platform" | "project" | "qa">(),

    // Rule name
    name: text("name").notNull(),

    // Condition for rule to apply
    condition: jsonb("condition").notNull().$type<{
      riskLevel?: "low" | "medium" | "high" | "critical";
      maxFilesChanged?: number;
      filePatterns?: string[];
    }>(),

    // Approval action
    approval: text("approval").notNull().$type<"auto" | "batch" | "required">(),

    // Auto-approval requirements
    autoApprovalConfig: jsonb("auto_approval_config").$type<{
      requirePassingTests?: boolean;
      minTestCoverage?: number;
      requireLint?: boolean;
    }>(),

    // Batch review settings
    batchConfig: jsonb("batch_config").$type<{
      maxItems?: number;
      reviewWindowHours?: number;
    }>(),

    // Required reviewers for manual approval
    requiredReviewers: jsonb("required_reviewers").$type<string[]>(),

    // Priority (lower = checked first)
    priority: integer("priority").notNull().default(100),

    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
);
```

| Field              | Type    | Description                 |
| ------------------ | ------- | --------------------------- |
| id                 | text    | UUID                        |
| projectId          | text    | FK → projects               |
| agentType          | text    | Which agent type            |
| name               | text    | Policy name                 |
| condition          | jsonb   | When policy applies         |
| approval           | text    | `auto`, `batch`, `required` |
| autoApprovalConfig | jsonb   | Auto-approval requirements  |
| batchConfig        | jsonb   | Batch review settings       |
| requiredReviewers  | jsonb   | Reviewer usernames          |
| priority           | integer | Policy evaluation order     |
| active             | boolean | Policy enabled/disabled     |

## Relationships

```typescript
// Project Agents Relations
export const projectAgentsRelations = relations(
  projectAgents,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectAgents.projectId],
      references: [projects.id],
    }),
    tasks: many(projectAgentTasks),
  }),
);

// Project Agent Tasks Relations
export const projectAgentTasksRelations = relations(
  projectAgentTasks,
  ({ one }) => ({
    projectAgent: one(projectAgents, {
      fields: [projectAgentTasks.projectAgentId],
      references: [projectAgents.id],
    }),
  }),
);

// Project Specs Relations
export const projectSpecsRelations = relations(projectSpecs, ({ one }) => ({
  project: one(projects, {
    fields: [projectSpecs.projectId],
    references: [projects.id],
  }),
  repo: one(repos, {
    fields: [projectSpecs.repoId],
    references: [repos.id],
  }),
}));

// Work Items Relations
export const workItemsRelations = relations(workItems, ({ one }) => ({
  project: one(projects, {
    fields: [workItems.projectId],
    references: [projects.id],
  }),
  repo: one(repos, {
    fields: [workItems.repoId],
    references: [repos.id],
  }),
  score: one(workItemScores, {
    fields: [workItems.id],
    references: [workItemScores.workItemId],
  }),
}));

// Work Item Scores Relations
export const workItemScoresRelations = relations(workItemScores, ({ one }) => ({
  workItem: one(workItems, {
    fields: [workItemScores.workItemId],
    references: [workItems.id],
  }),
}));

// Project Prioritization Rules Relations
export const projectPrioritizationRulesRelations = relations(
  projectPrioritizationRules,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectPrioritizationRules.projectId],
      references: [projects.id],
    }),
  }),
);

// Project Agent Approval Policies Relations
export const projectAgentApprovalPoliciesRelations = relations(
  projectAgentApprovalPolicies,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectAgentApprovalPolicies.projectId],
      references: [projects.id],
    }),
  }),
);

// Extended Projects Relations
export const projectsRelationsExtended = relations(
  projects,
  ({ one, many }) => ({
    // ... existing relations ...
    agents: many(projectAgents),
    specs: many(projectSpecs),
    workItems: many(workItems),
    prioritizationRules: many(projectPrioritizationRules),
    approvalPolicies: many(projectAgentApprovalPolicies),
  }),
);
```

## State Transitions

### Project Lifecycle

```
         ┌──────────────┐
         │              │
         ▼              │
    ┌─────────┐    ┌────┴────┐
    │ Active  │◄──►│Suspended│
    └────┬────┘    └─────────┘
         │              │
         ▼              ▼
    ┌─────────────────────┐
    │      Archived       │
    └─────────────────────┘
         │
         ▼ (admin only)
    ┌─────────┐
    │ Active  │
    └─────────┘
```

### Work Item States

```
    ┌──────────┐
    │   open   │◄──────────────┐
    └────┬─────┘               │
         │                     │
    ┌────▼─────┐          ┌────┴────┐
    │  closed  │          │ reopened│
    └────┬─────┘          └─────────┘
         │
    ┌────▼─────┐
    │  merged  │ (PRs only)
    └──────────┘
```

### Agent Task States

```
    ┌─────────┐
    │ pending │
    └────┬────┘
         │
    ┌────▼────┐
    │ running │
    └────┬────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌──────┐
│complete│ │failed│──► retry (if attempts < maxRetries)
└───────┘ └──────┘
```

## Validation Rules

1. **Project slug**: Lowercase alphanumeric with hyphens, 3-50 chars
2. **Agent config**: Validated against agent type (platform, project, qa)
3. **Prioritization precedence**: 1-1000, unique per project
4. **Cost cap**: Positive decimal string
5. **Risk level**: One of `low`, `medium`, `high`, `critical`
6. **Approval type**: One of `auto`, `batch`, `required`

## Migration Notes

1. Add `status` column to `projects` table with default `active`
2. Create new tables in dependency order:
   - `project_agents`
   - `project_agent_tasks`
   - `project_specs`
   - `work_items`
   - `work_item_scores`
   - `project_prioritization_rules`
   - `project_agent_approval_policies`
3. Add indexes for common queries
4. Backfill existing projects with `status = 'active'`
