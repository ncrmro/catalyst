# Implementation Plan: CLI Coding Agents Harness

**Spec**: `006-cli-codeing-agents-harness`
**Branch**: `006-cli-codeing-agents-harness`
**Created**: 2025-12-25

## Summary

Enable execution of various CLI-based coding agents (Claude Code, Aider, Codex CLI, Cline) within Catalyst-managed Kubernetes environments, allowing users to leverage their own AI subscriptions while benefiting from platform-managed infrastructure, context injection, and result capture.

## Technical Context

**Language/Framework**: TypeScript, Next.js 15, Go (Kubernetes Operator)
**Primary Dependencies**: 
- Drizzle ORM (database)
- @catalyst/kubernetes-client (K8s interaction)
- @kubernetes/client-node (K8s API)
- Next.js Actions (backend orchestration)
**Storage**: PostgreSQL
**Testing**: Vitest, Playwright
**Infrastructure**: Kubernetes (via existing operator)

## Data Model

### Agent Configuration

```typescript
// src/db/schema.ts additions

export const agentProviders = pgTable('agent_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(), // 'claude-code', 'aider', 'codex-cli', 'cline'
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  cliCommand: varchar('cli_command', { length: 255 }).notNull(), // 'claude', 'aider', 'codex'
  installScript: text('install_script'), // How to install the CLI
  configTemplate: jsonb('config_template'), // Default config for the agent
  supportedFeatures: jsonb('supported_features'), // hooks, subagents, plans, mcp
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User's API keys for different agent providers
export const userAgentCredentials = pgTable('user_agent_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  providerId: uuid('provider_id').references(() => agentProviders.id).notNull(),
  
  // Encrypted API key/token
  encryptedApiKey: text('encrypted_api_key').notNull(),
  encryptedIv: text('encrypted_iv').notNull(), // Initialization vector for decryption
  
  // Optional: additional config (model preferences, etc.)
  config: jsonb('config'),
  
  label: varchar('label', { length: 255 }), // User-friendly label for this credential
  isActive: boolean('is_active').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserProvider: uniqueIndex('unique_user_provider_label').on(table.userId, table.providerId, table.label),
}));

// Agent execution tasks
export const agentTasks = pgTable('agent_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  environmentId: uuid('environment_id').references(() => projectEnvironments.id),
  
  // Task context
  taskType: varchar('task_type', { length: 50 }).notNull(), // 'pr-review', 'issue-fix', 'feature-dev', 'refactor'
  contextType: varchar('context_type', { length: 50 }).notNull(), // 'pull_request', 'issue', 'manual'
  contextId: varchar('context_id', { length: 255 }), // PR number, issue number, etc.
  
  // Agent configuration
  providerId: uuid('provider_id').references(() => agentProviders.id).notNull(),
  credentialId: uuid('credential_id').references(() => userAgentCredentials.id).notNull(),
  
  // Task details
  instructions: text('instructions').notNull(),
  contextData: jsonb('context_data'), // Issue body, PR diff, files, etc.
  
  // Execution state
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, provisioning, running, completed, failed, cancelled
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Results
  outputSummary: text('output_summary'),
  commits: jsonb('commits'), // Array of commit SHAs generated
  pullRequestUrl: varchar('pull_request_url', { length: 500 }),
  logsUrl: varchar('logs_url', { length: 500 }),
  
  // Metadata
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('agent_tasks_project_id_idx').on(table.projectId),
  statusIdx: index('agent_tasks_status_idx').on(table.status),
  createdByIdx: index('agent_tasks_created_by_idx').on(table.createdBy),
}));

// Agent execution logs
export const agentTaskLogs = pgTable('agent_task_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => agentTasks.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  level: varchar('level', { length: 20 }).notNull(), // info, warn, error, debug
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
}, (table) => ({
  taskIdIdx: index('agent_task_logs_task_id_idx').on(table.taskId),
  timestampIdx: index('agent_task_logs_timestamp_idx').on(table.timestamp),
}));
```

### Environment CR Extension

The existing Environment CRD will be extended to support agent execution:

```yaml
# Kubernetes CRD extension
apiVersion: catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: agent-task-abc123
  namespace: catalyst-system
spec:
  type: agent-workspace # New type alongside 'development', 'staging', 'production'
  projectId: uuid
  branch: feature-branch
  
  agentConfig:
    provider: claude-code
    taskId: uuid
    environmentVariables:
      - name: ANTHROPIC_API_KEY
        valueFrom:
          secretKeyRef:
            name: agent-task-abc123-credentials
            key: api-key
    resourceLimits:
      cpu: "2"
      memory: 4Gi
      timeout: 3600 # seconds
  
  repository:
    url: https://github.com/org/repo
    branch: feature-branch
```

