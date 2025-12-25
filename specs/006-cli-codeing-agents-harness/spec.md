# CLI Coding Agents Harness Specification

**Spec**: `006-cli-codeing-agents-harness`
**Created**: 2025-12-25
**Status**: Draft

## Why

The ecosystem of CLI-based coding agents (Claude Code, OpenAI Codex CLI, Aider, Cline, etc.) is rapidly evolving with sophisticated capabilities: hooks for workflow customization, subagents for parallel task execution, plan files for structured problem-solving, and MCP integrations. Rather than building a proprietary agent from scratch, Catalyst can harness these existing tools, allowing users to leverage their own subscriptions while benefiting from each agent's continued innovation.

This approach provides immediate access to cutting-edge agent capabilities without maintaining a competing implementation, while giving users the flexibility to use whichever coding agent best fits their workflow and subscription model.

## User Stories

### US-1: Configure Agent Credentials (P1)

As a developer, I want to securely configure my coding agent API keys (Anthropic, OpenAI, etc.) in Catalyst so that I can use my own subscriptions to run agents on my projects.

**Why P1**: Critical for MVP - users cannot use any agents without configured credentials. This is the foundational capability that enables all other features.

**Acceptance Criteria**:

1. **Given** I'm logged into Catalyst, **When** I navigate to agent settings, **Then** I can add/update API keys for supported agent providers
2. **Given** I enter an API key, **When** I save it, **Then** the key is encrypted (AES-256-GCM) and stored securely
3. **Given** I have configured API keys, **When** I view settings, **Then** keys are masked showing only last 4 characters

---

### US-2: Trigger Agent on Issue Assignment (P1)

As a developer, I want to assign an issue to a coding agent so that the agent automatically creates a branch, implements the changes, and opens a PR.

**Why P1**: Core value proposition - automated issue resolution is the primary use case that demonstrates immediate value to users.

**Acceptance Criteria**:

1. **Given** I have an open issue, **When** I assign it to a configured agent (via label or assignment), **Then** an agent environment is provisioned
2. **Given** an agent is processing an issue, **When** the agent completes work, **Then** a PR is created with the agent's changes
3. **Given** an agent creates a PR, **When** I view the PR, **Then** I see a summary comment from the agent explaining the changes

---

### US-3: Monitor Agent Execution (P2)

As a developer, I want to see real-time logs and status of running agents so that I can understand what the agent is doing and debug issues.

**Why P2**: Important for trust and debugging but not critical for initial adoption. Users can still use agents effectively without detailed monitoring.

**Acceptance Criteria**:

1. **Given** an agent is running, **When** I navigate to the agent dashboard, **Then** I see active agent jobs with status (queued/running/completed/failed)
2. **Given** I select a running agent job, **When** I view its details, **Then** I see streaming logs from the agent execution
3. **Given** an agent job completes, **When** I review the logs, **Then** I can see the full execution history including all commands run

---

### US-4: Configure Agent Behavior with Hooks (P3)

As a team lead, I want to define pre/post hooks for agent execution so that I can enforce code quality checks, run tests, or apply custom guardrails before agent changes are committed.

**Why P3**: Nice-to-have for advanced use cases. Basic agent execution provides value without custom hooks.

**Acceptance Criteria**:

1. **Given** I have agent permissions, **When** I configure project settings, **Then** I can define pre-execution and post-execution hook scripts
2. **Given** a pre-hook is defined, **When** an agent starts, **Then** the hook script runs first and can abort execution on failure
3. **Given** a post-hook is defined, **When** an agent completes, **Then** the hook script runs and can prevent PR creation on failure

---

## What

The CLI Coding Agents Harness enables running various coding agents within Catalyst-managed environments:

1. **Agent Execution Environment**: Devcontainers or Kubernetes-based environments configured to run CLI coding agents securely
2. **Subscription Passthrough**: Users authenticate with their own API keys/subscriptions (Anthropic, OpenAI, etc.)
3. **Capability Inheritance**: Full access to each agent's native features—hooks, subagents, plans, MCP tools
4. **Context Injection**: Repository state, issue details, and task context provided to agents at runtime
5. **Result Capture**: Agent outputs (commits, PRs, comments) captured and reported back to VCS

### Supported Agents (Initial)

- **Claude Code**: Anthropic's CLI with hooks, subagents, and plan mode
- **Codex CLI**: OpenAI's coding assistant
- **Aider**: Open-source AI pair programming tool
- **Cline**: VS Code-based agent (via headless mode)

## Functional Requirements

- **FR-001**: System MUST support multiple agent providers (Claude Code, Aider, Codex CLI, Cline) with extensible architecture for future agents
- **FR-002**: System MUST encrypt user API keys using AES-256-GCM before storage
- **FR-003**: System MUST inject API keys as environment variables at runtime only, with no persistent storage in agent environments
- **FR-004**: System MUST provision isolated Kubernetes namespaces for each agent execution
- **FR-005**: System MUST enforce resource quotas (CPU, memory, time limits) on agent environments
- **FR-006**: System MUST capture agent execution logs and make them accessible to users
- **FR-007**: System MUST create feature branches for agent work and open PRs with agent-generated changes
- **FR-008**: System MUST support agent execution triggers via issue assignment, PR comments, or direct invocation
- **FR-009**: System MUST support custom pre/post execution hooks for validation and guardrails
- **FR-010**: System MUST apply network policies restricting agent access to only configured APIs
- **FR-011**: System MUST provide audit logging of all agent actions for security compliance
- **FR-012**: Users MUST be able to view and manage their agent credentials through the UI
- **FR-013**: Users MUST be able to monitor active agent jobs with real-time status updates
- **FR-014**: System MUST inject repository context (issue details, PR diffs, file content) to agents at runtime

