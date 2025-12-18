# CLI Coding Agents Harness Specification

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
