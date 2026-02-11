# Feature Specification: Agent Harness for Spec-Driven Development

**Feature Branch**: `006-agent-harness`
**Created**: 2026-01-11
**Status**: Draft
**Input**: Enable spec-driven development workflow with CLI coding agents (Claude Code, Copilot Agent, Gemini Code, etc.), providing automatic branch management, worktree handling, context injection, and PR chain management.

## Clarifications

### Session 2026-01-11

- Q: How should the agent harness integrate with different CLI coding agents (Claude Code, Copilot Agent, etc.)? → A: ACP (Agent Communication Protocol) - Gemini has native ACP support, Claude Code has claude-code-acp, Codex has codex-acp implementations
- Q: Where should Resume State (agent chat history, task progress, spec context) be stored? → A: Leverage each agent's native chat resume capability; track work items in spec folder (git-tracked); use Catalyst platform for cross-machine syncing
- Q: How should unique dev server ports be assigned to each active worktree? → A: Dynamic OS assignment (ephemeral ports), with assigned port saved to worktree's .env file for stability across restarts
- Q: How should agent API credentials (Anthropic, OpenAI, etc.) be managed for agent authentication? → A: Agent CLIs manage their own credentials - users authenticate directly with each CLI (e.g., claude login, gemini auth) using their existing subscriptions
- Q: What should happen when an agent crashes mid-execution or a developer's machine crashes while working on a spec? → A: Idempotent recovery - system detects incomplete operations via progress files, prompts user to resume/rollback, all operations safe to retry

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Spec Branch Management (Priority: P1)

As a developer working on a new feature specification, I want the system to automatically create and manage spec branches so that each spec has its own isolated development branch with organized sub-branches for individual PRs.

**Why this priority**: This is the foundational workflow that enables spec-driven development. Without automatic branch management, developers must manually create and track branches, leading to naming inconsistencies and organizational overhead. This is the core infrastructure all other features depend on.

**Independent Test**: Can be fully tested by creating a new spec in `specs/` folder and verifying that a spec branch (`006-feature-name`) is created automatically. Creating sub-branches (`006-feature-name/add-database-schema`) should follow the established naming convention. Delivers immediate value by standardizing branch organization.

**Acceptance Scenarios**:

1. **Given** I have a project with a `specs/` folder, **When** I create a new spec directory `specs/006-agent-harness/`, **Then** a spec branch `006-agent-harness` is automatically created from `main`
2. **Given** I'm working on spec `006-agent-harness`, **When** I need to create a PR for database changes, **Then** I can create a sub-branch `006-agent-harness/add-database-schema` that clearly indicates its parent spec
3. **Given** I have multiple sub-branches for a spec, **When** I list branches, **Then** I can easily identify all work related to a specific spec through the naming convention
4. **Given** a spec branch exists, **When** I want to sync with upstream changes, **Then** the spec branch can be rebased against `main` without losing spec-specific commits

---

### User Story 2 - Agent Context Injection (Priority: P1)

As a developer using a CLI coding agent (Claude Code, Copilot Agent, etc.), I want the agent to automatically have access to the current spec, recent commits, and open PRs when I start working, so that I don't have to manually provide context every time.

**Why this priority**: Context injection is critical for agent effectiveness. Without automatic context loading, agents start each session without understanding the feature goals, existing work, or recent changes. This dramatically reduces agent quality and requires developers to repeatedly explain the same context. This is the core value proposition of the agent harness.

**Independent Test**: Can be fully tested by starting a coding agent in a spec worktree and verifying that the agent's initial context includes the spec document content, recent commit history (last 10 commits), and any open PRs related to the spec. Success is measured by asking the agent "What am I working on?" and receiving an accurate summary without manual context provision.

**Acceptance Scenarios**:

1. **Given** I'm in a spec worktree `006-agent-harness`, **When** I start Claude Code, **Then** the agent automatically reads `specs/006-agent-harness/spec.md` and can answer questions about the feature requirements
2. **Given** there are 5 recent commits in the spec branch, **When** the agent initializes, **Then** it has access to the commit messages and can understand what has been implemented
3. **Given** there are 2 open PRs for sub-branches of this spec, **When** the agent starts, **Then** it knows about the PRs and can reference their status and review comments
4. **Given** the spec has a `plan.md` and `tasks.md`, **When** the agent initializes, **Then** it understands the implementation plan and remaining tasks
5. **Given** I switch to a different spec worktree, **When** the agent reinitializes, **Then** the context automatically switches to the new spec without manual intervention

---

### User Story 3 - Worktree Management (Priority: P2)

