# Implementation Plan: CLI Coding Agents Harness

**Spec**: `006-cli-coding-agents-harness`
**Branch**: `006-cli-coding-agents-harness`
**Created**: 2025-01-20

---

## Summary

Enable Catalyst to run third-party CLI coding agents (Claude Code, Aider, Codex CLI) within managed Kubernetes environments, allowing users to leverage their own API subscriptions while benefiting from platform orchestration, security, and GitHub integration.

## Technical Context

**Language/Framework**: TypeScript, Next.js 15, Go (operator)
**Primary Dependencies**: Drizzle ORM, @catalyst/kubernetes-client, GitHub API
**Storage**: PostgreSQL (credentials, tasks, executions), Kubernetes (environments)
**Testing**: Vitest, Playwright, K3s VM integration

## Related Specs

- [001-environments](../001-environments/spec.md) - Agent environments extend the Environment CRD
- [003-vcs-providers](../003-vcs-providers/spec.md) - GitHub integration for issue/PR assignment
- [007-user-agent-interfaces](../007-user-agent-interfaces/spec.md) - MCP tools and ChatOps integration

---

## Data Model

### AgentCredential

Stores encrypted API keys for agent providers.

```typescript
// web/src/db/schema.ts
export const agentCredentials = pgTable(
  "agent_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'anthropic', 'openai', 'ollama'
    encryptedKey: text("encrypted_key").notNull(), // AES-256-GCM encrypted
    encryptedKeyIv: text("encrypted_key_iv").notNull(), // Initialization vector
    userId: uuid("user_id").references(() => users.id), // User-scoped credential
    teamId: uuid("team_id").references(() => teams.id), // Team-scoped credential
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => ({
    // Each user/team can have one credential per provider
    userProviderUnique: unique().on(table.userId, table.provider),
    teamProviderUnique: unique().on(table.teamId, table.provider),
  }),
);
```

### AgentTask

Represents a unit of work assigned to an agent.

```typescript
// web/src/db/schema.ts
export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskType: varchar("task_type", { length: 50 }).notNull(), // 'issue', 'pr_review', 'code_fix'
    sourceType: varchar("source_type", { length: 20 }).notNull(), // 'github_issue', 'github_pr'
    sourceUrl: text("source_url").notNull(), // Full URL to issue/PR
    sourceNumber: integer("source_number").notNull(), // Issue/PR number
    repoId: uuid("repo_id")
      .references(() => repos.id)
      .notNull(),
    branch: varchar("branch", { length: 255 }).notNull(),
    agentType: varchar("agent_type", { length: 50 }).notNull(), // 'claude-code', 'aider', 'codex'
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // 'pending', 'provisioning', 'running', 'completed', 'failed', 'cancelled'
    environmentId: uuid("environment_id").references(
      () => projectEnvironments.id,
    ),
    assignedBy: uuid("assigned_by")
      .references(() => users.id)
      .notNull(),
    contextPayload: jsonb("context_payload"), // Issue body, PR diff, etc.
    resultPayload: jsonb("result_payload"), // Commits, comments posted
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    statusIdx: index("agent_tasks_status_idx").on(table.status),
    repoIdx: index("agent_tasks_repo_idx").on(table.repoId),
  }),
);
```

### AgentExecution

Records individual agent runs within a task (supports retries).

```typescript
// web/src/db/schema.ts
export const agentExecutions = pgTable(
  "agent_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .references(() => agentTasks.id)
      .notNull(),
    environmentNamespace: varchar("environment_namespace", {
      length: 255,
    }).notNull(),
    agentCommand: text("agent_command").notNull(), // Full command executed
    exitCode: integer("exit_code"),
    stdout: text("stdout"), // Captured output (truncated)
    stderr: text("stderr"),
    commitsProduced: jsonb("commits_produced").default([]), // Array of commit SHAs
    commentsPosted: jsonb("comments_posted").default([]), // Array of comment URLs
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => ({
    taskIdx: index("agent_executions_task_idx").on(table.taskId),
  }),
);
```

### AgentConfig

Per-project configuration for agent behavior.

```typescript
// web/src/db/schema.ts
export const agentConfigs = pgTable("agent_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull()
    .unique(),
  enabledAgents: jsonb("enabled_agents").default(["claude-code", "aider"]),
  defaultAgent: varchar("default_agent", { length: 50 }).default("claude-code"),
  requirePlanApproval: boolean("require_plan_approval").default(false),
  timeoutMinutes: integer("timeout_minutes").default(30),
  hooks: jsonb("hooks").default({}), // Pre/post hooks configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

## API/Actions

### Credential Management

```typescript
// web/src/actions/agent-credentials.ts
export async function createAgentCredential(
  input: CreateCredentialInput,
): Promise<Result<AgentCredential, CredentialError>> {
  // Encrypts key with AES-256-GCM before storage
  // Validates provider is supported
}

