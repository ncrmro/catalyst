# CLI Coding Agents Harness Specification

**Spec**: `006-cli-coding-agents-harness`
**Created**: 2025-01-20
**Status**: Draft

---

## Why

The ecosystem of CLI-based coding agents (Claude Code, OpenAI Codex CLI, Aider, Cline, etc.) is rapidly evolving with sophisticated capabilities: hooks for workflow customization, subagents for parallel task execution, plan files for structured problem-solving, and MCP integrations. Rather than building a proprietary agent from scratch, Catalyst can harness these existing tools, allowing users to leverage their own subscriptions while benefiting from each agent's continued innovation.

This approach provides immediate access to cutting-edge agent capabilities without maintaining a competing implementation, while giving users the flexibility to use whichever coding agent best fits their workflow and subscription model.

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

---

## User Stories

### US-1: Assign Issue to Coding Agent (P1)

As a developer, I want to assign a GitHub issue to a coding agent so that the agent can autonomously work on implementing the requested feature or fix.

**Why P1**: Core value proposition—enabling AI agents to work autonomously on tasks is the primary use case for the harness.

**Acceptance Criteria**:

1. **Given** a GitHub issue with sufficient context, **When** I assign the issue to the Catalyst agent user, **Then** the platform provisions an Agent Environment with the repository cloned
2. **Given** an Agent Environment is provisioned, **When** the configured coding agent (Claude Code, Aider, etc.) starts, **Then** it receives the issue context and begins working
3. **Given** the agent completes its work, **When** it has code changes ready, **Then** the agent creates a PR linked to the original issue
4. **Given** the agent encounters blockers, **When** it cannot proceed, **Then** it posts a comment on the issue explaining what's needed

---

### US-2: Configure Agent Credentials (P1)

As a user, I want to securely configure my API credentials for different coding agents so that agents can authenticate with my subscriptions.

**Why P1**: Without credentials, no agent can function—this is a prerequisite for all agent operations.

**Acceptance Criteria**:

1. **Given** I'm on the project settings page, **When** I navigate to Agent Configuration, **Then** I see options to add credentials for supported agents
2. **Given** I enter my Anthropic API key, **When** I save the configuration, **Then** the key is encrypted and stored securely
3. **Given** an agent runs in my environment, **When** it needs API access, **Then** my credentials are injected as environment variables (ephemeral, not persisted in container)
4. **Given** I delete my credentials, **When** an agent tries to run, **Then** it fails gracefully with a clear error about missing credentials

---

### US-3: Agent-Assisted Code Review (P2)

As a maintainer, I want agents to perform preliminary code reviews on PRs so that I can focus on high-level design decisions.

**Why P2**: Augments human reviewers but isn't required for MVP task automation.

**Acceptance Criteria**:

1. **Given** a PR is opened in a configured repository, **When** I request agent review (via label or comment), **Then** an agent is invoked to review the changes
2. **Given** the agent reviews the code, **When** it finds issues, **Then** it posts inline comments at specific lines
3. **Given** the agent completes review, **When** everything looks good, **Then** it posts a summary comment with its findings

---

### US-4: Monitor Agent Progress (P2)

As a developer, I want to monitor an agent's progress in real-time so that I can intervene if needed.

**Why P2**: Important for visibility and trust, but agents should work autonomously.

**Acceptance Criteria**:

1. **Given** an agent is working on a task, **When** I visit the Agent Activity page, **Then** I see a live stream of the agent's actions
2. **Given** an agent is executing, **When** I view the environment, **Then** I can access logs and see what commands are running
3. **Given** an agent appears stuck, **When** I click "Terminate", **Then** the agent stops and the environment is cleaned up

---

### US-5: Plan Approval Workflow (P3)

As a team lead, I want agents to submit their implementation plans for approval before executing them so that I maintain control over significant changes.

**Why P3**: Nice-to-have governance feature; teams can opt-in based on their risk tolerance.

**Acceptance Criteria**:

1. **Given** an agent generates an implementation plan, **When** the project is configured for plan approval, **Then** the plan is posted for human review before execution
2. **Given** a plan is pending approval, **When** I approve it, **Then** the agent proceeds with implementation
3. **Given** a plan is pending approval, **When** I reject with feedback, **Then** the agent revises the plan or requests clarification

---

## Functional Requirements

