# Feature Specification: Agents

**Feature Branch**: `007-agents`
**Created**: 2025-01-04
**Status**: Draft
**Input**: User description: "Platform interfaces for human-agent collaboration across web, terminal, MCP, and VCS integrations (GitHub, GitLab, Gitea, Forgejo, future Catalyst internal repos)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Project-Context Agent Chat (Priority: P1)

A developer opens their project dashboard and wants to chat with an AI agent that understands their project context. They click the chat interface and ask "What are the open issues blocking the next release?" The agent, with access to their GitHub repository, lists the relevant issues with links and suggests prioritization based on labels and dependencies.

**Why this priority**: This is the foundational interface enabling all other agent interactions. Without project-aware chat, users cannot leverage agents for any meaningful work. Every subsequent user story depends on this capability.

**Independent Test**: Can be fully tested by starting a chat session and asking the agent to list open PRs or issues from the connected repository. Delivers immediate value by providing AI-assisted project visibility.

**Acceptance Scenarios**:

1. **Given** a user has a project with a connected VCS repository (GitHub, GitLab, Gitea, or Forgejo), **When** they open the agent chat interface, **Then** the agent has access to the repository's issues, PRs/MRs, branches, and commits.
2. **Given** a user is chatting with the agent, **When** they ask "create an issue titled 'Fix login bug' with label 'bug'", **Then** the agent creates the issue on the connected VCS provider and confirms with a link.
3. **Given** a user is chatting with the agent, **When** they ask the agent to comment on a PR/MR, **Then** the agent posts the comment to the specified PR/MR and confirms success.
4. **Given** the chat session, **When** the user asks for project status, **Then** the agent summarizes open PRs/MRs, recent commits, and blocking issues.

---

### User Story 2 - Spec-Grouped Task View (Priority: P2)

A project manager opens their project page and sees all tasks (PRs and issues) organized by spec. They can quickly see which specs have active work, which are blocked, and which are complete. Each spec section shows a summary of progress and has an "Agent" button for deeper interaction.

**Why this priority**: Organizing work by spec provides essential context for understanding project progress. This view enables efficient triage and connects the abstract (specs) to the concrete (PRs/issues).

**Independent Test**: Can be fully tested by viewing the project page and verifying that PRs/issues are grouped under their associated specs, with correct counts and status indicators.

**Acceptance Scenarios**:

1. **Given** a project with multiple specs and associated PRs/issues, **When** a user views the project page, **Then** tasks are grouped under their respective spec headings.
2. **Given** a spec with 3 open PRs and 2 closed issues, **When** the user views the spec section, **Then** they see the counts and status breakdown (e.g., "3 open PRs, 2 closed issues").
3. **Given** a spec section on the project page, **When** the user clicks the "Agent" button, **Then** they are taken to the spec detail page with the agent chat interface open.
4. **Given** a PR or issue without an associated spec, **When** viewing the project page, **Then** it appears in an "Unassigned" or "General" section.

---

### User Story 3 - Spec-Context Agent Interaction (Priority: P3)

A developer is working on the "user-auth" spec and wants to understand the current status across all related work. They click the agent button on the spec and ask "What's the status of this spec?" The agent responds with a summary of open PRs, pending tasks from tasks.md, branches in progress, and blockers. The developer then asks the agent to "create an issue for the password reset flow" and the agent creates it, automatically linking it to the spec.

**Why this priority**: Spec-aware agent interactions provide precision and reduce context-switching. This builds on P1 (general chat) and P2 (spec grouping) to enable focused, productive agent collaboration.

**Independent Test**: Can be fully tested by opening a spec's agent chat and asking for spec status. The agent should return accurate information about that spec's PRs, issues, and tasks.

**Acceptance Scenarios**:

1. **Given** a user opens the agent chat from a spec page, **When** the chat loads, **Then** the agent has the spec's context (spec.md, plan.md, tasks.md) pre-loaded.
2. **Given** a spec-context chat session, **When** the user asks "what tasks remain?", **Then** the agent lists uncompleted tasks from tasks.md with their status.
3. **Given** a spec-context chat session, **When** the user asks "show me all PRs for this spec", **Then** the agent lists PRs that reference this spec with their review status.
4. **Given** a spec-context chat session, **When** the user asks to create an issue, **Then** the issue is created with the spec slug as a label/tag for automatic grouping.
5. **Given** a spec-context chat session, **When** the user asks about blockers, **Then** the agent identifies dependencies, failing checks, or stalled reviews.

---

### User Story 4 - Cross-Platform Agent Orchestration (Priority: P4)