## API/Actions

### Agent Provider Management

```typescript
// src/actions/agent-providers.ts

export async function listAgentProviders(): Promise<AgentProvider[]> {
  // List available agent providers
}

export async function getAgentProvider(id: string): Promise<AgentProvider | null> {
  // Get specific provider details
}
```

### User Credential Management

```typescript
// src/actions/user-agent-credentials.ts

export async function createUserCredential(
  input: {
    providerId: string;
    apiKey: string;
    label?: string;
    config?: Record<string, unknown>;
  }
): Promise<Result<UserAgentCredential, Error>> {
  // Encrypt and store user's API key
  // Uses same encryption as GitHub tokens
}

export async function listUserCredentials(): Promise<UserAgentCredential[]> {
  // List user's configured credentials (encrypted keys not exposed)
}

export async function deleteUserCredential(id: string): Promise<Result<void, Error>> {
  // Delete a credential
}

export async function testUserCredential(id: string): Promise<Result<{ valid: boolean }, Error>> {
  // Test if credential is valid by making a simple API call
}
```

### Agent Task Management

```typescript
// src/actions/agent-tasks.ts

export async function createAgentTask(
  input: {
    projectId: string;
    taskType: string;
    contextType: string;
    contextId?: string;
    instructions: string;
    providerId: string;
    credentialId: string;
    contextData?: Record<string, unknown>;
  }
): Promise<Result<AgentTask, Error>> {
  // 1. Validate inputs
  // 2. Create agent_tasks record
  // 3. Create Environment CR for agent execution
  // 4. Create K8s Secret with credentials
  // 5. Operator will provision environment and start agent
}

export async function getAgentTask(id: string): Promise<AgentTask | null> {
  // Get task details with status
}

export async function listAgentTasks(
  filters?: {
    projectId?: string;
    status?: string;
    createdBy?: string;
  }
): Promise<AgentTask[]> {
  // List tasks with optional filters
}

export async function cancelAgentTask(id: string): Promise<Result<void, Error>> {
  // Cancel a running task
  // Delete Environment CR, operator will clean up
}

export async function getAgentTaskLogs(
  taskId: string,
  options?: {
    since?: Date;
    level?: string;
    limit?: number;
  }
): Promise<AgentTaskLog[]> {
  // Get task logs for debugging
}
```

### Webhook Integration

```typescript
// src/models/agent-tasks.ts

export async function createAgentTaskFromPullRequest(
  pullRequestId: string,
  instructions: string,
  credentialId: string
): Promise<Result<AgentTask, Error>> {
  // Helper to create agent task from PR context
  // Includes PR diff, comments, issue references
}

export async function createAgentTaskFromIssue(
  issueId: string,
  instructions: string,
  credentialId: string
): Promise<Result<AgentTask, Error>> {
  // Helper to create agent task from issue context
  // Includes issue body, labels, related PRs
}
```

## UI Components

### Agent Provider Setup Page

- `src/app/settings/agents/page.tsx` - List configured agent credentials
- `src/app/settings/agents/new/page.tsx` - Add new agent credential
- `src/components/agents/ProviderCard.tsx` - Display agent provider info
- `src/components/agents/CredentialForm.tsx` - Form to add/edit credentials

### Agent Task Management

- `src/app/projects/[slug]/agents/page.tsx` - List agent tasks for project
- `src/app/projects/[slug]/agents/new/page.tsx` - Create new agent task
- `src/app/projects/[slug]/agents/[taskId]/page.tsx` - Task detail with logs
- `src/components/agents/TaskList.tsx` - Display task list with status
- `src/components/agents/TaskDetail.tsx` - Task details and logs
- `src/components/agents/TaskCreationForm.tsx` - Form to create agent task

### PR/Issue Integration

- `src/components/pull-requests/AgentButton.tsx` - Quick action to invoke agent on PR
- `src/components/issues/AgentButton.tsx` - Quick action to invoke agent on issue

## Operator Implementation

### Agent Task Reconciler

