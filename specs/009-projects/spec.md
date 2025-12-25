# Feature Specification: Projects Management

**Feature Branch**: `009-projects`
**Created**: 2025-12-25
**Status**: Draft
**Input**: Projects management system allowing users to define git repos, manage deployments to environments, accelerate development through AI agents (Platform Agent, Project Agent, QA Agent), and promote spec-driven development.

## Clarifications

### Session 2025-12-25

- Q: How should users approve or reject agent-generated work? → A: User configures approval rules per project (fully customizable)
- Q: What lifecycle states should a Project support? → A: Three states: Active, Archived, and Suspended (pauses agents without archiving)
- Q: How should the system behave when repository access is lost? → A: Mark repository as "disconnected", retain project data, notify users to reconnect
- Q: How should agent failures be handled? → A: Configurable backoff via env (later admin setting), defaults to 1 retry
- Q: How should prioritization rule conflicts be resolved? → A: Most specific rule wins, then most recent rule as tiebreaker

## Related Specifications

- [001-environments](../001-environments/spec.md) - Development and Deployment Environments
- [003-vcs-providers](../003-vcs-providers/spec.md) - VCS Provider Integration (GitHub, GitLab, Gitea)

## Why

Software development teams face a constant tension between feature work and platform maintenance. Developers frequently get pulled into "side quests"—fixing tests, updating Storybook, managing packages, debugging CI/CD, enforcing conventions—that consume mental bandwidth and time meant for shipping features.

Catalyst Projects addresses this by:

1. **Centralizing Platform Work**: A Platform Agent handles infrastructure, tooling, and convention enforcement proactively, freeing developers to focus on feature development
2. **Smart Prioritization**: A Project Agent reviews work across repositories and surfaces the highest-impact tasks for review or development
3. **Parallelizable Work**: Ensuring issues, agent tasks, and PRs remain small, focused, and independently workable
4. **Spec-Driven Development**: Managing specifications committed to repositories to drive implementation with clear requirements
5. **Quality Assurance**: Integrating QA agents to run automated smoke tests against real deployments

The result: developers stay focused on feature work while platform concerns are handled, documented, and batched for easy review.

## What

### Project Definition

A Project represents a software project that Catalyst manages. Projects are associated with:

- One or more Git repositories (via VCS providers)
- Deployment environments (production, staging)
- Development environments (PR previews, agent workspaces)
- Configuration for agents, specs, and prioritization

### AI Agents

Projects leverage three types of AI agents:

#### Platform Agent

Handles platform-related work proactively to ensure excellent developer experience (DX):

- Test maintenance (fixing flaky tests, updating snapshots)
- Storybook component documentation
- Package updates and dependency management
- CI/CD pipeline improvements
- Deployment debugging
- Convention enforcement (linting, formatting, patterns)

Platform work is batched and documented, allowing developers to review and approve in bulk rather than addressing issues one-by-one.

#### Project Agent

Reviews the current user's projects to prioritize work and ensure tasks remain small and parallelizable:

- Surfaces issues, PRs, and agent tasks ready for review
- Recommends which work to tackle next based on priority and dependencies
- Breaks down large tasks into independently workable pieces
- Suggests patterns for parallel development:
  - Writing presentation components without backend for quick design iteration
  - Using fixtures that match future database design
  - Feature flags to merge UI without backend (or vice versa)

#### QA Agent

Runs quality assurance workflows:

- Executes Playwright smoke tests against real ingresses (preview environments)
- Reviews and writes E2E tests
- Reports test results and coverage

### Spec-Driven Development

Projects support specification-driven development by:

- Managing specs committed to project repositories (using spec-kit patterns)
- Using VCS provider integration to track spec files
- Providing specs as context for prioritization
- Linking specs to issues and PRs

### Dashboard & Prioritization

The default dashboard screen shows prioritized feature work:

- Configurable prioritization rules (urgency, impact, dependencies)
- Spec-based context for understanding task importance
- Clear separation between feature work and platform work
- Team-wide visibility into work distribution

## User Scenarios & Testing

