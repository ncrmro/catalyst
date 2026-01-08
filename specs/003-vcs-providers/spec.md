# VCS Providers Integration Specification

## Why

Integrating with Version Control System (VCS) providers is essential to create a unified and streamlined development lifecycle. By connecting directly with the platforms where code lives (GitHub, Gitea, GitLab), we reduce context switching, automate administrative overhead (like team management), and unlock advanced capabilities like AI-driven development workflows. This integration allows the platform to serve as a central hub for coding, project management, and automated assistance.

## User Story: Automatic Token Refresh (COMPLETED)

**As a developer**, I want refresh tokens to automatically be handled without me having to think about it in each action, API route, or service call.

**Why:** Currently, developers must manually check token expiration and refresh tokens before each VCS operation. This leads to duplicated refresh logic, inconsistent error handling, and complexity.

**What:** A singleton **VCSProviderSingleton** facade that:
- Automatically checks token expiration before any VCS operation
- Refreshes tokens transparently when needed
- Uses a callback pattern to remain provider-agnostic
- Provides namespaced operations (`issues`, `repos`, `pullRequests`)
- Handles concurrency to prevent multiple refresh calls
- Validates environment variables on startup

**Implementation Details:**
- **Location:** `@catalyst/vcs-provider` package
- **Schema:** `@tetrastack/backend` (connection_tokens table)
- **Security:** `@tetrastack/backend` (AES-256-GCM encryption)

**Completed Acceptance Criteria:**
- [x] `VCSProviderSingleton` facade implemented with automatic token management
- [x] Scoped instances (`getScoped`) for cleaner API usage
- [x] `connection_tokens` schema created in `@tetrastack/backend` (Postgres & SQLite)
- [x] Security utilities (`encrypt`/`decrypt`) centralized in `@tetrastack/backend`
- [x] Automatic token refresh 5 minutes before expiration
- [x] Comprehensive unit test suite covering refresh, concurrency, and validation
- [x] Provider-agnostic design supporting GitHub (with extensibility for GitLab/Bitbucket)
- [x] README.md and AGENTS.md updated with `VCSProviderSingleton` usage examples

## What

This specification outlines the integration with major VCS providers, specifically **GitHub**, **Gitea**, and **GitLab**, with a strong emphasis on supporting **self-hosted** instances.

The core components of this integration include:

1.  **Identity & Access Management (IAM):** Using the VCS provider as an OAuth identity provider (IdP) to authenticate users. Crucially, this includes "Auto Team Joining," where user roles and team memberships in the VCS are automatically mirrored in the platform.
2.  **Project Management Synchronization:** deeply integrating with the provider's native issue tracking, project boards, and milestones.
3.  **Pull Request (PR) / Merge Request (MR) Management:** A unified interface to view, review, and manage code contributions.
4.  **AI Agent Assignment:** A mechanism to assign tasks (issues or PR reviews) to AI agents. This includes:
    - **GitHub Copilot:** leveraging external AI coding assistants.
    - **Custom Agents:** Orchestrating our own specialized agents that run within isolated "Agent Environments" (as defined in Spec 001). These agents can perform complex tasks, run tests, and commit code directly.

## How

The integration will be implemented through a modular provider adapter pattern, ensuring consistent functionality across different platforms.

### GitHub App Specifics

For GitHub, leveraging a GitHub App provides several distinct advantages:

- **Discoverability:** Allows the platform to be listed in the GitHub App Directory, increasing visibility and ease of installation for organizations.
- **Webhooks & Callbacks:** Enables efficient, event-driven integration through comprehensive webhook subscriptions and dedicated callback mechanisms for installation and authentication flows.
- **Monetization Potential:** Provides a robust framework for charging organizations based on usage, such as compute resources consumed by agents, advanced features, or number of integrated repositories.

### 1. Authentication & Team Sync