```go
// operator/internal/controller/environment_controller.go

func (r *EnvironmentReconciler) reconcileAgentWorkspace(
  ctx context.Context,
  env *catalystv1alpha1.Environment,
) (ctrl.Result, error) {
  // 1. Create namespace if not exists
  // 2. Apply ResourceQuota and NetworkPolicy
  // 3. Create Secret with agent credentials
  // 4. Clone repository into PVC
  // 5. Create Job to run agent CLI with instructions
  // 6. Monitor Job status and update Environment status
  // 7. Capture outputs (commits, logs) and update database
  // 8. Clean up on completion or timeout
}
```

### Agent Job Specification

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: agent-task-abc123
  namespace: agent-workspace-abc123
spec:
  ttlSecondsAfterFinished: 3600
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: agent-workspace
      volumes:
        - name: repo
          emptyDir: {}
        - name: agent-config
          configMap:
            name: agent-task-abc123-config
      containers:
        - name: agent
          image: ghcr.io/catalyst/agent-runner:latest
          env:
            - name: AGENT_PROVIDER
              value: claude-code
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: agent-task-abc123-credentials
                  key: api-key
            - name: TASK_INSTRUCTIONS
              valueFrom:
                configMapKeyRef:
                  name: agent-task-abc123-config
                  key: instructions
            - name: REPO_URL
              value: https://github.com/org/repo
            - name: BRANCH
              value: feature-branch
          volumeMounts:
            - name: repo
              mountPath: /workspace
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
```

## Agent Runner Container

A custom container image that can execute different agent CLIs:

```dockerfile
# dockerfiles/agent-runner/Dockerfile

FROM node:20-slim

# Install common dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install agent CLIs
RUN npm install -g @anthropic-ai/cli  # Claude Code
RUN pip3 install aider-chat            # Aider
# Additional agents installed on-demand

# Entry point script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /workspace
ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/bash
# dockerfiles/agent-runner/entrypoint.sh

set -e

# Clone repository if not already present
if [ ! -d ".git" ]; then
  git clone -b "$BRANCH" "$REPO_URL" .
fi

# Configure git for commits
git config user.name "Catalyst Agent"
git config user.email "agent@catalyst.dev"

# Run the appropriate agent based on AGENT_PROVIDER
case "$AGENT_PROVIDER" in
  claude-code)
    echo "$TASK_INSTRUCTIONS" | claude --non-interactive
    ;;
  aider)
    echo "$TASK_INSTRUCTIONS" | aider --yes --no-auto-commits
    ;;
  codex-cli)
    echo "$TASK_INSTRUCTIONS" | codex
    ;;
  *)
    echo "Unknown agent provider: $AGENT_PROVIDER"
    exit 1
    ;;
esac

# Push commits if any
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "Agent: $AGENT_PROVIDER - $TASK_INSTRUCTIONS"
  git push origin "$BRANCH"
fi
```

## Security Boundaries

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: agent-workspace-policy
  namespace: agent-workspace-abc123
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # Allow HTTPS to external APIs (OpenAI, Anthropic, etc.)
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 443
    # Block all other egress
```

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: agent-workspace-quota
  namespace: agent-workspace-abc123
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    persistentvolumeclaims: "2"
```

### RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: agent-workspace
  namespace: agent-workspace-abc123
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: agent-workspace-role
  namespace: agent-workspace-abc123
rules:
  # Agents can only interact with resources in their own namespace
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "create", "update", "delete"]
  # No access to secrets (credentials injected via env)
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: agent-workspace-binding
  namespace: agent-workspace-abc123
subjects:
  - kind: ServiceAccount
    name: agent-workspace
roleRef:
  kind: Role
  name: agent-workspace-role
  apiGroup: rbac.authorization.k8s.io
```

## MCP (Model Context Protocol) Integration

Extend existing MCP server with agent management tools:

```typescript
// src/app/api/mcp/route.ts additions

const agentTools = {
  list_agent_providers: {
    description: "List available coding agent providers",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  create_agent_task: {
    description: "Create a new agent task for a project",
    inputSchema: {
      type: "object",
      properties: {
        projectSlug: { type: "string" },
        taskType: { type: "string" },
        instructions: { type: "string" },
        contextType: { type: "string" },
        contextId: { type: "string" },
      },
      required: ["projectSlug", "taskType", "instructions"],
    },
  },
  get_agent_task: {
    description: "Get details of an agent task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
    },
  },
  get_agent_task_logs: {
    description: "Get logs from an agent task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        limit: { type: "number" },
      },
      required: ["taskId"],
    },
  },
};
```

## Spike Work

### Spike 1: Agent CLI Integration

**Goal**: Validate that we can successfully run Claude Code and Aider in a container with context injection and capture outputs.