export async function listAgentCredentials(): Promise<AgentCredential[]> {
  // Returns credentials with masked keys (last 4 chars visible)
}

export async function deleteAgentCredential(id: string): Promise<void> {
  // Revokes and deletes credential
}
```

### Task Management

```typescript
// web/src/actions/agent-tasks.ts
export async function createAgentTask(
  input: CreateTaskInput,
): Promise<Result<AgentTask, TaskError>> {
  // Creates task, provisions environment, invokes agent
}

export async function cancelAgentTask(id: string): Promise<void> {
  // Terminates running agent, cleans up environment
}

export async function getAgentTask(id: string): Promise<AgentTask | null> {
  // Returns task with execution history
}

export async function listAgentTasks(
  filters?: TaskFilters,
): Promise<AgentTask[]> {
  // Lists tasks with pagination and filtering
}
```

### Agent Execution

```typescript
// web/src/models/agent-execution.ts
export async function executeAgentTask(task: AgentTask): Promise<void> {
  // 1. Provision agent environment via Environment CR
  // 2. Clone repository with branch
  // 3. Inject credentials as env vars
  // 4. Execute agent CLI with context
  // 5. Capture results, push commits, post comments
  // 6. Cleanup environment
}

export async function terminateAgentTask(task: AgentTask): Promise<void> {
  // Force-stop agent and cleanup
}
```

---

## Agent Invocation

### Supported Agents

Each agent has a specific invocation pattern:

```typescript
// web/src/lib/agents/registry.ts
export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    provider: "anthropic",
    command: "claude",
    args: ["--dangerously-skip-permissions", "-p"],
    envVars: ["ANTHROPIC_API_KEY"],
    features: ["hooks", "subagents", "plans", "mcp"],
  },
  {
    id: "aider",
    name: "Aider",
    provider: "anthropic", // Also supports 'openai'
    command: "aider",
    args: ["--yes", "--no-git"],
    envVars: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"],
    features: ["auto-commit"],
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    provider: "openai",
    command: "codex",
    args: [],
    envVars: ["OPENAI_API_KEY"],
    features: [],
  },
];
```

### Context Injection

```typescript
// web/src/lib/agents/context.ts
export interface AgentContext {
  task: {
    type: "issue" | "pr_review";
    url: string;
    title: string;
    body: string;
  };
  repository: {
    name: string;
    defaultBranch: string;
    conventions?: string; // From CLAUDE.md or similar
  };
  prDiff?: string; // For PR review tasks
  relatedFiles?: string[]; // Files mentioned in issue
}

export function buildAgentPrompt(context: AgentContext): string {
  // Constructs the initial prompt for the agent
}
```

---

## Operator Integration

Agent environments extend the Environment CRD with agent-specific configuration.

### Environment CR with Agent Config

```yaml
# Applied by web app when task is created
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: agent-issue-123
  namespace: catalyst-system
  labels:
    catalyst.dev/type: agent
    catalyst.dev/task-id: uuid-here
spec:
  project: my-project
  environment: agent
  source:
    type: git
    repository: https://github.com/org/repo
    ref: main
  agent:
    type: claude-code
    timeout: 30m
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
```

### Operator Reconciliation

The operator handles:

1. Namespace creation with NetworkPolicy (restrict egress to LLM APIs only)
2. Clone job execution
3. Agent container deployment
4. Status updates to Environment CR
5. Cleanup on completion/timeout

---

## GitHub Integration

### Webhook Handler

```typescript
// web/src/app/api/github/webhook/route.ts
// Add to existing handler

async function handleIssueEvent(payload: IssueEvent): Promise<void> {
  if (payload.action === "assigned") {
    const assignee = payload.issue.assignee?.login;
    if (assignee === "catalyst-agent") {
      await createAgentTaskFromIssue(payload);
    }
  }
}