As a developer working on multiple specs simultaneously, I want to easily create and manage git worktrees for each spec and sub-branch, so that I can work on different features in parallel without constant branch switching and context loss.

**Why this priority**: Worktree management is essential for parallel development and handling review feedback on multiple PRs. Without easy worktree creation, developers either struggle with constant branch switching (losing local state) or manually manage complex worktree setups. This enables efficient multi-tasking and rapid PR iteration.

**Independent Test**: Can be fully tested by creating multiple worktrees for different spec branches using a CLI command, verifying each has independent file systems, and that local dev servers can run simultaneously on different ports. Success is demonstrated by making changes in one worktree without affecting another.

**Acceptance Scenarios**:

1. **Given** I have spec `006-agent-harness` with sub-branches, **When** I run `agent-harness worktree create 006-agent-harness/add-database`, **Then** a new worktree is created at a predictable location (e.g., `worktree/006-agent-harness-add-database/`)
2. **Given** I have multiple worktrees active, **When** I start dev servers in each, **Then** each worktree's dev server runs on a unique port without conflicts
3. **Given** I'm in worktree A making changes, **When** I switch to worktree B, **Then** worktree A's changes remain uncommitted and isolated
4. **Given** I have a worktree for a PR that's been merged, **When** I run `agent-harness worktree cleanup`, **Then** merged worktrees are identified and can be safely removed
5. **Given** I want to create a worktree for a remote Copilot Agent branch, **When** I run `agent-harness worktree create --remote origin/copilot/fix-auth-bug`, **Then** a local worktree is created tracking the remote branch

---

### User Story 4 - Spec Synchronization by Agents (Priority: P2)

As a developer working with coding agents, I want the agent to automatically keep the spec documents up to date as work progresses, so that the spec remains the single source of truth and accurately reflects implemented features.

**Why this priority**: Without automatic spec updates, specs become stale documentation that doesn't reflect reality. This defeats the purpose of spec-driven development. Agents are uniquely positioned to update specs as they implement features, ensuring documentation stays synchronized with code.

**Independent Test**: Can be fully tested by having an agent implement a feature from a spec and verifying that the agent automatically marks user stories as completed, updates the tasks.md checklist, and adds implementation notes. Success is measured by spec accuracy matching actual implementation state.

**Acceptance Scenarios**:

1. **Given** an agent completes a task from `tasks.md`, **When** the agent commits the code, **Then** the task is automatically marked as complete in `tasks.md`
2. **Given** an agent implements a user story, **When** all acceptance criteria are met, **Then** the user story in `spec.md` is annotated with completion status
3. **Given** an agent discovers the spec is unclear or incomplete, **When** the agent asks clarifying questions, **Then** the agent updates `spec.md` with the clarifications after receiving answers
4. **Given** an agent creates a PR for part of a spec, **When** the PR is opened, **Then** the agent adds a reference to the PR in the relevant section of `plan.md` or `tasks.md`
5. **Given** a spec has been fully implemented, **When** all user stories are complete, **Then** the spec status is automatically updated to "Implemented" with a link to the merge commit

---

### User Story 5 - PR Chain Management (Priority: P2)

As a developer implementing a large spec, I want to break up the work into multiple small, reviewable PRs that depend on each other, so that code review is manageable and changes can be merged incrementally without a "big bang" merge.

**Why this priority**: Large specs with many changes are difficult to review as a single PR, leading to review delays and merge conflicts. PR chaining allows incremental merges while maintaining logical dependencies. This improves review quality and reduces merge risk, but depends on the foundational branch management being in place first.

**Independent Test**: Can be fully tested by implementing a spec across 3 PRs (foundation, implementation, tests) where PR2 depends on PR1 and PR3 depends on PR2. Verify that each PR can be reviewed independently, and that merging PR1 automatically updates PR2's base branch. Delivers value by enabling incremental spec delivery.

**Acceptance Scenarios**:

1. **Given** I have a spec with many changes, **When** I run `agent-harness pr-chain init 006-agent-harness`, **Then** the system analyzes commits and suggests a breakdown into logical PR units (e.g., "foundation", "implementation", "tests")
2. **Given** the system suggests 3 PRs, **When** I approve the breakdown, **Then** sub-branches are created with cherry-picked commits: `006-agent-harness/01-foundation`, `006-agent-harness/02-implementation`, `006-agent-harness/03-tests`
3. **Given** I have 3 dependent PRs created, **When** PR1 is merged, **Then** PR2's base branch is automatically updated and rebased if needed
4. **Given** I receive review feedback on PR1, **When** I make changes in the PR1 worktree, **Then** I can easily propagate those changes to dependent PR2 and PR3 via rebase
5. **Given** I'm creating PRs in a chain, **When** I open PR2 before PR1 is merged, **Then** PR2 is automatically marked as a draft with a dependency note linking to PR1