- **FR-001**: System MUST provision isolated Kubernetes environments for agent execution (per Spec 001-environments)
- **FR-002**: System MUST support credential storage with AES-256-GCM encryption for API keys
- **FR-003**: System MUST inject credentials as environment variables at runtime (ephemeral injection)
- **FR-004**: System MUST support at least two initial agents: Claude Code and Aider
- **FR-005**: System MUST clone the repository with the appropriate branch checked out before agent invocation
- **FR-006**: System MUST pass task context (issue body, PR diff, project conventions) to the agent
- **FR-007**: System MUST capture agent-generated commits and push to feature branches
- **FR-008**: System MUST post status updates to the originating issue/PR
- **FR-009**: System MUST enforce resource quotas (CPU, memory, execution time) on agent environments
- **FR-010**: System MUST log all agent actions for audit purposes
- **FR-011**: System MUST support agent hook injection for pre/post processing
- **FR-012**: System MUST respect each agent's native features (subagents, plans, MCP tools)
- **FR-013**: System MUST allow termination of running agents by authorized users
- **FR-014**: System MUST clean up environments after agent completion or timeout

## Key Entities

- **AgentCredential**: Encrypted API key/token for a specific agent provider (Anthropic, OpenAI), scoped to user or team. Attributes: provider, encryptedKey, userId/teamId, createdAt, lastUsedAt
- **AgentTask**: A unit of work assigned to an agent. Links to source (issue/PR), target repository, branch, and status. Attributes: taskType, sourceUrl, repoId, branch, agentType, status, environmentId, createdAt, completedAt
- **AgentEnvironment**: A Kubernetes namespace provisioned for agent execution. Extends Environment CRD with agent-specific configuration. Attributes: task reference, resource limits, timeout, logs
- **AgentExecution**: Record of an agent run within a task. Captures start/end time, commits produced, comments posted, exit status. Attributes: taskId, environmentId, startedAt, endedAt, exitCode, commitsProduced[], commentsPosted[]
- **AgentConfig**: Per-project or per-team configuration for which agents are enabled, default behaviors, and approval workflows. Attributes: enabledAgents[], defaultAgent, requirePlanApproval, hooks[]

## Edge Cases

- **Missing Credentials**: What happens when an agent is invoked but the user hasn't configured credentials for that agent? → Task fails immediately with actionable error posted to issue/PR
- **Credential Expiration**: What if an API key becomes invalid mid-execution? → Agent fails gracefully, error logged, user notified to update credentials
- **Agent Timeout**: What happens when an agent exceeds the time limit? → Environment terminated, partial work preserved if possible, timeout notification posted
- **Concurrent Tasks**: What if the same issue is assigned to an agent while another is already working? → Second assignment queued or rejected with status message
- **Large Repositories**: How does the system handle very large repos with slow clone times? → Support shallow clones, warm caches, or pre-cloned base images
- **Network Failures**: What if the agent loses connectivity to the LLM API? → Retry with exponential backoff, eventually fail and report
- **Agent Crashes**: What if Claude Code or Aider crashes unexpectedly? → Capture crash logs, clean up environment, report failure
- **Conflicting Branches**: What if the agent tries to push to a branch that has new commits? → Rebase or fail with merge conflict notification
- **Secrets in Code**: What if the agent accidentally commits secrets? → Pre-push hooks scan for credentials, block push, alert user

## Success Criteria

- **SC-001**: Users can assign an issue to an agent and receive a working PR within 30 minutes for simple tasks
- **SC-002**: Agent credential configuration completes in under 2 minutes
- **SC-003**: 95% of agent environments provision successfully within 60 seconds
- **SC-004**: Agent activity is visible in real-time within 5 seconds of action
- **SC-005**: Failed agent runs provide clear, actionable error messages in 100% of cases
- **SC-006**: At least 2 agent types (Claude Code, Aider) supported at launch

## Out of Scope

- **Custom Agent Development**: Building proprietary coding agents is explicitly out of scope; we leverage existing tools
- **API Metering/Billing**: Users manage their own API provider billing; Catalyst does not meter LLM token usage
- **Agent Training/Fine-tuning**: We use agents as-is without customization of their underlying models
- **Local Agent Execution**: Initial scope is cloud-based environments only; local dev machine integration is future work
- **Multi-Agent Orchestration**: Complex workflows with multiple agents collaborating is deferred to future specs
- **IDE Integration**: VS Code extensions or similar IDE plugins are covered under Spec 007 (User-Agent Interfaces)

## Open Questions

- [ ] How should we handle agents that want to install additional tools in the environment? Allow devcontainer customization or maintain a standard base image?
- [ ] Should agent-generated PRs require human approval before merge, or should auto-merge be configurable?
- [ ] What's the appropriate default timeout for agent execution? 30 minutes? 1 hour?
- [ ] How do we handle agents that need to interact with external services (databases, APIs) during development?
- [ ] Should we support "bring your own agent" where users can configure arbitrary CLI tools as agents?
- [ ] How do we handle rate limiting from LLM providers? Should we queue tasks or fail fast?