async function handlePullRequestReviewRequested(
  payload: PullRequestEvent,
): Promise<void> {
  if (payload.requested_reviewer?.login === "catalyst-agent") {
    await createAgentTaskForReview(payload);
  }
}
```

### Status Updates

```typescript
// web/src/lib/github-agent-comments.ts
export async function postAgentStatusComment(
  task: AgentTask,
  status: "started" | "working" | "completed" | "failed",
  details?: string,
): Promise<void> {
  // Posts/updates comment on issue/PR with agent status
  // Includes link to environment logs in Catalyst UI
}
```

---

## UI Components

### Agent Configuration Page

- `AgentCredentialForm` - Add/edit API credentials
- `AgentCredentialList` - List configured credentials with provider icons
- `ProjectAgentSettings` - Per-project agent configuration

### Agent Tasks Dashboard

- `AgentTaskList` - List of all agent tasks with status
- `AgentTaskDetail` - Single task with execution history
- `AgentActivityLog` - Real-time log viewer for running tasks

### Agent Task Controls

- `TerminateButton` - Stop running agent
- `RetryButton` - Retry failed task
- `ApprovalDialog` - Approve/reject agent plans (if enabled)

---

## Spike Work

### Spike: Claude Code Non-Interactive Execution

**Goal**: Validate that Claude Code can run non-interactively in a container with stdin piped prompt

**Approach**:

1. Create minimal container with Claude Code installed
2. Pipe prompt via stdin: `echo "Fix the bug in main.py" | claude -p`
3. Capture stdout/stderr and exit code
4. Verify commits are made to local git repo

**Success Criteria**:

- Claude Code runs to completion without human interaction
- Exit code indicates success/failure
- Git commits are created in repository
- Output can be parsed for progress information

**Findings**: [To be filled after spike]

### Spike: Aider Auto-Commit Mode

**Goal**: Validate Aider can auto-commit changes without confirmation

**Approach**:

1. Run Aider with `--yes --auto-commits` flags
2. Provide task via command line argument
3. Verify commits are made with meaningful messages

**Success Criteria**:

- Aider completes without prompts
- Commits have descriptive messages
- Changes can be pushed to remote

**Findings**: [To be filled after spike]

---

## Metrics

| Metric                             | Target            | Measurement Method                           |
| ---------------------------------- | ----------------- | -------------------------------------------- |
| SC-001: Issue to PR time           | < 30 min (simple) | Timestamp diff: task.createdAt to PR opened  |
| SC-002: Credential setup time      | < 2 min           | User timing from settings page entry to save |
| SC-003: Environment provision rate | 95% in 60s        | Prometheus: env_provision_duration_seconds   |
| SC-004: Real-time visibility delay | < 5s              | Log timestamp to UI display diff             |
| SC-005: Error message clarity      | 100% actionable   | Manual review of error samples               |
| SC-006: Agent support              | 2+ agents         | Count of AGENT_REGISTRY entries              |

---

## Risks & Mitigations

| Risk                                  | Impact | Mitigation                                                             |
| ------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Claude Code requires interactive mode | High   | Spike to validate non-interactive execution; fallback to PTY emulation |
| API key exposure in logs              | High   | Scrub secrets from all logs; use secret injection at runtime only      |
| Agent runaway costs                   | Medium | Implement timeout and token usage warnings; allow users to set limits  |
| Agents produce insecure code          | Medium | Pre-commit hooks for security scanning; optional human review gate     |
| Network policy blocks LLM APIs        | Medium | Document required egress rules; provide setup validation               |
| Large repos slow clone time           | Medium | Use shallow clones; warm caches; git sparse checkout                   |

---

## File Structure

```
web/
├── src/
│   ├── db/schema.ts                      # Add agent tables
│   ├── models/
│   │   ├── agent-credentials.ts          # Credential encryption/storage
│   │   ├── agent-tasks.ts                # Task orchestration
│   │   └── agent-execution.ts            # Agent invocation
│   ├── actions/
│   │   ├── agent-credentials.ts          # Credential CRUD actions
│   │   └── agent-tasks.ts                # Task management actions
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── registry.ts               # Agent definitions
│   │   │   ├── context.ts                # Context building
│   │   │   └── invocation.ts             # CLI invocation
│   │   └── github-agent-comments.ts      # Status updates to GitHub
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── settings/
│   │   │   │   └── agents/
│   │   │   │       └── page.tsx          # Agent credentials config
│   │   │   ├── projects/[slug]/
│   │   │   │   └── settings/
│   │   │   │       └── agents/
│   │   │   │           └── page.tsx      # Project agent settings
│   │   │   └── agent-tasks/
│   │   │       ├── page.tsx              # Task list
│   │   │       └── [id]/
│   │   │           └── page.tsx          # Task detail
│   │   └── api/github/webhook/route.ts   # Extend with agent handlers
│   └── components/
│       └── agents/
│           ├── credential-form.tsx
│           ├── credential-list.tsx
│           ├── task-list.tsx
│           ├── task-detail.tsx
│           └── activity-log.tsx
```

---

## Dependencies

- `@kubernetes/client-node` - Kubernetes API access (via @catalyst/kubernetes-client)
- Existing: `drizzle-orm`, `next-auth`, GitHub App integration
- No new external packages required for MVP

---

## Implementation Order

1. **Phase 0: Spikes** - Validate Claude Code and Aider non-interactive execution
2. **Phase 1: Data Model** - Add database tables and types
3. **Phase 2: Credential Management** - Encrypted storage and retrieval
4. **Phase 3: Task Orchestration** - Core execution loop
5. **Phase 4: GitHub Integration** - Webhook handlers for assignment
6. **Phase 5: UI** - Settings and task dashboard
7. **Phase 6: MCP Tools** - Agent interaction via MCP
8. **Phase 7: Polish** - Monitoring, metrics, error handling
