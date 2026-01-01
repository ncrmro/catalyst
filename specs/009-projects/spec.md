# Feature Specification: Projects Management

**Feature Branch**: `009-projects`
**Created**: 2025-12-25
**Updated**: 2025-12-28
**Status**: Draft
**Input**: Projects management system allowing users to define git repos, manage deployments to environments, and promote spec-driven development through file-based workflows.

## Clarifications

### Session 2025-12-28

- Q: Should we sync GitHub data (issues, PRs, specs) to the database? → A: No. Show data directly from VCS provider. Keep it simple.
- Q: How should specs be managed? → A: As files in the repository's specs folder. Read/write directly via VCS API.
- Q: What's the core value for work items? → A: Show PRs with their preview environments and CI checks. Prioritization comes later.

### Session 2025-12-25

- Q: What lifecycle states should a Project support? → A: Three states: Active, Archived, and Suspended (deferred - start with Active only)
- Q: How should the system behave when repository access is lost? → A: Mark repository as "disconnected", retain project data, notify users to reconnect

## Related Specifications

- [001-environments](../001-environments/spec.md) - Development and Deployment Environments
- [003-vcs-providers](../003-vcs-providers/spec.md) - VCS Provider Integration (GitHub, GitLab, Gitea)

## Why

Software development teams need visibility into their work and a streamlined path from specification to deployment. Catalyst Projects provides this by:

- **Connecting repos to preview environments**: Each PR gets a live preview environment
- **Showing CI/check status**: See build status, tests, and external checks in one place
- **File-based project management**: Specs, plans, and tasks live in the repository as files (spec-kit patterns)
- **Delineate between feature and platform work**: Distinguish feature work (feat/fix/style) from platform work (chore/ci/build) to organize tasks effectively

## What

### Project Definition

A Project represents a software project that Catalyst manages. Projects are associated with:

- One or more Git repositories (via VCS providers)
- Deployment environments (production, staging)
- Development environments (PR previews)

### VCS-First Approach

**Core Principle**: Don't duplicate VCS data in the database. Read directly from the VCS provider.

- **PRs/Issues**: Fetched from GitHub API, not synced to database tables
- **Specs**: Read/written as files in the repo's `specs/` folder
- **CI Checks**: Fetched from GitHub Checks API and Commit Statuses API
- **Prioritization**: Deferred to future phase (v2)

### Work Items = Pull Requests + Active Branches

The current work view shows open PRs and active branches for project repositories, categorized by work type:

**Feature Tasks** (non-chore work):

- Open PRs without "chore" pattern in title, branch name, or commit prefix
- Active branches (created this week with recent commits) without "chore" pattern
- Semantic prefixes: `feat/`, `fix/`, `style/`, `refactor/`, `test/`, `docs/`

**Platform Tasks** (chore/infrastructure work):

- Open PRs with "chore" pattern in title, branch name, or commit prefix
- Active branches with "chore" pattern
- Semantic prefixes: `chore/`, `ci/`, `build/`

**Categorization Rules**:

- Check PR title, head branch name, AND last commit message for patterns
- Pattern matching: `^chore[:/(]`, `^ci[:/(]`, `^build[:/(]`, `chore/`, `^chore-`
- Branches shown only if no open PR exists for that branch
- Branches must have commits within last 7 days to be considered "active"

**Visual Organization**:

- Feature Tasks and Platform Tasks displayed as separate sections
- Within each section: PRs grouped separately from branches
- Each PR links to its preview environment (if deployed)
- CI check status displayed (passing/failing/pending)
- Branch management actions (update, squash) available

### Spec-Driven Development (File-Based)

Projects support specification-driven development through files:

- Read specs from repository's `specs/` folder via VCS API
- Write/update specs by creating commits/PRs
- Uses spec-kit patterns (spec.md, plan.md, tasks.md)
- No database indexing of specs (read on demand)

## User Scenarios & Testing

### User Story 1 - Manage Specs in Repository (Priority: P1)

A user wants specifications managed within their repository to drive development with clear requirements.