A developer wants to delegate work to an external AI coding agent (e.g., GitHub Copilot, GitLab Duo, or future equivalents). They tell the Catalyst agent: "Create an issue for implementing the login form, assign it to Copilot, and have Copilot start working on it." The agent creates the issue, assigns the external agent, and posts a comment mentioning the agent with instructions to begin implementation. The developer can then monitor the agent's PR/MR through the same interface.

**Why this priority**: This enables powerful automation by orchestrating external AI agents through our interface. It's a differentiating feature but requires P1-P3 to be functional first.

**Independent Test**: Can be fully tested by asking the agent to create an issue, assign it to an external AI agent, and comment with a mention. Verify the issue exists on the VCS provider with correct assignment and comment.

**Acceptance Scenarios**:

1. **Given** a project-context chat session on a supported VCS provider, **When** the user asks to create an issue and assign it to an external AI agent (e.g., Copilot), **Then** the agent creates the issue and uses the provider's assignment API.
2. **Given** an issue assigned to an external agent, **When** the user asks the agent to "tell [agent] to start working", **Then** the agent posts a comment mentioning the external agent with the relevant instructions.
3. **Given** an external agent creates a PR/MR from the issue, **When** the user views the project page, **Then** the PR/MR appears under the correct spec grouping.
4. **Given** an active external agent PR/MR, **When** the user asks "what's [agent] working on?", **Then** the Catalyst agent summarizes the PR/MR status and any review feedback.

---

### User Story 5 - TUI Agent Interface (Priority: P5)

A developer SSHed into a remote server wants to check their project status without opening a browser. They run `catalyst chat` and interact with the same agent through a terminal interface. They can ask questions, create issues, and review PR status all from the command line.

**Why this priority**: TUI provides accessibility for power users and low-bandwidth environments. It shares the same backend as the web interface, making it an incremental addition once P1 is complete.

**Independent Test**: Can be fully tested by running the TUI command and performing the same operations as the web chat (list issues, create issue, get project status).

**Acceptance Scenarios**:

1. **Given** a user runs `catalyst chat` in terminal, **When** authentication succeeds, **Then** they enter an interactive chat session with the project agent.
2. **Given** a TUI chat session, **When** the user types a query, **Then** they receive the same response quality as the web interface.
3. **Given** a TUI session, **When** the user asks to create an issue, **Then** the issue is created and a confirmation with link is displayed.

---

### User Story 6 - VCS ChatOps Integration (Priority: P6)

A developer mentions `@catalyst-bot` in a PR/MR comment asking for a code review. The bot responds with review feedback directly in the PR/MR. Another developer assigns `@catalyst-bot` to an issue, triggering the agent to analyze the issue and propose a solution or ask clarifying questions. This works across supported VCS providers (GitHub, GitLab, Gitea, Forgejo).

**Why this priority**: ChatOps meets developers where they already work. However, it requires robust agent capabilities (P1-P4) and webhook infrastructure before being useful.

**Independent Test**: Can be fully tested by mentioning @catalyst-bot in a PR/MR comment and verifying the bot responds appropriately within the VCS provider's interface.

**Acceptance Scenarios**:

1. **Given** a PR/MR exists on any supported VCS provider, **When** a user comments `@catalyst-bot review this`, **Then** the bot posts a code review comment within 2 minutes.
2. **Given** an issue exists, **When** a user assigns the catalyst bot user, **Then** the bot analyzes the issue and posts a comment with analysis or clarifying questions.
3. **Given** a PR/MR comment mentions `@catalyst-bot deploy to preview`, **When** the webhook is received, **Then** a preview environment is created and the URL is posted as a reply.

---

### Edge Cases

- What happens when the connected repository loses access (token revoked)?
- How does the system handle rate limiting from VCS provider APIs?
- What if a spec has no associated tasks.md file?
- How does the agent handle ambiguous commands ("create an issue" without details)?
- What happens when external agent assignment fails (not available for repo/provider)?
- How does the TUI handle long responses or streaming output?
- How do we handle feature parity gaps between VCS providers (e.g., GitLab MRs vs GitHub PRs)?
- What happens when a VCS provider doesn't support external AI agent assignment?

## Clarifications

### Session 2026-01-04

