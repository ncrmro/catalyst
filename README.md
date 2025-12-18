# Catalyst

A development platform designed to help you ship faster. Provides opinionated deployments, CI/CD pipelines, and boilerplates. Simply connect your Git repositories and we handle the rest.

Built on open standards, allowing you to deploy anywhere. Designed for agentic workflows.

Available as a managed platform or self-hosted solution.

## Goals

Track platform effectiveness through measurable outcomes:

- **Merged PRs**: Total pull requests merged across all projects managed by Catalyst
- **Preview Environments**: Number of preview environments deployed and actively used

## Foundation Specifications

Three specifications form the foundation of Catalyst:

### [001-environments](./specs/001-environments/spec.md)

Manages production, staging, preview, and devcontainer environments in Kubernetes with security by default. Enables restricted kube access from within namespaces—developers and agents can declare resources in their namespace for development, experimentation, and reproduction, while user permissions control broader cluster access.

### [003-vcs-providers](./specs/003-vcs-providers/spec.md)

Integrations with GitHub, GitLab, Gitea, Forgejo, and raw SSH repositories. Enables commenting on PRs with agent run results, posting preview environment URLs, synchronizing team memberships, and providing unified project management across providers.

### [006-cli-coding-agents-harness](./specs/006-cli-codeing-agents-harness/spec.md)

Enables running various CLI coding agents (Claude Code, Codex, Aider) in devcontainers or Kubernetes environments using users' own coding subscriptions. Piggybacks on each CLI agent's native capabilities—hooks, subagents, plans—rather than reinventing them, benefiting from ongoing ecosystem improvements.

## How Catalyst Helps

- An agent or user works on a new feature and opens a pull request.
- A preview environment is created for that agent.
- CI is built and ran in the same environment as the preview environment keeping things fast.
- Both agents (via MCP server) and users can inspect all internal services and public URLs of a service.

## Local Development Quick Start

Ready to get started with local development? Follow our comprehensive setup guide:

**[📖 Local Development Guide → `/web/README.md`](/web/README.md)**

The local development guide covers:

- Prerequisites and dependencies
- Environment configuration (GitHub PAT, Kubernetes)
- Kubeconfig setup using the provided conversion script
- Step-by-step local development setup
- Running tests and development servers
- Mock vs real GitHub data modes

### Essential Environment Variables for Local Development

For local development, you'll need:

- **KUBECONFIG_PRIMARY**: Base64-encoded Kubernetes configuration (use `web/scripts/kubeconfig-to-base64.sh`)
- **GITHUB_PAT**: Personal Access Token for GitHub API access (instead of GitHub App)

See the [complete local development guide](/web/README.md) for detailed setup instructions.
