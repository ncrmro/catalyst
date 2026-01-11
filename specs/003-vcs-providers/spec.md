# VCS Providers Integration Specification

## Why

Integrating with Version Control System (VCS) providers is essential to create a unified and streamlined development lifecycle. By connecting directly with the platforms where code lives (GitHub, Gitea, GitLab), we reduce context switching, automate administrative overhead (like team management), and unlock advanced capabilities like AI-driven development workflows. This integration allows the platform to serve as a central hub for coding, project management, and automated assistance.

## User Stories

### US-1: Automatic Token Refresh (COMPLETED, P1)

**As a developer**, I want refresh tokens to automatically be handled without me having to think about it in each action, API route, or service call.

**Why:** Currently, developers must manually check token expiration and refresh tokens before each VCS operation. This leads to duplicated refresh logic, inconsistent error handling, and complexity.

**What:** A singleton **VCSProviderSingleton** facade that:

- Automatically checks token expiration before any VCS operation
- Refreshes tokens transparently when needed
- Uses a callback pattern to remain provider-agnostic
- Provides namespaced operations (`issues`, `repos`, `pullRequests`)
- Handles concurrency to prevent multiple refresh calls
- Validates environment variables on startup

**Completed Acceptance Criteria:**

- [x] `VCSProviderSingleton` facade implemented with automatic token management
- [x] Scoped instances (`getScoped`) for cleaner API usage
- [x] `connection_tokens` schema created in `@tetrastack/backend` (Postgres & SQLite)
- [x] Security utilities (`encrypt`/`decrypt`) centralized in `@tetrastack/backend`
- [x] Automatic token refresh 5 minutes before expiration
- [x] Comprehensive unit test suite covering refresh, concurrency, and validation
- [x] Provider-agnostic design supporting GitHub (with extensibility for GitLab/Bitbucket)
- [x] README.md and AGENTS.md updated with `VCSProviderSingleton` usage examples

### US-2: VCS Organization Team Integration (IN PROGRESS, P1)

**As a platform user**, when I add a private repository from a VCS organization (GitHub Org, GitLab Group, Bitbucket Workspace, etc.), I want teams to be automatically created and synchronized with the VCS provider's organization membership so that I can collaborate with organization members without manual team management.

**Why:** Currently, users must manually create and manage teams in Catalyst. When working with organization repositories across different VCS providers (GitHub Orgs, GitLab Groups, Gitea Orgs, Forgejo Orgs, Bitbucket Workspaces), there's no automatic association between VCS organization members and platform teams. This creates friction, increases administrative overhead, and risks access control inconsistencies.

**What:**

- When connecting an organization repository from any VCS provider, the platform detects org ownership and prompts the user with clear messaging that a team will be created
- A platform team is automatically created and linked to the VCS organization with provider-specific metadata
- Team membership is synchronized in real-time via VCS provider webhooks when org members are added/removed
- Private organization repositories are only accessible to users who are members of the corresponding platform team
- Organization operations are exposed through the provider-agnostic VCS provider interface

**Acceptance Criteria:**

1. **Given** a user connects a private organization repository (from any VCS provider), **When** no team exists for that organization, **Then** the platform shows a confirmation dialog explaining that a team will be created for the organization
2. **Given** a user confirms team creation, **When** the repository is connected, **Then** a platform team is created with VCS org metadata (provider ID, org ID, org login, avatar URL)
3. **Given** a VCS organization webhook event (member added), **When** the webhook is received, **Then** the user is automatically added to the corresponding platform team
4. **Given** a VCS organization webhook event (member removed), **When** the webhook is received, **Then** the user is automatically removed from the corresponding platform team
5. **Given** a private organization repository, **When** a user without org membership attempts access, **Then** the platform denies access with a clear error message
6. **Given** a user signs in, **When** they are a member of VCS organizations, **Then** their org memberships are synced to platform teams (backup sync mechanism)
7. **Given** an existing team for an organization, **When** another user connects an org repository, **Then** no prompt is shown and the repository is added to the existing team
8. **Given** multiple VCS providers (GitHub, GitLab, Gitea), **When** organizations exist on different providers, **Then** teams are created with provider-specific identifiers to prevent conflicts

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

#### FR-WH-007: Organization Membership Events (Provider-Specific)

Handle VCS provider organization membership changes for real-time team synchronization. Each provider has different webhook event structures:

**GitHub:**
| Event | Action | Behavior |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `organization` | `member_added` | Find or create platform team for the org, add user to team membership with appropriate role |
| `organization` | `member_removed` | Find platform team for the org, remove user from team membership |
| `organization` | `deleted` | Find platform team for the org, soft delete team (mark as deleted but preserve for audit) |

**GitLab (Future):**

- `member` events on groups (group member added/removed)
- Group deletion events

**Gitea/Forgejo (Future):**

- Organization member events
- Organization deletion events

**Common Behavior Across Providers:**