### User Story 1 - Create and Configure a Project (Priority: P1)

A user wants to add a new software project to Catalyst, connecting it to their Git repository and configuring how it should be deployed and managed.

**Why this priority**: Projects are the foundational entity. Without project creation, no other features work.

**Independent Test**: Can be tested by creating a project via the UI, verifying it appears in the project list, and confirming the linked repository is accessible.

**Acceptance Scenarios**:

1. **Given** the user is authenticated, **When** they navigate to "Create Project" and provide a name, select a repository, and choose a team, **Then** the project is created and appears in their project list
2. **Given** a project exists, **When** the user configures deployment environments (staging, production), **Then** the environments are linked to the project and appear in the environment list
3. **Given** a project exists, **When** the user enables agent features (Platform Agent, Project Agent), **Then** the agents begin monitoring the project

---

### User Story 2 - View Prioritized Work Dashboard (Priority: P1)

A user wants to see their prioritized work across all projects, with feature work prominently displayed and platform work batched separately.

**Why this priority**: The dashboard is the primary interface for daily work. Users need to see what to work on next.

**Independent Test**: Can be tested by viewing the dashboard and verifying that issues, PRs, and agent tasks are displayed with correct prioritization.

**Acceptance Scenarios**:

1. **Given** the user has projects with open issues and PRs, **When** they view the dashboard, **Then** work items are displayed sorted by configured priority
2. **Given** Platform Agent has generated maintenance tasks, **When** the user views the dashboard, **Then** platform work is displayed in a separate "Platform Work" section
3. **Given** prioritization rules are configured, **When** new work items arrive, **Then** they are automatically sorted according to the rules

---

### User Story 3 - Platform Agent Handles Maintenance (Priority: P2)

A developer wants platform maintenance work (tests, packages, CI) handled automatically so they can focus on feature development.

**Why this priority**: Reducing developer distraction is a core value proposition, but requires project setup first.

**Independent Test**: Can be tested by triggering a Platform Agent task (e.g., failing test detected) and verifying the agent creates a PR with the fix.

**Acceptance Scenarios**:

1. **Given** a project with flaky tests, **When** Platform Agent detects test failures, **Then** it creates a PR with test fixes and documents the changes
2. **Given** outdated dependencies exist, **When** Platform Agent runs, **Then** it creates a batched PR updating dependencies with changelog summary
3. **Given** Platform Agent completed work, **When** the user reviews the dashboard, **Then** they see a summary of completed platform tasks with easy approval options

---

### User Story 4 - Project Agent Prioritizes Work (Priority: P2)

A developer wants intelligent recommendations on what to work on next, with large tasks broken into parallelizable pieces.

**Why this priority**: Smart prioritization amplifies developer productivity, but requires projects with work items.

**Independent Test**: Can be tested by having multiple issues in a project and verifying Project Agent provides ranked recommendations.

**Acceptance Scenarios**:

1. **Given** a project with multiple open issues, **When** the user asks for work recommendations, **Then** Project Agent returns a prioritized list with reasoning
2. **Given** a large issue exists, **When** Project Agent analyzes it, **Then** it suggests how to break it into smaller, parallelizable tasks
3. **Given** a spec file exists in the repository, **When** Project Agent prioritizes, **Then** spec context influences the recommendations

---

### User Story 5 - QA Agent Runs Smoke Tests (Priority: P3)

A user wants automated smoke tests run against preview environments to catch issues before review.

**Why this priority**: QA automation enhances quality but requires environments and agents to be functional first.

**Independent Test**: Can be tested by opening a PR, waiting for the preview environment, and verifying smoke tests run and results are posted.

**Acceptance Scenarios**:

1. **Given** a PR with a preview environment, **When** Project Agent requests QA testing, **Then** QA Agent runs Playwright tests against the preview URL
2. **Given** smoke tests complete, **When** results are available, **Then** a summary is posted to the PR as a comment
3. **Given** smoke tests fail, **When** viewing the dashboard, **Then** the failure is highlighted with logs and screenshots

---

### User Story 6 - Manage Specs in Repository (Priority: P3)