## Key Entities

- **AgentProvider**: Represents a supported coding agent type (Claude Code, Aider, etc.) with installation and invocation instructions
- **AgentCredential**: Encrypted API key for a specific provider, owned by a user
- **AgentJob**: An execution instance of an agent working on a task, linked to an issue or PR
- **AgentEnvironment**: Kubernetes namespace provisioned for an agent job, with resource quotas and network policies
- **AgentHook**: Pre/post execution script for custom validation or guardrails, defined at project or team level
- **AgentLog**: Captured stdout/stderr from agent execution for debugging

## How

### 1. Environment Provisioning

When a task is assigned to an agent (via issue assignment, PR comment, or direct invocation):

1. Platform provisions an Agent Environment (per Spec 001-environments)
2. Repository is cloned with appropriate branch checked out
3. Devcontainer configuration (if present) is used for environment setup
4. Agent CLI is installed and configured

### 2. Authentication & Subscription

Users configure their agent credentials in Catalyst:

- API keys stored encrypted (AES-256-GCM)
- Keys injected as environment variables at runtime
- No credential storage on agent side—ephemeral injection only
- Users maintain their own subscription limits and billing

### 3. Task Execution

The harness orchestrates agent execution:

```
Task Assignment → Environment Provisioning → Agent Invocation → Result Capture → VCS Update
```

- **Context Provided**: Issue body, PR diff, related files, project conventions
- **Agent Hooks**: Platform can inject pre/post hooks for logging, validation, guardrails
- **Subagents**: Agents can spawn their own subagents within resource limits
- **Plans**: Agent-generated plans can be surfaced for human approval before execution

### 4. Result Reporting

Agent outputs are captured and reported:

- Commits pushed to feature branches
- PRs created or updated with agent commentary
- Issue comments posted with progress updates
- Structured logs captured for debugging

### 5. Security Boundaries

Agents operate within strict constraints:

- Namespace-isolated Kubernetes environments
- Network policies restricting external access (except to configured APIs)
- Resource quotas (CPU, memory, time limits)
- No access to production namespaces or secrets outside their scope
- Audit logging of all agent actions

## Edge Cases

- **Concurrent Agent Executions**: What happens when multiple agents are assigned to the same repository/branch simultaneously? System should queue jobs or reject conflicting assignments.
- **API Key Rotation**: How does system handle when user updates/rotates API keys while agents are running? Running jobs should complete with old key, new jobs use new key.
- **Agent Timeout**: What happens when an agent exceeds time limits? System should terminate the agent, preserve logs, and notify user of timeout.
- **Network Failures**: How does system handle when agent cannot reach external APIs? Should retry with exponential backoff and fail gracefully with error logs.
- **Repository Size Limits**: What happens with very large repositories (>5GB)? System should enforce size limits and fail fast with clear error message.
- **Malformed Agent Output**: How does system handle when agent produces invalid commits or non-standard PR format? Validation hooks should catch issues before PR creation.
- **Credential Validation**: What happens when user enters invalid API key? System should validate key on save by making test API call to provider.
- **Resource Exhaustion**: How does system handle when agent consumes all allocated resources? Kubernetes will enforce quotas and terminate pod, logs captured before termination.

## Success Criteria

- **SC-001**: Users can configure agent credentials in <30 seconds with clear UI guidance
- **SC-002**: Agent job provisioning completes in <60 seconds from trigger to agent start
- **SC-003**: 95% of agent jobs complete successfully without manual intervention
- **SC-004**: Agent logs are available within 5 seconds of log generation for real-time monitoring
- **SC-005**: Zero credential leaks - all API keys remain encrypted at rest and in transit
- **SC-006**: Agent environments are isolated with network policies preventing unauthorized access

## Out of Scope

- **Agent Training/Fine-tuning**: Users leverage existing agent capabilities, no custom model training
- **Agent-to-Agent Communication**: Agents operate independently, no direct inter-agent messaging
- **Local Agent Execution**: This spec covers server-side execution only, not local development workflows
- **Agent Marketplace**: No directory or rating system for discovering agents, users configure known agents
- **Usage Analytics/Cost Tracking**: Users manage their own API usage through provider dashboards
- **Custom Agent Development**: System supports existing CLI agents only, not custom agent creation

## Open Questions

- [ ] Should we support agent plan approval workflows where users review AI-generated plans before execution?
- [ ] Do we need agent execution history/replay for debugging purposes?
- [ ] Should agents have access to previous PR review comments for context?
- [ ] How should we handle agent failures - auto-retry or require manual intervention?

## Benefits

1. **No Lock-in**: Users choose their preferred agent and subscription
2. **Rapid Innovation**: Benefit from each agent's improvements without code changes
3. **Familiar Tools**: Developers use the same agents locally and in CI
4. **Cost Transparency**: Users see and control their own API costs
5. **Extensibility**: New agents can be added without platform changes