- **OAuth 2.0 / OIDC:** The platform will implement OAuth flows for each provider.
- **Role Mapping:** Upon login, the system will query the provider's API for organization and team memberships. These will be mapped to internal roles (e.g., a "Admin" in a Gitea Org becomes an "Admin" in the platform's corresponding Project).
- **Sync Frequency:** Team memberships will be refreshed on login and via webhooks (e.g., `member_added` events) to ensure near real-time consistency.

### 2. Issues & Pull Requests

- **Unified Data Model:** An internal abstraction layer will normalize data from different providers (e.g., GitHub "Pull Request" vs. GitLab "Merge Request") into a single consistent format for the UI/CLI.
- **Bi-directional Sync:** Actions taken in the platform (commenting, closing, approving) will be pushed to the VCS provider via API. Webhooks from the provider will update the platform's state immediately.

### 3. Agent Integration

- **Task Assignment:** Users can assign an issue or PR to an "Agent" user in the UI.
- **Agent Environments:** When a custom agent is assigned a task:
  1.  The platform provisions a transient **Agent Environment** (Kubernetes namespace).
  2.  The environment is seeded with the repository context and task details.
  3.  The agent performs the work (e.g., refactoring, bug fixing).
  4.  The agent commits changes, pushes to a branch, and opens/updates a PR.
- **Copilot Integration:** For GitHub users, the platform will expose integration points to trigger Copilot-assisted workflows where APIs permit.

## VCS Provider Webhooks

Webhooks enable real-time, event-driven integration with VCS providers. The platform must handle the following webhook events:

### Functional Requirements

#### FR-WH-001: Webhook Security

All incoming webhooks must be validated using HMAC-SHA256 signature verification before processing. Invalid signatures must be rejected with a 401 response.

#### FR-WH-002: Installation Events

Handle GitHub App installation lifecycle events:

| Action      | Behavior                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `created`   | Log the new installation for the account                                                       |
| `deleted`   | Clear `installation_id` from all affected user token records to trigger reinstallation prompts |
| `suspend`   | Log suspension (future: disable features for affected repos)                                   |
| `unsuspend` | Log reactivation                                                                               |

**Acceptance Criteria:**

- When a user uninstalls the GitHub App, the banner prompting installation must reappear on their next page load
- Installation ID must be cleared for all users associated with that installation

#### FR-WH-003: Installation Repositories Events

Handle changes to which repositories the app can access:

| Action    | Behavior                                                    |
| --------- | ----------------------------------------------------------- |
| `added`   | Log newly accessible repositories                           |
| `removed` | Log removed repositories (future: clean up associated data) |

#### FR-WH-004: Push Events

Handle push events for logging and future CI/CD triggers:

- Log the repository, branch, commit count, and pusher
- Future: Trigger builds or deployments based on branch rules

#### FR-WH-005: Pull Request Events

Handle pull request lifecycle for preview environments and database sync:

| Action        | Behavior                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `opened`      | Create/update PR in database, create Kubernetes namespace, initiate preview deployment, create build job     |
| `synchronize` | Update PR in database, redeploy preview environment with new commit                                          |
| `reopened`    | Update PR in database, recreate preview environment                                                          |
| `closed`      | Update PR state in database, delete preview deployment pods, cleanup build jobs, delete Kubernetes namespace |

**Pull Request Database Sync:**

- Upsert PR record with: number, title, description, state, status, author, branches, labels, assignees, reviewers, file stats
- Map GitHub state (`open`/`closed`) to internal state (`open`/`closed`/`merged`)
- Track draft status separately from state

**Preview Environment Lifecycle:**

- Generate container image URI: `ghcr.io/{owner}/{repo}:pr-{number}-{sha_short}`
- Create isolated Kubernetes namespace per PR: `{owner}-{repo}-gh-pr-{number}`
- Deploy preview pod with environment-specific configuration
- Post deployment URL as PR comment
- Clean up all resources when PR is closed

#### FR-WH-006: Unhandled Events

Log unhandled event types for debugging without returning an error. Return success to prevent GitHub from retrying.
