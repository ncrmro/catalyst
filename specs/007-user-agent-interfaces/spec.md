# User-Agent Interfaces Specification

## Why

To ensure seamless adoption and maximize developer productivity, the platform must meet users where they already work. By providing multiple, synchronized interfaces, we allow developers, project managers, and AI agents to interact with the system in the manner most appropriate for their current context—whether that's a web dashboard for high-level overview, a terminal for deep debugging, or a pull request comment for quick actions.

## What

The platform defines four primary interfaces for interaction:

1.  **Web Interface:** A comprehensive graphical user interface for management, visualization, and configuration.
2.  **TUI (Text User Interface):** A terminal-based interface offering feature parity with the web UI for power users and low-bandwidth environments.
3.  **MCP (Model Context Protocol):** A standardized interface for AI agents (like Claude or GitHub Copilot) to discover and interact with the platform's resources.
4.  **VCS Provider Integrations (ChatOps):** Interaction via native Version Control System features, specifically through **mentions**, **assignments**, and **comments** in Issues and Pull Requests.

## How

### 1. Web Interface

The Web UI serves as the primary visual portal. It provides rich visualizations for:

- Environment status and resource usage.
- Project reports and analytics (as demonstrated in `spikes/1757518328_local_project_report_generation/catalyst-report.md`).
- Agent activity logs and intervention approvals.

### 2. TUI (Text User Interface)

The TUI provides a keyboard-driven experience for the CLI. It uses the same API as the Web UI to ensure consistency.

- **Authentication:** OIDC-based login.
- **Navigation:** Hierarchical view of Projects -> Environments -> Resources.
- **Action:** Direct execution of commands (e.g., triggering deployments, viewing logs) without leaving the terminal.

### 3. MCP (Model Context Protocol)

The platform exposes an MCP server to allow external AI agents to:

- **Read Context:** Fetch project specifications, environment states, and recent reports.
- **Execute Tools:** Trigger builds, run tests, or create environments on behalf of the user.
- **Resource Discovery:** Dynamically explore the API surface area.

### 4. VCS Provider Interactions (ChatOps)

This interface integrates directly into the developer's code review workflow on platforms like GitHub, GitLab, or Gitea.

- **Mentions & Commands:** Users can invoke the platform or specific agents by mentioning them in comments (e.g., `@catalyst-bot generate report` or `@catalyst-bot deploy to preview`).
- **Assignments:** Assigning the "Catalyst" user or a specific Agent to an Issue or PR triggers specific workflows:
  - **Issues:** The agent analyzes the issue and attempts to generate a fix or clarification.
  - **Pull Requests:** The agent performs code review, runs compliance checks, or attempts to resolve merge conflicts.
- **Status Updates:** The system posts comments back to the VCS provider to report progress, share links to Preview Environments, or provide generated reports (similar to the project status report example).