- Match VCS users to platform users via the `accounts` table (provider='github'|'gitlab'|'gitea', providerAccountId=VCS user ID)
- If user doesn't exist in platform yet, log warning and skip sync (user will be synced on first login)
- Never promote users to 'owner' role via webhooks (owner is the team creator)
- Update team's `synced_at` timestamp on each successful sync
- Only create teams when explicitly triggered by user action (repository connection), not via webhooks

### Functional Requirements: Organization Operations

#### FR-ORG-001: VCS Provider Organization Interface

The VCS provider interface must support organization-level operations in a provider-agnostic manner:

**Required Operations:**

- `getOrganization(client, org: string)`: Retrieve organization details (ID, login, name, avatar URL)
- `listOrganizationMembers(client, org: string)`: List all members with their roles
- `getMyOrganizationMembership(client, org: string)`: Check current user's membership status and role

**Provider-Agnostic Design:**

- Organization roles normalized across providers: `owner`, `admin`, `member`
- Support for both SaaS and self-hosted instances
- Extensible to GitLab Groups, Bitbucket Workspaces, Gitea/Forgejo Organizations

**Provider Mapping:**
| Platform | Organization Concept | Owner Equivalent | Admin Equivalent | Member Equivalent |
| -------------- | -------------------- | ---------------- | ---------------- | ----------------- |
| GitHub | Organization | owner | admin | member |
| GitLab | Group | owner | maintainer | developer |
| Bitbucket | Workspace | admin | admin | member |
| Gitea/Forgejo | Organization | owner | admin | member |

#### FR-ORG-002: Team-Organization Association

The platform must maintain a provider-agnostic link between teams and VCS organizations:

**Database Requirements:**

- `teams.vcs_provider_id`: Which VCS provider (github, gitlab, gitea, bitbucket)
- `teams.vcs_org_id`: Unique identifier from the VCS provider
- `teams.vcs_org_login`: Organization login/name (used for lookups)
- `teams.vcs_org_avatar_url`: Organization avatar for UI display
- `teams.is_vcs_org`: Boolean flag to distinguish org teams from personal teams
- `teams.synced_at`: Timestamp of last successful membership sync

**Constraints:**

- Unique index on `(vcs_provider_id, vcs_org_id)`: One team per VCS organization per provider
- Unique index on `(vcs_provider_id, vcs_org_login)`: Prevents naming conflicts within provider

**Examples:**

- GitHub org "acme-corp" → `vcs_provider_id='github'`, `vcs_org_id='12345'`, `vcs_org_login='acme-corp'`
- GitLab group "acme-engineering" → `vcs_provider_id='gitlab'`, `vcs_org_id='67890'`, `vcs_org_login='acme-engineering'`
- Gitea org "acme-corp" → `vcs_provider_id='gitea'`, `vcs_org_id='111'`, `vcs_org_login='acme-corp'`

This allows the same organization name on different providers without conflict.

#### FR-ORG-003: Repository Connection Flow

When connecting an organization repository from any VCS provider:

**Detection:**

- Check if repository owner type is 'Organization' (or equivalent for the provider)
- Query for existing platform team with matching `vcs_provider_id` and `vcs_org_login`

**User Confirmation (when team doesn't exist):**

- Show alert/dialog with organization avatar and name
- Display provider-specific messaging: "A team will be created for this {GitHub Organization | GitLab Group | Bitbucket Workspace}"
- List what will happen: team creation, repository association, member access
- Require explicit user confirmation (checkbox + enabled submit button)

**Team Creation:**

- Create team with VCS org metadata including provider ID
- Set current user as team owner
- Add creator to team membership table with 'owner' role
- Associate repository with the new team

**Team Reuse (when team exists):**

- Show informational message about existing team
- Verify user is a member of the team
- Associate repository with the existing team
- No additional confirmation required

#### FR-ORG-004: Access Control Enforcement

The platform must enforce team-based access control for private organization repositories across all VCS providers:

**Access Rules:**

- Public repositories: accessible to all authenticated users (regardless of provider)
- Private user repositories: accessible to members of the user's personal team
- Private organization repositories: accessible only to members of the corresponding org team

**Enforcement Points:**

- Server actions (before returning project/repo data)
- API routes (before processing requests)
- MCP tools (before executing operations)

**Error Handling:**

- Return clear error messages when access is denied
- Suggest joining the VCS organization if not a member
- Provide link to view organization on the VCS provider

#### FR-ORG-005: OAuth Scope Requirements (Provider-Specific)

Each VCS provider requires specific OAuth scopes to access organization data:

**GitHub:**

- `read:user`: User profile information
- `user:email`: User email address
- `repo`: Repository access
- `read:org`: **Required for organizations** - List organization memberships and members

**GitLab:**

- `read_user`: User profile information
- `read_api`: Read-only API access (includes group membership)

**Gitea/Forgejo:**

- `read:user`: User profile information
- `read:organization`: Organization membership access

**Bitbucket:**

- `account`: User profile information
- `workspace`: Workspace membership access

**Implementation:**

- Update provider-specific auth configuration files
- Document scope requirements in provider README files
- Handle graceful degradation if scope not granted (show message to user)
