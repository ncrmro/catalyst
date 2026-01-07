# Implementation Plan: CLI Coding Agents Harness

**Spec**: `006-cli-codeing-agents-harness`
**Branch**: `006-cli-agents-harness`
**Created**: 2025-12-25

## Summary

Implement a harness for running CLI-based coding agents (Claude Code, Aider, Codex CLI, Cline) within Catalyst-managed Kubernetes environments. Users provide their own API credentials, and agents execute within isolated namespaces with resource quotas and network policies. Primary technical approach: extend existing environment provisioning (Spec 001-environments) with agent-specific configurations and job orchestration.

## Technical Context

**Language/Framework**: TypeScript, Next.js 15, React 19
**Primary Dependencies**: Drizzle ORM, Kubernetes Client API, crypto (Node.js built-in)
**Storage**: PostgreSQL (agent credentials, job tracking)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Infrastructure**: Kubernetes with namespace isolation, network policies

## Data Model

```typescript
// src/db/schema.ts

// Supported agent providers
export const agentProviders = pgTable('agent_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(), // 'claude-code', 'aider', 'codex-cli', 'cline'
  displayName: varchar('display_name', { length: 100 }).notNull(), // 'Claude Code'
  installCommand: text('install_command').notNull(), // npm install -g @anthropic/claude-cli
  invokeCommand: text('invoke_command').notNull(), // claude-code --task "{task}"
  requiresApiKey: boolean('requires_api_key').notNull().default(true),
  apiKeyEnvVar: varchar('api_key_env_var', { length: 100 }), // ANTHROPIC_API_KEY
  documentationUrl: text('documentation_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User credentials for agent providers
export const agentCredentials = pgTable('agent_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').notNull().references(() => agentProviders.id, { onDelete: 'cascade' }),
  encryptedApiKey: text('encrypted_api_key').notNull(), // AES-256-GCM encrypted
  encryptedApiKeyIv: text('encrypted_api_key_iv').notNull(), // Initialization vector
  encryptedApiKeyTag: text('encrypted_api_key_tag').notNull(), // Authentication tag
  keyLastFour: varchar('key_last_four', { length: 4 }).notNull(), // For display
  isValid: boolean('is_valid').notNull().default(true), // Validated on creation
  lastValidatedAt: timestamp('last_validated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProviderUnique: uniqueIndex('agent_credentials_user_provider_idx').on(table.userId, table.providerId),
}));

// Agent execution jobs
export const agentJobs = pgTable('agent_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').notNull().references(() => agentProviders.id),
  
  // Trigger context
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'issue_assignment', 'pr_comment', 'manual'
  issueId: uuid('issue_id').references(() => issues.id, { onDelete: 'set null' }),
  pullRequestId: uuid('pull_request_id').references(() => pullRequests.id, { onDelete: 'set null' }),
  taskDescription: text('task_description').notNull(),
  
  // Execution details
  status: varchar('status', { length: 50 }).notNull().default('queued'), // queued, provisioning, running, completed, failed, timeout, cancelled
  namespace: varchar('namespace', { length: 255 }), // Kubernetes namespace
  podName: varchar('pod_name', { length: 255 }), // Kubernetes pod name
  branch: varchar('branch', { length: 255 }), // Git branch created for agent work
  
  // Results
  pullRequestUrl: text('pull_request_url'), // URL of created PR
  errorMessage: text('error_message'),
  exitCode: integer('exit_code'),
  
  // Timing
  queuedAt: timestamp('queued_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Agent execution logs
export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => agentJobs.id, { onDelete: 'cascade' }),
  logType: varchar('log_type', { length: 50 }).notNull(), // 'stdout', 'stderr', 'system'
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  jobTimestampIdx: index('agent_logs_job_timestamp_idx').on(table.jobId, table.timestamp),
}));

// Custom hooks for agent execution
export const agentHooks = pgTable('agent_hooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  hookType: varchar('hook_type', { length: 50 }).notNull(), // 'pre_execution', 'post_execution'
  name: varchar('name', { length: 255 }).notNull(),
  script: text('script').notNull(), // Shell script to execute
  timeoutSeconds: integer('timeout_seconds').notNull().default(300),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Either project-level or team-level, not both
  checkProjectOrTeam: check('check_project_or_team', 
    sql`(project_id IS NOT NULL AND team_id IS NULL) OR (project_id IS NULL AND team_id IS NOT NULL)`)
}));
```

