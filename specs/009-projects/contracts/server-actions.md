# Server Actions Contract: Projects Management

**Feature Branch**: `009-projects`
**Location**: `web/src/actions/`

This document defines the server action contracts for Projects Management.

## Action Files

| File                | Description                             |
| ------------------- | --------------------------------------- |
| `projects.ts`       | Extended project CRUD operations        |
| `project-agents.ts` | Agent configuration and task management |
| `project-specs.ts`  | Spec file listing and sync              |
| `dashboard.ts`      | Prioritized work aggregation            |

---

## projects.ts

### createProject

Creates a new project with repository links.

```typescript
export async function createProject(data: {
  name: string;
  slug?: string;
  description?: string;
  teamId: string;
  repositoryIds: string[];
  primaryRepositoryId?: string;
}): Promise<ActionResult<SelectProject>>;
```

**Authorization**: User must be member of team

### getProjects

Lists projects accessible to user.

```typescript
export async function getProjects(params?: {
  teamId?: string;
  status?: "active" | "suspended" | "archived" | "all";
  limit?: number;
  offset?: number;
}): Promise<ActionResult<ProjectWithSummary[]>>;
```

**Authorization**: Returns only projects from user's teams

### getProject

Gets project details by ID or slug.

```typescript
export async function getProject(params: {
  projectId?: string;
  slug?: string;
  teamId?: string;
  include?: {
    repositories?: boolean;
    agents?: boolean;
    environments?: boolean;
  };
}): Promise<ActionResult<ProjectWithDetails>>;
```

**Authorization**: User must be member of project's team

### updateProject

Updates project settings.

```typescript
export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    addRepositoryIds?: string[];
    removeRepositoryIds?: string[];
    primaryRepositoryId?: string;
  },
): Promise<ActionResult<SelectProject>>;
```

**Authorization**: User must be admin or owner of project's team

### updateProjectStatus

Updates project lifecycle status.

```typescript
export async function updateProjectStatus(
  projectId: string,
  status: "active" | "suspended" | "archived",
): Promise<ActionResult<SelectProject>>;
```

**Authorization**: User must be admin or owner of project's team

---

## project-agents.ts

### getProjectAgents

Lists agents configured for a project.

```typescript
export async function getProjectAgents(
  projectId: string,
): Promise<ActionResult<SelectProjectAgent[]>>;
```

### configureProjectAgent

Creates or updates agent configuration.

```typescript
export async function configureProjectAgent(data: {
  projectId: string;
  agentType: "platform" | "project" | "qa";
  enabled?: boolean;
  config?: AgentConfig;
  maxExecutionsPerDay?: number;
  dailyCostCapUsd?: string;
  maxRetries?: number;
}): Promise<ActionResult<SelectProjectAgent>>;
```

### getAgentTasks

Lists recent agent task executions.

```typescript
export async function getAgentTasks(params: {
  projectAgentId?: string;
  projectId?: string;
  status?: "pending" | "running" | "completed" | "failed";
  limit?: number;
  offset?: number;
}): Promise<ActionResult<SelectProjectAgentTask[]>>;
```

### getAgentApprovalPolicies

Lists approval policies for a project.

```typescript
export async function getAgentApprovalPolicies(
  projectId: string,
): Promise<ActionResult<SelectProjectAgentApprovalPolicy[]>>;
```

### createAgentApprovalPolicy

Creates an approval policy.

```typescript
export async function createAgentApprovalPolicy(data: {
  projectId: string;
  agentType: "platform" | "project" | "qa";
  name: string;
  condition: ApprovalCondition;
  approval: "auto" | "batch" | "required";
  autoApprovalConfig?: AutoApprovalConfig;
  batchConfig?: BatchConfig;
  requiredReviewers?: string[];
  priority?: number;
}): Promise<ActionResult<SelectProjectAgentApprovalPolicy>>;
```

---

## project-specs.ts

### getProjectSpecs

Lists indexed spec files.

```typescript
export async function getProjectSpecs(params: {
  projectId: string;
  pattern?: "RFC" | "ADR" | "SPEC" | "PROPOSAL";
  specStatus?: "draft" | "review" | "approved" | "superseded";
  limit?: number;
  offset?: number;
}): Promise<ActionResult<SelectProjectSpec[]>>;
```

### syncProjectSpecs

Triggers spec file sync.

```typescript
export async function syncProjectSpecs(params: {
  projectId: string;
  repositoryId?: string;
  force?: boolean;
}): Promise<ActionResult<SyncResult>>;
```

---

## dashboard.ts

### getPrioritizedWork

Gets prioritized work items for dashboard.

```typescript
export async function getPrioritizedWork(params?: {
  projectIds?: string[];
  category?: "feature" | "platform" | "bug" | "docs" | "all";
  state?: "open" | "closed" | "all";
  limit?: number;
  offset?: number;
  sortBy?: "priority" | "created" | "updated";
}): Promise<ActionResult<PrioritizedWorkResult>>;
```