**Why this priority**: Spec-driven development is the core workflow. Specs are the source of truth for what to build.

**Independent Test**: Navigate to project specs page, see specs from repo, create/edit a spec via UI.

**Acceptance Scenarios**:

1. **Given** a project with a linked repository, **When** viewing the project specs page, **Then** spec files from the `specs/` folder are listed
2. **Given** the specs list is displayed, **When** clicking on a spec, **Then** the spec content is shown (read from VCS)
3. **Given** viewing a spec, **When** user edits and saves, **Then** a commit/PR is created in the repository

---

### User Story 2 - View Current Work (PRs) (Priority: P1)

A user wants to see open pull requests for a project with links to their preview environments.

**Why this priority**: PRs are the primary unit of work. Linking PRs to preview environments is core value.

**Independent Test**: View project work page, see open PRs with preview environment links.

**Acceptance Scenarios**:

1. **Given** a project with open PRs, **When** viewing the work page, **Then** open PRs are listed (fetched from GitHub)
2. **Given** a PR has a preview environment, **When** viewing the PR in the list, **Then** a link to the preview environment is shown
3. **Given** a PR is displayed, **When** clicking on it, **Then** the PR detail page shows description, commits, and preview URL

---

### User Story 3 - View CI Check Status (Priority: P1)

A developer reviewing a pull request wants to see CI check status for the development environment.

**Why this priority**: CI status is critical for knowing if changes are ready to merge.

**Independent Test**: View PR detail page, see CI checks with pass/fail status.

**Acceptance Scenarios**:

1. **Given** viewing a PR detail page, **When** CI checks have run, **Then** status (pass/fail/pending) is displayed
2. **Given** CI checks have failed, **When** viewing the page, **Then** failed checks are listed with links to logs
3. **Given** a new commit is pushed, **When** CI runs complete, **Then** status updates (via webhook or poll)

---

### User Story 4 - View PR Context (Priority: P2)

A developer wants to see the context of what a PR is implementing without leaving the environment page.

**Why this priority**: Understanding PR purpose helps reviewers and reduces context switching.

**Acceptance Scenarios**:

1. **Given** the PR has a description, **When** viewing the environment, **Then** the PR description is displayed
2. **Given** the PR links to an issue or spec, **When** viewing the environment, **Then** links are shown
3. **Given** the environment is for a PR, **When** viewing it, **Then** PR number and title are clearly visible

---

### User Story 5 - Branch Management Actions (Priority: P2)

A developer wants to manage their PR branch from the environment page.

**Why this priority**: Streamlines the merge workflow.

**Acceptance Scenarios**:

1. **Given** branch is behind main, **When** viewing the environment, **Then** "Update Branch" action is available with commits behind count
2. **Given** CI is clean and branch is up to date, **When** viewing the environment, **Then** PR is shown as ready for merge

---

### User Story 6 - Create and Configure a Project (Priority: P2)

A user wants to add a new software project to Catalyst, connecting it to their Git repository.

**Why this priority**: Projects are foundational but simpler now - just linking repos.

**Acceptance Scenarios**:

1. **Given** user is authenticated, **When** they create a project with name and repository, **Then** the project appears in their project list
2. **Given** a project exists, **When** viewing project settings, **Then** repository link and team ownership are shown

---

### User Story 7 - View Categorized Work Items (Priority: P1)

A developer wants to see their work organized by type - feature work vs platform/infrastructure work.

**Why this priority**: Distinguishing feature work from chore/platform work helps prioritize and understand current team focus.

**Independent Test**: View project page, see PRs and branches categorized into Feature Tasks and Platform Tasks sections.

**Acceptance Scenarios**:

1. **Given** a project with open PRs, **When** viewing the project page, **Then** PRs are categorized into Feature Tasks (non-chore) and Platform Tasks (chore) sections
2. **Given** a PR has "chore" in title OR branch name OR last commit message, **When** categorizing, **Then** it appears in Platform Tasks
3. **Given** active branches with recent commits (7 days), **When** no open PR exists for the branch, **Then** the branch appears in the appropriate task section
4. **Given** a branch named `chore/update-deps`, **When** categorizing, **Then** it appears in Platform Tasks
5. **Given** Feature Tasks section, **When** viewing it, **Then** PRs and branches are displayed in separate sub-sections