## API/Actions

```typescript
// src/actions/agent-credentials.ts

export async function saveAgentCredential(
  input: SaveAgentCredentialInput,
): Promise<Result<AgentCredential, SaveCredentialError>> {
  // 1. Validate API key by making test call to provider
  // 2. Encrypt API key using AES-256-GCM
  // 3. Store encrypted key, IV, and auth tag
  // 4. Return credential with masked key
}

export async function getAgentCredentials(
  userId: string,
): Promise<Result<AgentCredential[], Error>> {
  // Return all credentials for user with masked API keys
}

export async function deleteAgentCredential(
  credentialId: string,
): Promise<Result<void, Error>> {
  // Soft delete by marking as invalid or hard delete
}

// src/actions/agent-jobs.ts

export async function triggerAgentJob(
  input: TriggerAgentJobInput,
): Promise<Result<AgentJob, TriggerJobError>> {
  // 1. Validate user has credentials for selected provider
  // 2. Create agent job record with 'queued' status
  // 3. Queue job for processing (background worker or immediate)
  // 4. Return job ID for tracking
}

export async function getAgentJobs(
  filters: AgentJobFilters,
): Promise<Result<AgentJob[], Error>> {
  // Return jobs filtered by user, project, status, etc.
}

export async function getAgentJobDetails(
  jobId: string,
): Promise<Result<AgentJobWithLogs, Error>> {
  // Return job with associated logs
}

export async function cancelAgentJob(
  jobId: string,
): Promise<Result<void, Error>> {
  // Cancel running job, cleanup Kubernetes resources
}

export async function streamAgentLogs(
  jobId: string,
): Promise<ReadableStream<AgentLog>> {
  // Stream logs in real-time for active jobs
}

// src/actions/agent-hooks.ts

export async function createAgentHook(
  input: CreateAgentHookInput,
): Promise<Result<AgentHook, CreateHookError>> {
  // Create custom pre/post execution hook
}

export async function getAgentHooks(
  projectOrTeamId: string,
  scope: 'project' | 'team',
): Promise<Result<AgentHook[], Error>> {
  // Return hooks for project or team
}
```

## UI Components

- **AgentCredentialsPage** (`/settings/agents`): Manage API credentials for agent providers
  - List of configured providers with masked keys
  - Add/edit credential form with validation
  - Delete credential confirmation
  
- **AgentJobsPage** (`/agent-jobs`): View and monitor agent executions
  - Table of jobs with status, project, trigger type, duration
  - Filters by status, provider, date range
  - Click to view job details
  
- **AgentJobDetailsPage** (`/agent-jobs/[id]`): Detailed view of specific job
  - Job metadata (trigger, project, status, timing)
  - Real-time streaming logs
  - Link to created PR (if completed)
  - Cancel job button (if running)
  
- **AgentHooksPage** (`/projects/[slug]/agents/hooks`): Configure custom hooks
  - List of pre/post execution hooks
  - Add/edit hook form with script editor
  - Enable/disable toggle
  
- **IssueAgentAssignment** (component): Assign issue to agent
  - Dropdown to select agent provider
  - Submit button to trigger agent job

## Spike Work

### Spike: Agent CLI Installation and Invocation

**Goal**: Validate that we can programmatically install and invoke different agent CLIs within Kubernetes pods

**Approach**: 
1. Create test pod with Node.js/Python base image
2. Write script to install claude-code, aider, codex-cli
3. Test invocation with sample task and API key
4. Measure installation time and resource requirements

**Success Criteria**: All target agents can be installed via script and invoked with API keys, completing a simple code modification task

**Findings**: [To be filled after spike]

---

### Spike: API Key Encryption/Decryption

**Goal**: Validate AES-256-GCM encryption performance and security for API key storage