**Approach**: 
1. Create a simple Dockerfile with both CLIs installed
2. Mount a test repository
3. Provide instructions via environment variables
4. Verify agents can make commits and we can capture them

**Success Criteria**: 
- Both agents can be invoked programmatically
- Instructions can be injected via env vars or stdin
- Commits are captured and can be pushed
- Logs are accessible

**Findings**: [TBD after spike]

### Spike 2: Credential Injection

**Goal**: Validate secure credential injection pattern (Secret → Env → Agent CLI)

**Approach**:
1. Create K8s Secret with test API key
2. Mount as environment variable in Pod
3. Verify agent CLI can authenticate
4. Ensure credentials are not logged or persisted

**Success Criteria**:
- API key successfully authenticates with provider
- No credentials appear in logs or filesystem
- Credentials are ephemeral (deleted with namespace)

**Findings**: [TBD after spike]

## Metrics

| Metric | Target | Measurement Method |
| --- | --- | --- |
| Agent task creation time | < 30s | Time from createAgentTask() call to Environment provisioned |
| Task completion rate | > 90% | Percentage of tasks that complete without errors |
| Average task duration | < 10 min | Mean time from start to completion for completed tasks |
| Credential setup time | < 2 min | Time for user to add and test a new agent credential |
| API key security | 100% encrypted | All API keys encrypted at rest using AES-256-GCM |

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Agent CLI instability | High | Implement timeouts, retry logic, and graceful failure handling |
| Credential leakage | Critical | Encrypt at rest, ephemeral injection, audit logging, no persistence in containers |
| Resource exhaustion | Medium | Strict ResourceQuotas, timeout enforcement, limit concurrent tasks per user |
| Agent cost overruns | Medium | User-controlled credentials, display usage estimates, implement optional spend limits |
| Network policy conflicts | Medium | Test agent egress requirements, allow only necessary external APIs |
| Operator reconciliation failures | High | Implement robust error handling, status reporting, manual retry options |

## File Structure

```
operator/
├── internal/controller/
│   └── environment_controller.go    # Add agent workspace reconciliation

dockerfiles/
└── agent-runner/
    ├── Dockerfile                    # Multi-agent container image
    └── entrypoint.sh                 # Agent execution script

web/
├── src/
│   ├── db/
│   │   └── schema.ts                 # Add agent tables
│   ├── models/
│   │   ├── agent-providers.ts        # Agent provider logic
│   │   ├── agent-credentials.ts      # Credential encryption/decryption
│   │   └── agent-tasks.ts            # Task orchestration logic
│   ├── actions/
│   │   ├── agent-providers.ts        # Provider actions
│   │   ├── user-agent-credentials.ts # Credential management actions
│   │   └── agent-tasks.ts            # Task management actions
│   ├── app/
│   │   ├── settings/
│   │   │   └── agents/
│   │   │       ├── page.tsx          # List credentials
│   │   │       └── new/page.tsx      # Add credential
│   │   ├── projects/[slug]/
│   │   │   └── agents/
│   │   │       ├── page.tsx          # List tasks
│   │   │       ├── new/page.tsx      # Create task
│   │   │       └── [taskId]/page.tsx # Task detail
│   │   └── api/
│   │       └── mcp/route.ts          # Add agent tools
│   └── components/
│       └── agents/
│           ├── ProviderCard.tsx      # Provider info display
│           ├── CredentialForm.tsx    # Add/edit credentials
│           ├── TaskList.tsx          # Task list with status
│           ├── TaskDetail.tsx        # Task details and logs
│           └── TaskCreationForm.tsx  # Create task form
```

## Dependencies

### New Package Dependencies

- None required (uses existing dependencies)

### Infrastructure Dependencies

- Existing Kubernetes operator (to be extended)
- Existing encryption utilities (for API key storage)
- Existing Environment CRD (to be extended with agent-workspace type)

## Implementation Phases

See `tasks.md` for detailed phase breakdown.

### Phase 1: Core Infrastructure
- Database schema and migrations
- Agent provider configuration
- Basic operator support for agent workspaces

### Phase 2: Credential Management
- User credential storage and encryption
- Credential management UI
- Credential testing

### Phase 3: Task Orchestration
- Agent task creation and management
- Environment provisioning for agent execution
- Basic agent runner container

### Phase 4: Integration & UI
- Task management UI
- PR/Issue integration
- MCP tools

### Phase 5: Multi-Agent Support
- Support for multiple agent providers (Claude Code, Aider, Codex CLI, Cline)
- Agent-specific configuration and features
- Advanced features (hooks, subagents, plans)
