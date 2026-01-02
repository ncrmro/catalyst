# CLI Coding Agents Harness Specification

**Spec**: `006-cli-codeing-agents-harness`
**Created**: 2025-12-25
**Status**: Draft

## Why

The ecosystem of CLI-based coding agents (Claude Code, OpenAI Codex CLI, Aider, Cline, etc.) is rapidly evolving with sophisticated capabilities: hooks for workflow customization, subagents for parallel task execution, plan files for structured problem-solving, and MCP integrations. Rather than building a proprietary agent from scratch, Catalyst can harness these existing tools, allowing users to leverage their own subscriptions while benefiting from each agent's continued innovation.

This approach provides immediate access to cutting-edge agent capabilities without maintaining a competing implementation, while giving users the flexibility to use whichever coding agent best fits their workflow and subscription model.

## User Stories

### US-1: Configure Agent Credentials (P1)

As a developer, I want to securely configure my AI agent API keys in Catalyst so that I can use my own subscriptions to run automated coding tasks without sharing credentials with the platform.

**Why P1**: Core functionality required before any agent tasks can run. Enables users to leverage existing subscriptions without additional platform costs.

**Acceptance Criteria**:

1. **Given** I'm on the agent settings page, **When** I click "Add Credential", **Then** I see a form to select an agent provider and enter my API key
2. **Given** I've entered my API key, **When** I click "Test", **Then** the system validates the key with the provider and shows success/failure
3. **Given** I've saved a credential, **When** I view my credentials list, **Then** I see the masked key, provider name, and last used date
4. **Given** I have a saved credential, **When** I delete it, **Then** it's removed from the database and cannot be used for new tasks

---

### US-2: Create Agent Task from UI (P1)

As a developer, I want to create an agent task by providing instructions and selecting my configured agent so that the agent can work autonomously on my codebase.

**Why P1**: Primary user interface for invoking agents. Delivers immediate value by allowing manual agent invocation for any development task.

**Acceptance Criteria**:

1. **Given** I'm viewing a project, **When** I navigate to the Agents tab, **Then** I see a list of previous agent tasks and a "Create Task" button
2. **Given** I click "Create Task", **When** I fill in instructions and select agent/credential, **Then** a new task is created with "pending" status
3. **Given** A task is created, **When** the operator provisions the environment, **Then** the task status updates to "running"
4. **Given** An agent task is running, **When** I view the task detail page, **Then** I see live logs and current status
5. **Given** An agent task completes, **When** I view the task detail, **Then** I see generated commits, PR links, and summary

---

### US-3: Invoke Agent from Pull Request (P1)

As a developer, I want to invoke an agent directly from a pull request so that the agent can help with code review, testing, or implementing feedback without leaving the PR context.

**Why P1**: Streamlines the most common agent workflow—working on PR feedback. Provides contextual agent invocation that's integrated into existing developer workflow.

**Acceptance Criteria**:

1. **Given** I'm viewing a PR detail page, **When** I click "Invoke Agent", **Then** I see a dialog to enter instructions and select agent
2. **Given** I invoke an agent on a PR, **When** the task is created, **Then** the agent has full PR context (diff, comments, description)
3. **Given** An agent task is created from a PR, **When** the task starts, **Then** a comment is posted to the PR with a link to the task detail page
4. **Given** An agent completes work on a PR, **When** commits are made, **Then** they are pushed to the PR branch and visible in the PR

---

### US-4: Monitor Agent Task Progress (P2)

As a developer, I want to monitor my agent tasks in real-time with logs and status updates so that I can understand what the agent is doing and debug failures.

**Why P2**: Important for debugging and transparency, but not required for basic functionality. Can start with basic status display and enhance over time.

**Acceptance Criteria**:

1. **Given** I'm viewing a task detail page, **When** the agent is running, **Then** I see streaming logs from the agent execution
2. **Given** An agent task is running, **When** I refresh the page, **Then** I see updated status and any new log entries
3. **Given** An agent task fails, **When** I view the task detail, **Then** I see the error message and relevant logs
4. **Given** I have multiple tasks, **When** I view the project agents page, **Then** I see task counts by status (running, completed, failed)

---

### US-5: Invoke Agent via Issue Comment (P2)

As a developer, I want to invoke an agent by mentioning it in an issue comment (e.g., "@catalyst-agent implement this feature") so that agents can be triggered naturally in conversations.

**Why P2**: Adds convenience for issue-based workflows. Nice to have but not critical for MVP since users can manually create tasks from the UI.

**Acceptance Criteria**:

1. **Given** I comment on an issue with "@catalyst-agent [instructions]", **When** the webhook is received, **Then** an agent task is created automatically
2. **Given** An agent task is created from a comment, **When** the task starts, **Then** a reply comment is posted with a link to the task
3. **Given** An agent completes work from an issue, **When** a PR is created, **Then** the PR references the original issue

