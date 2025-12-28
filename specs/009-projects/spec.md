# Feature Specification: Projects Management

**Feature Branch**: `009-projects`
**Created**: 2025-12-25
**Status**: Draft
**Input**: Projects management system allowing users to define git repos, manage deployments to environments, and promote spec-driven development.

## Clarifications

### Session 2025-12-25

- Q: What lifecycle states should a Project support? → A: Three states: Active, Archived, and Suspended
- Q: How should the system behave when repository access is lost? → A: Mark repository as "disconnected", retain project data, notify users to reconnect
- Q: How should prioritization rule conflicts be resolved? → A: Most specific rule wins, then most recent rule as tiebreaker

## Related Specifications

- [001-environments](../001-environments/spec.md) - Development and Deployment Environments
- [003-vcs-providers](../003-vcs-providers/spec.md) - VCS Provider Integration (GitHub, GitLab, Gitea)

## Why

Software development teams face a constant tension between feature work and platform maintenance. Catalyst Projects addresses this by providing a centralized hub for managing software projects, prioritizing work, and ensuring quality through spec-driven development.

**Accelerate Feature Development**: Clearly delineates between feature development and platform work, reducing context switching.                                              │
## What

### Project Definition

A Project represents a software project that Catalyst manages. Projects are associated with:

- One or more Git repositories (via VCS providers)
- Deployment environments (production, staging)
- Development environments (PR previews)
- Configuration for specs and prioritization

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

---

### User Story 2 - View Prioritized Work Dashboard (Priority: P1)

A user wants to see their prioritized work across all projects, with feature work prominently displayed and platform work batched separately.

**Why this priority**: The dashboard is the primary interface for daily work. Users need to see what to work on next.

**Independent Test**: Can be tested by viewing the dashboard and verifying that issues and PRs are displayed with correct prioritization.

**Acceptance Scenarios**:

1. **Given** the user has projects with open issues and PRs, **When** they view the dashboard, **Then** work items are displayed sorted by configured priority
2. **Given** prioritization rules are configured, **When** new work items arrive, **Then** they are automatically sorted according to the rules

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
- What happens when a spec file has invalid format?

## CI Checks UI for Development Environments

Development environments (which serve as PR preview environments) need a standard UI for viewing CI check status, managing the PR workflow, and interacting with agents for debugging failures.

### User Stories

#### US-CI-1: View CI Check Status (P1)

As a developer reviewing a pull request, I want to see the CI check status for the development environment so I can quickly assess whether my changes are ready to merge.

**Acceptance Criteria**:

1. **Given** I'm viewing a development environment detail page, **When** CI checks have run, **Then** I see the status (pass/fail/pending) of the last CI run
2. **Given** CI checks have failed, **When** I view the environment, **Then** I can see which specific checks failed with links to logs
3. **Given** a new commit is pushed, **When** CI runs complete, **Then** the status updates automatically via webhook

#### US-CI-2: View PR Context (P1)

As a developer, I want to see the context of what this PR is implementing so I can understand the goal without leaving the environment page.

**Acceptance Criteria**:

1. **Given** the PR has a description, **When** I view the environment, **Then** I see the PR description prominently displayed
2. **Given** the PR has no description, **When** I view the environment, **Then** I see a placeholder prompting to add Goal/Changes/Demo format
3. **Given** the PR is linked to a spec or issue, **When** I view the environment, **Then** I see a link to the GitHub issue/spec
4. **Given** the environment is for a PR, **When** I view it, **Then** the UI clearly indicates this is a PR-based environment with PR number and title

#### US-CI-3: Preview URL Display (P1)

As a developer, I want to see and access the preview URL for my development environment so I can test my changes.

**Acceptance Criteria**:

1. **Given** the environment is running, **When** I view the detail page, **Then** I see the preview URL with a clickable link
2. **Given** the environment is deploying, **When** I view the detail page, **Then** I see the URL is pending with deployment status

#### US-CI-4: Branch Management Actions (P2)

As a developer, I want to manage my PR branch from the environment page so I can keep it up to date and prepare for merge.

**Acceptance Criteria**:

1. **Given** my branch is behind main, **When** I view the environment, **Then** I see an "Update Branch" action with commits behind count
2. **Given** I want to squash commits before merge, **When** I view the environment, **Then** I see commit count and squash option
3. **Given** CI is clean and branch is up to date, **When** I view the environment, **Then** I see the PR is ready for merge queue