### getPrioritizationRules

Gets prioritization rules for a project.

```typescript
export async function getPrioritizationRules(
  projectId: string,
): Promise<ActionResult<SelectProjectPrioritizationRule[]>>;
```

### createPrioritizationRule

Creates a prioritization rule.

```typescript
export async function createPrioritizationRule(data: {
  projectId: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  factorWeights: FactorWeights;
  precedence?: number;
}): Promise<ActionResult<SelectProjectPrioritizationRule>>;
```

### updatePrioritizationRule

Updates a prioritization rule.

```typescript
export async function updatePrioritizationRule(
  ruleId: string,
  data: Partial<{
    name: string;
    description: string;
    condition: RuleCondition;
    factorWeights: FactorWeights;
    precedence: number;
    active: boolean;
  }>,
): Promise<ActionResult<SelectProjectPrioritizationRule>>;
```

### deletePrioritizationRule

Deletes a prioritization rule.

```typescript
export async function deletePrioritizationRule(
  ruleId: string,
): Promise<ActionResult<void>>;
```

---

## Type Definitions

```typescript
// Result type for all actions
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: string };

// Project with summary counts
interface ProjectWithSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "suspended" | "archived";
  teamId: string;
  teamName: string;
  repositoryCount: number;
  openWorkItemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Project with full details
interface ProjectWithDetails extends ProjectWithSummary {
  repositories?: RepositoryWithConnection[];
  agents?: AgentWithStatus[];
  environments?: SelectProjectEnvironment[];
}

// Repository with connection status
interface RepositoryWithConnection {
  id: string;
  name: string;
  fullName: string;
  isPrimary: boolean;
  connectionStatus: "connected" | "disconnected";
}

// Agent with last run status
interface AgentWithStatus {
  id: string;
  agentType: "platform" | "project" | "qa";
  enabled: boolean;
  config: AgentConfig | null;
  lastRunAt: Date | null;
  lastRunStatus: "completed" | "failed" | null;
}

// Agent configuration
interface AgentConfig {
  testMaintenance?: boolean;
  dependencyUpdates?: boolean;
  ciImprovements?: boolean;
  conventionEnforcement?: boolean;
  prioritizationEnabled?: boolean;
  taskBreakdownEnabled?: boolean;
  smokeTestsEnabled?: boolean;
  testWritingEnabled?: boolean;
}

// Prioritized work result
interface PrioritizedWorkResult {
  workItems: WorkItemWithPriority[];
  summary: {
    totalOpen: number;
    byCategory: Record<string, number>;
    byProject: Record<string, number>;
  };
  total: number;
  hasMore: boolean;
}

// Work item with priority info
interface WorkItemWithPriority {
  id: string;
  itemType: "issue" | "pull_request" | "agent_task";
  title: string;
  description: string | null;
  state: string;
  status: string;
  category: string;
  labels: string[];
  project: { id: string; name: string; slug: string };
  repository: { name: string; fullName: string } | null;
  externalUrl: string | null;
  authorLogin: string | null;
  assignees: string[];
  priority: {
    score: number;
    factors: {
      impact: number;
      effort: number;
      urgency: number;
      alignment: number;
      risk: number;
    };
    appliedRules: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Prioritization rule condition
interface RuleCondition {
  type: "label" | "author" | "category" | "milestone" | "age";
  operator: "equals" | "contains" | "gt" | "lt";
  value: string | number;
}

// Factor weights
interface FactorWeights {
  impact?: number;
  effort?: number;
  urgency?: number;
  alignment?: number;
  risk?: number;
}

// Approval condition
interface ApprovalCondition {
  riskLevel?: "low" | "medium" | "high" | "critical";
  maxFilesChanged?: number;
  filePatterns?: string[];
}

// Auto-approval config
interface AutoApprovalConfig {
  requirePassingTests?: boolean;
  minTestCoverage?: number;
  requireLint?: boolean;
}

// Batch config
interface BatchConfig {
  maxItems?: number;
  reviewWindowHours?: number;
}

// Sync result
interface SyncResult {
  specsFound: number;
  specsAdded: number;
  specsUpdated: number;
  specsRemoved: number;
}
```

---

## Re-exports

Each action file re-exports relevant types for React components:

```typescript
// projects.ts
export type {
  SelectProject,
  InsertProject,
  ProjectWithSummary,
  ProjectWithDetails,
} from "@/db/schema";

// project-agents.ts
export type {
  SelectProjectAgent,
  SelectProjectAgentTask,
  SelectProjectAgentApprovalPolicy,
  AgentConfig,
} from "@/db/schema";

// project-specs.ts
export type { SelectProjectSpec } from "@/db/schema";

// dashboard.ts
export type {
  SelectWorkItem,
  SelectWorkItemScore,
  SelectProjectPrioritizationRule,
  WorkItemWithPriority,
  PrioritizedWorkResult,
} from "@/db/schema";
```