---

### US-6: Manage Agent Resource Limits (P3)

As a platform administrator, I want to configure resource limits (CPU, memory, timeout) for agent workspaces so that runaway agents don't exhaust cluster resources.

**Why P3**: Important for production but can use sensible defaults initially. Can be hardcoded in Phase 1 and made configurable later.

**Acceptance Criteria**:

1. **Given** I'm configuring a project, **When** I set agent resource limits, **Then** all agent tasks for that project use those limits
2. **Given** An agent task exceeds its timeout, **When** the timeout is reached, **Then** the task is cancelled and marked as "timeout"
3. **Given** An agent task exceeds memory limits, **When** the pod is OOM killed, **Then** the task is marked as "failed" with appropriate message

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

- **FR-001**: System MUST encrypt user API keys at rest using AES-256-GCM encryption
- **FR-002**: System MUST inject agent credentials ephemerally as environment variables, never persisting them in containers
- **FR-003**: System MUST create isolated Kubernetes namespaces for each agent task with ResourceQuota and NetworkPolicy
- **FR-004**: System MUST enforce timeouts on agent tasks (default: 1 hour, configurable per project)
- **FR-005**: System MUST capture and store agent execution logs for debugging and audit purposes
- **FR-006**: System MUST capture agent outputs (commits, PRs) and link them to the originating task
- **FR-007**: Users MUST be able to add, test, list, and delete their agent credentials
- **FR-008**: Users MUST be able to create agent tasks with custom instructions and context
- **FR-009**: Users MUST be able to view real-time status and logs for their agent tasks
- **FR-010**: Users MUST be able to cancel running agent tasks
- **FR-011**: System MUST post comments to PRs/issues when agent tasks start and complete
- **FR-012**: System MUST support multiple agent providers (Claude Code, Aider, Codex CLI, Cline)
- **FR-013**: System MUST provide MCP tools for AI agents to create and manage agent tasks

## Key Entities

- **AgentProvider**: Represents a CLI agent (Claude Code, Aider, etc.) with installation scripts and configuration templates
- **UserAgentCredential**: Stores encrypted API keys/tokens for a user's agent subscriptions
- **AgentTask**: Represents a single agent execution with instructions, context, status, and results
- **AgentTaskLog**: Individual log entries from agent execution
- **Environment (agent-workspace type)**: Kubernetes environment provisioned for agent execution

## Edge Cases

- **What happens when an agent API key is invalid or expired?**
  - Task fails immediately with clear error message
  - User is notified and prompted to update credential
  - Task can be retried after credential is fixed

- **What happens when an agent task times out?**
  - Kubernetes Job is terminated
  - Task status set to "timeout"
  - Partial work (commits) are still captured and linked
  - User can retry with increased timeout

- **What happens when an agent consumes excessive resources?**
  - ResourceQuota enforcement prevents single task from exhausting cluster
  - Task is terminated if memory limit exceeded (OOM killed)
  - Task status set to "failed" with resource limit error

- **What happens when multiple agents try to work on the same PR?**
  - Each agent gets its own isolated workspace
  - Agents work on separate branches or same branch (potential conflicts)
  - User responsible for managing concurrent agent tasks

- **What happens when an agent tries to access unauthorized resources?**
  - NetworkPolicy blocks unauthorized egress
  - RBAC prevents access outside agent namespace
  - Task fails with permission error

- **What happens if the agent CLI is unavailable or fails to install?**
  - Agent runner container fails to start
  - Task marked as "failed" with installation error
  - Logs show which agent installation failed

## Success Criteria

- **SC-001**: Users can add and test agent credentials in < 2 minutes
- **SC-002**: Agent tasks are provisioned and start running in < 30 seconds
- **SC-003**: Task completion rate > 90% (excluding user-cancelled tasks)
- **SC-004**: No credential leakage in logs, database, or containers (100% encrypted at rest, ephemeral in containers)
- **SC-005**: Agent workspaces respect resource limits 100% of the time
- **SC-006**: Users can view task logs in real-time with < 5 second delay

## Out of Scope

- Custom agent development (only supports existing CLI agents)
- Agent training or fine-tuning (uses existing provider APIs)
- Multi-agent orchestration in a single task (agents can't collaborate within one task)
- Agent cost tracking or spending limits (users manage via their own subscriptions)
- Advanced plan approval workflows (defer to Phase 8)
- Agent performance optimization beyond resource limits
- Integration with non-CLI agents (e.g., web-based agents)

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

## Benefits

1. **No Lock-in**: Users choose their preferred agent and subscription
2. **Rapid Innovation**: Benefit from each agent's improvements without code changes
3. **Familiar Tools**: Developers use the same agents locally and in CI
4. **Cost Transparency**: Users see and control their own API costs
5. **Extensibility**: New agents can be added without platform changes