---

### User Story 6 - Resume Work with Context (Priority: P3)

As a developer returning to a spec after days or weeks, I want to quickly resume work with full context automatically restored, so that I don't waste time remembering what I was doing or manually re-reading issues and PRs.

**Why this priority**: Context restoration improves developer productivity when returning to paused work, but it's a convenience feature that enhances the core workflow rather than enabling it. The value is significant but not blocking for initial adoption.

**Independent Test**: Can be fully tested by pausing work on a spec, making unrelated changes, then running `agent-harness resume 006-agent-harness`. Verify that a summary is generated showing: last commit, open PRs, pending tasks, recent comments, and agent chat history. Success is measured by time-to-productivity after context switch.

**Acceptance Scenarios**:

1. **Given** I haven't worked on spec `006-agent-harness` in 2 weeks, **When** I run `agent-harness resume 006-agent-harness`, **Then** I see a summary: last commit date, open PRs with review status, remaining tasks from `tasks.md`, and recent issue/PR comments
2. **Given** I had an active agent chat session when I stopped work, **When** I resume, **Then** the agent chat history is restored and the agent remembers the previous conversation context
3. **Given** there are blocking issues or PR comments since I last worked, **When** I resume, **Then** these are highlighted as requiring immediate attention
4. **Given** the spec has been partially implemented, **When** I resume, **Then** I see a progress indicator (e.g., "5/10 tasks complete, 2/3 PRs merged")
5. **Given** I'm resuming work, **When** the agent starts, **Then** it proactively suggests next actions based on the current state (e.g., "PR #123 has review feedback to address")

---

### User Story 7 - Brownfield Project Adoption (Priority: P3)

As a developer with an existing codebase without specs, I want to adopt spec-driven development incrementally, so that I can get the benefits of the agent harness without rewriting my entire project structure.

**Why this priority**: Brownfield adoption lowers the barrier to entry for the agent harness, but most teams will start with new features. This is important for widespread adoption but not critical for proving the concept or delivering initial value.

**Independent Test**: Can be fully tested by running `agent-harness init` in an existing project repository that has no `specs/` folder. Verify that the tool creates the specs infrastructure, sets up configuration, and allows creating the first spec without disrupting existing code. Success is measured by zero breaking changes to existing workflows.

**Acceptance Scenarios**:

1. **Given** I have an existing project with no `specs/` folder, **When** I run `agent-harness init`, **Then** a `specs/` directory is created with templates and documentation
2. **Given** my project has an existing branch naming convention, **When** I configure the agent harness, **Then** I can customize the spec branch pattern to match my convention
3. **Given** I want to create my first spec for a new feature, **When** I run `agent-harness spec create 001-new-feature`, **Then** a spec directory is created with templates, and a spec branch is created without affecting existing branches
4. **Given** my project uses a specific CI/CD setup, **When** I adopt the agent harness, **Then** my existing CI pipelines continue to work unchanged
5. **Given** I have existing issues and PRs, **When** I create a spec, **Then** I can optionally link existing issues/PRs to the spec for tracking

---

### Edge Cases