---

### User Story 8 - Adopt Spec-Driven Development (Priority: P2)

A user wants to adopt spec-driven development for their project through a dedicated workflow in the web UI - bootstrapping specs for existing projects, writing new specs, amending existing ones, and adding code annotations that link back to specifications.

**Why this priority**: Spec-driven development has a learning curve. A dedicated workflow with agent assistance lowers the barrier to adoption and maintains traceability between code and specifications.

**Independent Test**: Use the spec workflow UI to bootstrap specs for a project without them, create a new spec, or add code annotations.

**Acceptance Scenarios**:

1. **Given** a project without a `specs/` folder, **When** user initiates "Bootstrap specs" in the workflow, **Then** agent analyzes the repository (README, docs, code structure) and creates a PR with `specs/AGENTS.md` and template structure
2. **Given** a project with existing code but no specs, **When** user selects "Distill spec from code", **Then** agent reads relevant code files and generates a draft `spec.md` capturing user stories and requirements
3. **Given** user describes a new feature in the spec workflow, **When** they submit the description, **Then** agent generates a `spec.md` following spec-kit templates and creates a PR
4. **Given** an existing spec, **When** user selects "Amend spec", **Then** agent presents the current spec, accepts changes, and creates a PR with amendments
5. **Given** a spec with functional requirements (FR-###), **When** user selects "Add code annotations", **Then** agent identifies relevant code locations and adds comments linking to requirements (e.g., `// FR-001: implements user authentication`)
6. **Given** code with spec annotations, **When** an agent reads the codebase, **Then** it can trace implementation back to specifications for context

---

### User Story 9 - Manage Spec Implementation Work (Priority: P2)

A user wants to manage the implementation of a spec through organized PRs - breaking work into small reviewable PRs, identifying parallelizable work, visualizing PR dependencies, prioritizing review order, and getting spec clarifications during development.

**Why this priority**: Effective spec execution requires coordination. Small PRs merge faster, parallel work increases velocity, and clear review priorities reduce bottlenecks.

**Independent Test**: View a spec's implementation dashboard showing PR graph, review priorities, and ask clarification questions.

**Acceptance Scenarios**:

1. **Given** a spec with a `tasks.md`, **When** viewing the spec implementation page, **Then** tasks are displayed with suggested PR boundaries (small, focused PRs)
2. **Given** tasks with dependency markers `[P]` (parallelizable), **When** viewing the implementation graph, **Then** parallel tasks are shown as concurrent branches that can be worked simultaneously
3. **Given** multiple open PRs for a spec, **When** viewing the PR graph, **Then** dependencies between PRs are visualized (which PRs block others, merge order)
4. **Given** PRs with different review states, **When** viewing review priorities, **Then** PRs are ordered by: blocking other work > ready for review > changes requested > draft
5. **Given** a developer has a question about the spec during implementation, **When** they ask via the workflow, **Then** agent answers using spec context or flags the question for spec author clarification
6. **Given** spec clarifications are provided, **When** they affect the spec, **Then** amendments are suggested and tracked

---

## Key Entities

### StatusCheck (API Type, not DB)

Normalized representation of CI check status (from GitHub Checks API + Commit Statuses API):

- `id`, `name`, `state` (pending|passing|failing|cancelled|skipped)
- `url` (link to CI logs), `description`, `context`
- `startedAt`, `completedAt`, `duration`
- `source` (github-actions|cloudflare|vercel|catalyst|external)

### SpecFile (API Type, not DB)

Representation of a spec file from the repository:

- `path`: File path in repo (e.g., `specs/001-feature/spec.md`)
- `name`: Spec folder name
- `files`: List of files in spec folder (spec.md, plan.md, tasks.md, etc.)
- `lastModified`: From VCS

### WorkItem (API Type, not DB)

Discriminated union representing a work item (PR or branch):

**WorkItemPR**:

- `kind`: "pr"
- `id`, `number`, `title`, `author`, `authorAvatar`
- `repository`, `url`, `headBranch`
- `status`: "draft" | "ready" | "changes_requested"
- `updatedAt`
- `category`: "feature" | "platform"

**WorkItemBranch**:

- `kind`: "branch"
- `id`, `name`, `repository`, `url`
- `lastCommitMessage`, `lastCommitAuthor`, `lastCommitDate`
- `category`: "feature" | "platform"

### WorkCategory (Enum)

- `feature`: Non-chore work (feat, fix, style, refactor, test, docs)
- `platform`: Infrastructure/maintenance work (chore, ci, build)

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create projects with a name, linked repository, and team ownership
- **FR-002**: System MUST display open PRs for project repositories fetched from VCS provider
- **FR-003**: System MUST link PRs to their preview environments (if deployed)
- **FR-004**: System MUST display CI check status from GitHub Checks API and Commit Statuses API
- **FR-005**: System MUST read spec files from repository's `specs/` folder via VCS API
- **FR-006**: System MUST support creating/editing specs by committing to the repository
- **FR-007**: System MUST provide a project slug for URL-friendly navigation (format: DNS-1123 label)
- **FR-008**: System MUST categorize PRs as feature or platform based on title, branch name, and commit prefix patterns
- **FR-009**: System MUST display open PRs in Feature Tasks (non-chore) and Platform Tasks (chore) sections
- **FR-010**: System MUST fetch and display active branches without open PRs that have recent commits (within 7 days)
- **FR-011**: System MUST categorize branches as feature or platform based on branch name and last commit message patterns
- **FR-012**: System MUST display PRs and branches in separate sub-sections within Feature and Platform Task sections
- **FR-013**: System MUST provide a workflow UI for bootstrapping spec-driven development in projects without specs
- **FR-014**: System MUST support distilling specs from existing code via agent analysis
- **FR-015**: System MUST support creating new specs from natural language feature descriptions
- **FR-016**: System MUST support amending existing specs through the workflow UI
- **FR-017**: System MUST support adding code annotations that link to functional requirements (FR-###)
- **FR-018**: System MUST display spec tasks with suggested PR boundaries for small, focused PRs
- **FR-019**: System MUST visualize PR dependencies as a graph showing merge order and blocking relationships
- **FR-020**: System MUST prioritize PR review order based on: blocking other work > ready for review > changes requested > draft
- **FR-021**: System MUST provide a mechanism for developers to ask spec clarification questions during implementation
- **FR-022**: System MUST match PRs/issues/branches to specs using tokenized spec name matching - given a spec directory named `001-foo-bar`, a PR/issue/branch containing "001", "foo", OR "bar" in its title/name MUST be matched to that spec

### Non-Requirements (Deferred to v2)

- **NR-001**: WorkItem database table (use VCS API directly)
- **NR-002**: PrioritizationRule database table (prioritization is manual)
- **NR-003**: ProjectSpec database table (specs read on demand from VCS)
- **NR-004**: Project status management (Active/Archived/Suspended)
- **NR-005**: Platform and QA agent integration (project agent for specs is in scope via US-8/US-9)

## Success Criteria

- **SC-001**: Users can create and configure a new project in under 2 minutes
- **SC-002**: PR list displays within 3 seconds of page load
- **SC-003**: CI check status is accurate and updates within 30 seconds of check completion
- **SC-004**: Specs can be read and displayed from any repository with a `specs/` folder
- **SC-005**: Users can bootstrap spec-driven development for a project within 5 minutes using the workflow
- **SC-006**: Agent-generated specs follow spec-kit templates and include valid user stories
- **SC-007**: PR dependency graph accurately reflects blocking relationships and suggested merge order

## Assumptions

- Users have already configured VCS provider authentication (GitHub OAuth)
- Users have at least one team configured for project ownership
- Preview environment infrastructure is available (existing feature)
- VCS provider APIs support required operations (files, PRs, checks)
