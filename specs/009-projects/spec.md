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
- Delineate between feature and platform work 
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

### Work Items = Pull Requests

The current work view shows open PRs for project repositories:

- Each PR links to its preview environment (if deployed)
- CI check status displayed (passing/failing/pending)
- PR description and context visible
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

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create projects with a name, linked repository, and team ownership
- **FR-002**: System MUST display open PRs for project repositories fetched from VCS provider
- **FR-003**: System MUST link PRs to their preview environments (if deployed)
- **FR-004**: System MUST display CI check status from GitHub Checks API and Commit Statuses API
- **FR-005**: System MUST read spec files from repository's `specs/` folder via VCS API
- **FR-006**: System MUST support creating/editing specs by committing to the repository
- **FR-007**: System MUST provide a project slug for URL-friendly navigation (format: DNS-1123 label)

### Non-Requirements (Deferred to v2)

- **NR-001**: WorkItem database table (use VCS API directly)
- **NR-002**: PrioritizationRule database table (prioritization is manual)
- **NR-003**: ProjectSpec database table (specs read on demand from VCS)
- **NR-004**: Project status management (Active/Archived/Suspended)
- **NR-005**: Agent integration (platform, project, QA agents)

## Success Criteria

- **SC-001**: Users can create and configure a new project in under 2 minutes
- **SC-002**: PR list displays within 3 seconds of page load
- **SC-003**: CI check status is accurate and updates within 30 seconds of check completion
- **SC-004**: Specs can be read and displayed from any repository with a `specs/` folder

## Assumptions

- Users have already configured VCS provider authentication (GitHub OAuth)
- Users have at least one team configured for project ownership
- Preview environment infrastructure is available (existing feature)
- VCS provider APIs support required operations (files, PRs, checks)