- Q: How are VCS issues and pull requests (PRs/MRs) associated with a specific "Spec" for the grouped views and context loading? → A: Title-based token matching as implemented in `web/src/lib/pr-spec-matching.ts` and `web/src/lib/issue-spec-matching.ts`.
- Q: How should the system determine which external agent to mention and what the trigger syntax is? → A: Prompt user on first request; default to `@copilot` for GitHub.
- Q: How should the user perform the OIDC authentication flow in the TUI? → A: TUI provides URL; user logs in via browser, gets token, and pastes it into TUI.
- Q: Who is authorized to trigger ChatOps actions via VCS comments? → A: Users with Write access to the repository.
- Q: How is an external agent task considered "done" or "failed"? → A: Done on PR/MR merge; failed on PR/MR closure without merge or explicit agent error comment.
- Q: How should the external bot handle prompt interaction happen? → A: Agent chat interaction (user responds with handle).
- Q: What is the initial webhook route strategy for multi-provider support? → A: Maintain existing `api/github/webhook` for velocity; refactor later.
- Q: What is the testing strategy for this iteration? → A: Unit -> Integration -> One happy path E2E for spec chat using mocked SSE.

## Requirements _(mandatory)_

### Functional Requirements
...
#### Cross-Platform Orchestration

- **FR-014**: Agent MUST support assigning issues to external AI agents (GitHub Copilot, GitLab Duo, etc.) where the VCS provider supports it
- **FR-014a**: System MUST prompt the user for the external bot's handle (e.g., `@copilot`) on the first orchestration request, defaulting to `@copilot` for GitHub repos.
- **FR-015**: Agent MUST be able to mention external AI agents in comments to trigger their actions (provider-specific syntax)
- **FR-016**: System MUST track external-agent-created PRs/MRs and associate them with originating issues
- **FR-016a**: System MUST consider delegated tasks "Done" when the associated PR/MR is merged, and "Failed" if closed without merging or if the external agent reports an error via comment.

#### TUI Interface

- **FR-017**: System MUST provide a terminal-based chat interface (`catalyst chat`)
- **FR-018**: TUI MUST use the same API endpoints as the web interface
- **FR-019**: TUI MUST support OIDC-based authentication via a manual token paste flow (URL provided by TUI, token copied from browser).

#### VCS ChatOps

- **FR-020**: System MUST process webhook events for @mentions in PRs/MRs and issues across supported VCS providers
- **FR-020a**: System MUST verify the commenting user has WRITE access to the repository before executing ChatOps commands.
- **FR-021**: System MUST respond to ChatOps commands within 2 minutes
- **FR-022**: System MUST post status updates back to VCS providers as comments

### Key Entities

#### From `@tetrastack/threads` (project-agnostic)

- **Thread**: Container for chat sessions, scoped to project/spec via `scopeType` + `scopeId`. Supports chat, workflows, and record feeds.
- **Item**: Individual messages/events with `role` (user/assistant/system/tool), `parts[]` (AI SDK compatible), `visibility` control.
- **Stream**: Resumable streaming state with `resumeToken` for client reconnection.
- **Edge**: DAG dependencies between items for agent workflow orchestration.

#### From `@tetrastack/react-agent-chat` (project-agnostic)

- **ToolInvocation**: Agent tool calls with state lifecycle and approval flow.
- **ClarifyingQuestion**: Structured questions for agent-user clarification.
- **MessagePart**: Union of `TextPart`, `FilePart`, `DynamicToolPart`, etc.

#### From `@catalyst/vcs-provider` (project-agnostic)

- **VCSProvider**: Interface abstracting GitHub, GitLab, Gitea, Forgejo operations.
- **PullRequest**: Unified PR/MR representation.
- **Issue**: Repository issue with normalized fields.
- **WebhookEvent**: Parsed VCS webhook with normalized payload.

#### Catalyst-Specific Entities

- **SpecContext**: Loaded spec documents (spec.md, plan.md, tasks.md) with related PRs/MRs/issues.
- **ExternalAgentTask**: Task delegated to external AI (Copilot, GitLab Duo) with tracking metadata.

> **Implementation Note**: Entity mappings and technical details are documented in `plan.md`. Project-agnostic packages (`@tetrastack/*`, `@catalyst/vcs-provider`) can be reused in other projects.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can ask the agent to list project issues and receive accurate results in < 5 seconds across all supported VCS providers
- **SC-002**: Agent can successfully create issues with 99% success rate when user has permissions (all supported providers)
- **SC-003**: Spec-grouped view loads in < 2 seconds for projects with up to 100 specs
- **SC-004**: 80% of spec-related queries are answerable from spec-context without user clarification
- **SC-005**: External AI agent assignment workflow completes successfully in < 30 seconds (where provider supports it)
- **SC-006**: TUI provides feature parity with web chat for core operations (list, create, comment)
- **SC-007**: VCS ChatOps responses are posted within 2 minutes of mention (all supported providers)
- **SC-008**: Users report 4+ stars (out of 5) satisfaction with agent accuracy in user testing
- **SC-009**: VCS provider abstraction supports adding a new provider with < 1 week of development effort
