# VCS Providers Integration Specification

## Why

Integrating with Version Control System (VCS) providers is essential to create a unified and streamlined development lifecycle. By connecting directly with the platforms where code lives (GitHub, Gitea, GitLab), we reduce context switching, automate administrative overhead (like team management), and unlock advanced capabilities like AI-driven development workflows. This integration allows the platform to serve as a central hub for coding, project management, and automated assistance.

## What

This specification outlines the integration with major VCS providers, specifically **GitHub**, **Gitea**, and **GitLab**, with a strong emphasis on supporting **self-hosted** instances.

The core components of this integration include:

1.  **Identity & Access Management (IAM):** Using the VCS provider as an OAuth identity provider (IdP) to authenticate users. Crucially, this includes "Auto Team Joining," where user roles and team memberships in the VCS are automatically mirrored in the platform.
2.  **Project Management Synchronization:** deeply integrating with the provider's native issue tracking, project boards, and milestones.
3.  **Pull Request (PR) / Merge Request (MR) Management:** A unified interface to view, review, and manage code contributions.
4.  **AI Agent Assignment:** A mechanism to assign tasks (issues or PR reviews) to AI agents. This includes:
    *   **GitHub Copilot:** leveraging external AI coding assistants.
    *   **Custom Agents:** Orchestrating our own specialized agents that run within isolated "Agent Environments" (as defined in Spec 001). These agents can perform complex tasks, run tests, and commit code directly.

## How

The integration will be implemented through a modular provider adapter pattern, ensuring consistent functionality across different platforms.

### GitHub App Specifics

For GitHub, leveraging a GitHub App provides several distinct advantages:
*   **Discoverability:** Allows the platform to be listed in the GitHub App Directory, increasing visibility and ease of installation for organizations.
*   **Webhooks & Callbacks:** Enables efficient, event-driven integration through comprehensive webhook subscriptions and dedicated callback mechanisms for installation and authentication flows.
*   **Monetization Potential:** Provides a robust framework for charging organizations based on usage, such as compute resources consumed by agents, advanced features, or number of integrated repositories.

### 1. Authentication & Team Sync
*   **OAuth 2.0 / OIDC:** The platform will implement OAuth flows for each provider.
*   **Role Mapping:** Upon login, the system will query the provider's API for organization and team memberships. These will be mapped to internal roles (e.g., a "Admin" in a Gitea Org becomes an "Admin" in the platform's corresponding Project).
*   **Sync Frequency:** Team memberships will be refreshed on login and via webhooks (e.g., `member_added` events) to ensure near real-time consistency.

### 2. Issues & Pull Requests
*   **Unified Data Model:** An internal abstraction layer will normalize data from different providers (e.g., GitHub "Pull Request" vs. GitLab "Merge Request") into a single consistent format for the UI/CLI.
*   **Bi-directional Sync:** Actions taken in the platform (commenting, closing, approving) will be pushed to the VCS provider via API. Webhooks from the provider will update the platform's state immediately.

### 3. Agent Integration
*   **Task Assignment:** Users can assign an issue or PR to an "Agent" user in the UI.
*   **Agent Environments:** When a custom agent is assigned a task:
    1.  The platform provisions a transient **Agent Environment** (Kubernetes namespace).
    2.  The environment is seeded with the repository context and task details.
    3.  The agent performs the work (e.g., refactoring, bug fixing).
    4.  The agent commits changes, pushes to a branch, and opens/updates a PR.
*   **Copilot Integration:** For GitHub users, the platform will expose integration points to trigger Copilot-assisted workflows where APIs permit.