### Functional Requirements

#### FR-CI-001: CI Status Display

**Requirement**: System MUST display CI check status from both GitHub Checks API and Commit Statuses API.

**Details**:

- Normalize GitHub Check Runs and Commit Statuses into unified `StatusCheck` model
- Display check name, status (passing/failing/pending/cancelled/skipped), duration, and link to logs
- Show combined status summary (all passing, some failing, pending)
- Support status from external providers (GitHub Actions, Cloudflare, Vercel, CircleCI, etc.)

#### FR-CI-002: PR Description Display

**Requirement**: System MUST display PR description if it exists, or show a placeholder prompting the user/agent to add one.

**Details**:

- Show PR description with markdown rendering
- If no description, show placeholder: "No description provided. Add Goal/Changes/Demo format."
- TODO: Auto-generate description from commit messages when missing

#### FR-CI-003: Semantic Commit Categorization

**Requirement**: CI results SHOULD be categorized by commit type using semantic commit conventions.

**Details**:

- Feature work: `feat`, `fix`, `style`, `test`
- Platform work: `chore` (almost always)

#### FR-CI-004: Branch Management UI

**Requirement**: System MUST provide branch management capabilities from the environment page.

**Details**:

- **Update Branch**: Rebase or merge main into the PR branch
- **Squash Commits**: Squash commits before merge (recommended workflow)
- **Merge Queue Status**: Show whether PR is eligible for merge queue
- Note: "Clean" CI (all checks passing) is a requirement for entering the merge queue

### Key Entities

- **StatusCheck**: Normalized representation of CI check status
  - `id`, `name`, `state` (pending|passing|failing|cancelled|skipped)
  - `url` (link to CI logs), `description`, `context`
  - `startedAt`, `completedAt`, `duration`
  - `source` (github-actions|cloudflare|vercel|catalyst|external)

### Success Criteria

- **SC-CI-001**: Developers can see CI status within 5 seconds of page load
- **SC-CI-002**: CI status updates within 30 seconds of check completion (via webhook)
- **SC-CI-003**: Branch update/squash actions complete within 60 seconds

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create projects with a name, linked repository, and team ownership
- **FR-002**: System MUST support linking one or more repositories to a single project
- **FR-003**: System MUST allow configuration of deployment environments (production, staging) per project
- **FR-005**: System MUST display a prioritized dashboard showing feature work and platform work separately
- **FR-006**: System MUST support configurable prioritization rules for work items
- **FR-011**: System MUST detect and index spec files in project repositories
- **FR-012**: System MUST link specs to related issues and PRs
- **FR-013**: System MUST provide a project slug that is unique per team for URL-friendly navigation
  - Unique per team (not globally unique)
  - Used in URLs: `/projects/{slug}`
  - Format: DNS-1123 label (lowercase alphanumeric and hyphens, starting with a letter)
  - Migration strategy for existing projects: generate from name
- **FR-014**: System MUST integrate with VCS providers (initially GitHub; GitLab/Gitea in future phases) for repository access and issue/PR management

### Key Entities

- **Project**: A software project with name, slug, team ownership, repository links, environment configuration, and agent settings. Lifecycle states: Active (normal operation), Suspended (agents paused, data retained), Archived (soft-deleted, read-only)
- **ProjectRepository**: Links a project to a Git repository via VCS provider. Connection states: Connected (normal), Disconnected (access lost, data retained)
- **ProjectEnvironment**: Represents a deployment environment (staging, production) linked to a project
- **ProjectSpec**: An indexed specification file from a project repository
- **WorkItem**: A unified representation of issues, PRs, or agent tasks for dashboard display

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create and configure a new project in under 5 minutes
- **SC-002**: Dashboard displays prioritized work items within 3 seconds of page load
- **SC-006**: Spec files are detected and indexed within 1 minute of repository sync
- **SC-007**: Users report increased focus time on feature work (measured via periodic surveys)

## Assumptions

- Users have already configured VCS provider authentication (GitHub OAuth, etc.)
- Users have at least one team configured for project ownership
- Environment infrastructure (Kubernetes clusters) is available for deployments
- VCS provider APIs support required operations (issues, PRs, file access)