- What happens when a spec branch has merge conflicts with main?
- How does the system handle corrupted or invalid spec documents?
- **Agent/machine crashes**: System detects incomplete operations via progress files and prompts user to resume or rollback (idempotent recovery)
- What happens when multiple developers work on the same spec simultaneously?
- How does the system handle spec branches that are very far behind main (e.g., 100+ commits)?
- What happens if a PR in a chain is closed without merging?
- How are agent API rate limits handled during long-running spec work (delegated to agent CLI's rate limiting)?
- What happens when a spec is renamed or deleted while worktrees exist?

## Requirements _(mandatory)_

### Functional Requirements

**Branch Management:**

- **FR-001**: System MUST automatically create a spec branch matching the spec folder name when a new spec directory is created in `specs/`
- **FR-002**: System MUST enforce spec branch naming convention: `###-spec-name` matching the folder name
- **FR-003**: System MUST support sub-branch naming convention: `###-spec-name/description` for PR work
- **FR-004**: System MUST allow rebasing spec branches against main without losing spec-specific work

**Agent Integration:**

- **FR-005**: System MUST communicate with coding agent CLIs via ACP (Agent Communication Protocol) as the foundational integration layer, supporting Claude Code (claude-code-acp), Codex (codex-acp), Gemini (native ACP), and Aider
- **FR-006**: System MUST delegate authentication to each agent CLI's native credential management (users authenticate via `claude login`, `gemini auth`, etc.)
- **FR-007**: System MUST automatically load spec.md content into agent context at session start via ACP
- **FR-008**: System MUST inject last 10 commits from current branch into agent context via ACP
- **FR-009**: System MUST fetch and inject open PRs related to current spec into agent context via ACP
- **FR-010**: System MUST allow agents to update spec documents (spec.md, tasks.md, plan.md) programmatically

**Worktree Management:**

- **FR-011**: System MUST provide CLI commands to create worktrees for spec branches and sub-branches
- **FR-012**: System MUST assign unique dev server ports for each active worktree via dynamic OS ephemeral port assignment, persisting assigned port to worktree's .env file
- **FR-013**: System MUST provide commands to list all active worktrees with their status
- **FR-014**: System MUST support creating worktrees from remote branches (e.g., Copilot Agent branches)
- **FR-015**: System MUST provide cleanup commands to remove worktrees for merged or abandoned branches

**PR Chain Management:**

- **FR-016**: System MUST analyze spec branch commits and suggest logical PR breakdown
- **FR-017**: System MUST create sub-branches with cherry-picked commits for each PR in the chain
- **FR-018**: System MUST track PR dependencies and automatically update base branches after merge
- **FR-019**: System MUST mark dependent PRs as drafts until their dependency is merged
- **FR-020**: System MUST support rebase propagation from PR1 → PR2 → PR3 when PR1 is updated

**Context Persistence:**

- **FR-021**: System MUST leverage each agent's native chat resume capability rather than reimplementing chat history storage
- **FR-022**: System MUST track work items (task completion, progress notes) in git-tracked files within the spec folder (e.g., `specs/###-spec-name/.progress.md`)
- **FR-023**: System MUST integrate with Catalyst platform to sync spec folder state across multiple developer machines
- **FR-024**: System MUST generate resume summaries showing: last commit, open PRs, pending tasks from spec folder, recent comments from VCS
- **FR-025**: System MUST integrate with VCS provider APIs (GitHub, GitLab) to fetch issue/PR data

**Reliability & Recovery:**

- **FR-028**: System MUST implement idempotent recovery for agent crashes - detect incomplete operations via progress files and prompt user to resume or rollback
- **FR-029**: System MUST ensure all critical operations (worktree creation, branch operations, PR chain generation) are safe to retry without data corruption
- **FR-030**: System MUST maintain operation state in progress files allowing recovery after machine crashes

**Configuration:**

- **FR-026**: System MUST support configuration file (e.g., `.agent-harness.yml`) for customizing branch patterns, worktree locations, and agent preferences
- **FR-027**: System MUST support brownfield initialization without disrupting existing project structure

### Key Entities

- **Spec**: A feature specification living in `specs/###-spec-name/` containing spec.md, plan.md, tasks.md, and git-tracked progress files
- **Spec Branch**: A git branch matching the spec folder name (e.g., `006-agent-harness`) where all spec work occurs
- **Sub-branch**: A git branch for individual PRs following pattern `###-spec-name/description`
- **Worktree**: A git worktree instance for a spec branch or sub-branch, isolated on the file system
- **PR Chain**: A sequence of dependent pull requests derived from a single spec, where each PR builds on the previous
- **Agent Context**: The collection of information (spec content, commits, PRs, tasks) automatically loaded into coding agent sessions via ACP
- **Progress State**: Git-tracked work item tracking within spec folder, synchronized across machines via Catalyst, with agent chat history managed by each agent's native resume capability

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can create a new spec and have a spec branch automatically ready within 5 seconds
- **SC-002**: Agents can start with full spec context (spec docs + commits + PRs) loaded automatically without manual intervention in 100% of cases
- **SC-003**: Developers can create and manage worktrees for 3+ specs simultaneously with independent dev servers without port conflicts
- **SC-004**: Large specs (10+ PRs) can be broken into PR chains with 90% of suggested breakdowns requiring no manual adjustment
- **SC-005**: Developers can resume work on a paused spec and reach productivity (start coding) within 2 minutes vs 15+ minutes without context restoration
- **SC-006**: Spec documents remain synchronized with implementation (tasks.md accuracy > 95%) through automatic agent updates
- **SC-007**: Brownfield projects can adopt the agent harness in under 5 minutes with zero breaking changes to existing workflows