**Approach**:
1. Implement encryption/decryption functions using Node.js crypto module
2. Test with sample API keys
3. Benchmark encryption/decryption performance
4. Verify encrypted values are not reversible without key

**Success Criteria**: Encryption is fast (<1ms), secure, and decryption works reliably

**Findings**: [To be filled after spike]

## Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Credential setup time | <30 seconds | Time from user clicking "Add Credential" to successful save |
| Job provisioning time | <60 seconds | Time from trigger to agent start executing |
| Job success rate | >95% | (Completed jobs / Total jobs) × 100 |
| Log latency | <5 seconds | Time from log generation to UI display |
| Credential security | 0 leaks | Security audits, penetration testing |
| Resource utilization | <2GB RAM, <1 CPU per agent | Kubernetes resource monitoring |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Agent CLI breaking changes | High | Version-pin agent installations, monitor release notes, add health checks |
| API key leakage in logs | Critical | Scrub logs for patterns matching API keys before storage/display |
| Runaway agent resource usage | High | Enforce strict Kubernetes resource quotas and timeouts |
| Agent produces malicious code | High | Implement code review hooks, require human approval before merge |
| Multiple agents conflict on same repo | Medium | Queue jobs per repository, prevent concurrent execution on same branch |
| Network policies too restrictive | Medium | Provide configuration UI to allow additional API endpoints |

## File Structure

```
web/src/
├── db/
│   └── schema.ts                      # Add agent tables
├── models/
│   ├── agent-credentials.ts           # Credential encryption/decryption
│   ├── agent-jobs.ts                  # Job orchestration
│   ├── agent-providers.ts             # Provider configuration
│   └── agent-hooks.ts                 # Hook execution
├── actions/
│   ├── agent-credentials.ts           # Credential management actions
│   ├── agent-jobs.ts                  # Job management actions
│   └── agent-hooks.ts                 # Hook management actions
├── app/(dashboard)/
│   ├── agent-jobs/
│   │   ├── page.tsx                   # Jobs list
│   │   └── [id]/page.tsx              # Job details
│   ├── settings/
│   │   └── agents/
│   │       └── page.tsx               # Agent credentials
│   └── projects/[slug]/agents/
│       └── hooks/
│           └── page.tsx               # Agent hooks
├── components/
│   └── agents/
│       ├── AgentCredentialForm.tsx    # Add/edit credentials
│       ├── AgentJobsList.tsx          # Jobs table
│       ├── AgentJobDetails.tsx        # Job detail view
│       ├── AgentLogStream.tsx         # Real-time logs
│       └── AgentHookEditor.tsx        # Hook script editor
├── lib/
│   ├── agent-encryption.ts            # AES-256-GCM encryption
│   ├── agent-kubernetes.ts            # K8s orchestration
│   └── agent-providers.ts             # Provider configs
└── workers/
    └── agent-job-processor.ts         # Background job processing

web/__tests__/
├── unit/
│   ├── lib/
│   │   ├── agent-encryption.test.ts   # Encryption tests
│   │   └── agent-providers.test.ts    # Provider config tests
│   └── models/
│       ├── agent-credentials.test.ts  # Credential model tests
│       └── agent-jobs.test.ts         # Job model tests
├── integration/
│   ├── agent-job-lifecycle.test.ts    # End-to-end job flow
│   └── agent-kubernetes.test.ts       # K8s integration
└── e2e/
    ├── agent-credentials.spec.ts      # Credential management E2E
    ├── agent-jobs.spec.ts             # Job execution E2E
    └── agent-hooks.spec.ts            # Hook configuration E2E
```

## Dependencies

- `@kubernetes/client-node` (already exists) - Kubernetes API interactions
- No new external dependencies required - use Node.js built-in `crypto` module for encryption
- Consider adding `zod` schemas for validation (already exists)

## Integration Points

- **Spec 001-environments**: Leverage existing environment provisioning for agent namespaces
- **GitHub Integration**: Use existing VCS integration for PR creation and issue tracking
- **Authentication**: Use existing NextAuth.js setup for user context
- **Database**: Extend existing Drizzle schema with agent tables
