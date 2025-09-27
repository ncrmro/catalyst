# Catalyst

A development platform designed to help you ship faster. Provides opinionated deployments, CI/CD pipelines, and boilerplates. Simply connect your Git repositories and we handle the rest.

Built on open standards, allowing you to deploy anywhere. Designed for agentic workflows.

Available as a managed platform or self-hosted solution.

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