A user wants specifications managed within their repository to drive development with clear requirements.

**Why this priority**: Spec-driven development enhances planning but is optional for basic project management.

**Independent Test**: Can be tested by committing a spec file and verifying it appears in the Catalyst UI with proper parsing.

**Acceptance Scenarios**:

1. **Given** a project repository, **When** a spec file is committed following spec-kit patterns, **Then** Catalyst detects and indexes the spec
2. **Given** indexed specs exist, **When** viewing the project, **Then** specs are listed with links to related issues and PRs
3. **Given** a spec is updated, **When** sync occurs, **Then** the Catalyst index reflects the changes

---

### Edge Cases

- **Repository disconnected**: When a linked repository is deleted or access is revoked, system marks the repository as "disconnected", retains all project data, and notifies users to reconnect or remove the repository link
- **Prioritization rule conflicts**: When multiple rules could apply to the same work item, most specific rule wins; if specificity ties, most recent rule is used as tiebreaker
- What happens when Platform Agent changes conflict with manual developer changes?
- How are agent rate limits and compute costs managed?
- What happens when a spec file has invalid format?

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create projects with a name, linked repository, and team ownership
- **FR-002**: System MUST support linking one or more repositories to a single project
- **FR-003**: System MUST allow configuration of deployment environments (production, staging) per project
- **FR-004**: System MUST allow enabling/disabling of Platform Agent, Project Agent, and QA Agent per project
- **FR-004a**: System MUST provide configurable approval rules per project for agent-generated work (e.g., auto-approve low-risk changes, require approval for dependencies, require approval for all changes)
- **FR-005**: System MUST display a prioritized dashboard showing feature work and platform work separately
- **FR-006**: System MUST support configurable prioritization rules for work items
- **FR-007**: Platform Agent MUST create batched PRs for maintenance work with documentation
- **FR-008**: Project Agent MUST provide prioritized work recommendations with reasoning
- **FR-009**: Project Agent MUST suggest task breakdown for large issues into parallelizable pieces
- **FR-010**: QA Agent MUST execute Playwright tests against preview environment URLs
- **FR-011**: System MUST detect and index spec files in project repositories
- **FR-012**: System MUST link specs to related issues and PRs
- **FR-013**: System MUST provide a project slug that is unique per team for URL-friendly navigation
- **FR-014**: System MUST integrate with VCS providers (GitHub, GitLab, Gitea) for repository access and issue/PR management

### Key Entities

- **Project**: A software project with name, slug, team ownership, repository links, environment configuration, and agent settings. Lifecycle states: Active (normal operation), Suspended (agents paused, data retained), Archived (soft-deleted, read-only)
- **ProjectRepository**: Links a project to a Git repository via VCS provider. Connection states: Connected (normal), Disconnected (access lost, data retained)
- **ProjectEnvironment**: Represents a deployment environment (staging, production) linked to a project
- **ProjectAgent**: Configuration for an AI agent (Platform, Project, QA) enabled on a project. Failure handling: configurable retry with backoff (env var, later admin setting), defaults to 1 retry
- **ProjectSpec**: An indexed specification file from a project repository
- **WorkItem**: A unified representation of issues, PRs, or agent tasks for dashboard display

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create and configure a new project in under 5 minutes
- **SC-002**: Dashboard displays prioritized work items within 3 seconds of page load
- **SC-003**: Platform Agent reduces developer time spent on maintenance by 50% (measured via time tracking or surveys)
- **SC-004**: 90% of smoke tests complete within 5 minutes of preview environment becoming ready
- **SC-005**: Project Agent recommendations align with user's chosen priorities 80% of the time
- **SC-006**: Spec files are detected and indexed within 1 minute of repository sync
- **SC-007**: Users report increased focus time on feature work (measured via periodic surveys)

## Assumptions

- Users have already configured VCS provider authentication (GitHub OAuth, etc.)
- Users have at least one team configured for project ownership
- Environment infrastructure (Kubernetes clusters) is available for deployments
- Agent compute resources are provisioned and available
- VCS provider APIs support required operations (issues, PRs, file access)
