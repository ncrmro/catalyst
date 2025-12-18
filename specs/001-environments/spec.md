# Environments Specification

## Why

Environments provide isolated and pre-configured contexts for code to run. The platform distinguishes between two fundamental use cases:

1. **Deployment** - Running production and staging workloads reliably with managed infrastructure
2. **Development** - Interactive environments where humans and agents can build, test, and iterate with real-world feedback

This separation ensures production stability while enabling rapid experimentation. Development environments extend the traditional "preview environment" concept—they're not just view-only deployments, but fully interactive spaces where developers can shell in, agents can autonomously code, and both can inspect their work through real public URLs.

## What

### Deployment Environments

Deployment environments run production and staging workloads. They are long-lived, updated through CI/CD pipelines, and configured for reliability and observability.

**Deployment Methods:**

- **Kubernetes Manifests**: Direct YAML definitions for full control
- **Helm Charts**: Templated deployments with configurable values
- **Docker Images**: Container images deployed to managed infrastructure

**Managed Services:**

The platform provisions and manages common infrastructure dependencies if the user's helm chart or manifest don't already:

- PostgreSQL databases with automatic backups
- Redis for caching and queues
- Object storage (S3-compatible)
- Other services as configured per project

**Lifecycle:**

- Created when a project is configured
- Updated on merge to main/release branches
- Staging mirrors production configuration for safe testing
- Production deployments require explicit approval or automated gates

### Development Environments

Development environments are interactive workspaces for humans and agents. They extend the preview environment concept with full shell access and real-world URL proxying.

**Core Capabilities:**

- **Shell Access**: SSH or exec into containers for interactive development
- **Real Public URLs**: Traffic proxied through Cloudflare (or similar) to the environment
- **Agent Workspace**: Agents can work autonomously—coding, running tests, inspecting results
- **Browser Testing**: From inside the environment, agents can use Playwright to test the real proxied URL, seeing exactly what users would see
- **Devcontainer Support**: Standard devcontainer configurations for consistent tooling

**Triggers:**

- **Pull Request Opened**: Automatically provisions a development environment for the PR branch
- **Manual Creation**: Developers can spin up environments for experimentation
- **Agent Request**: Agents can request environments for autonomous coding workflows
- **Branch Push**: Optionally trigger on any branch push (configurable)

**Key Insight:**

Development environments are "preview environments but more." Traditional previews let you view a deployment. Development environments let you:

- Shell into the running containers
- Have agents work inside them autonomously
- Inspect the real public URL with actual browser automation
- Iterate without leaving the environment

**Pull Request Integration:**

When a PR is opened:

1. A development environment is automatically created
2. The branch is deployed with a real public URL
3. A comment is posted to the PR with the URL and environment status
4. Developers and agents can shell in to debug, test, or iterate
5. On PR close/merge, the environment is cleaned up

## How

### Kubernetes Foundation

All environments operate within dedicated Kubernetes namespaces, providing:

- **Resource Isolation**: CPU, memory, and storage quotas per environment
- **Network Isolation**: Network policies restrict cross-namespace traffic
- **Security Boundaries**: RBAC controls what each environment can access

### URL Proxying

Development environments receive real public URLs through proxy infrastructure:

- Cloudflare Tunnels (or similar) route traffic to environment namespaces
- TLS termination handled at the proxy layer
- DNS automatically configured for each environment
- Agents inside the environment can fetch their own public URL to test with Playwright

### User Interfaces

**CLI/TUI:**

- OIDC authentication for secure `kubectl` and `k9s` access
- Shell into any environment the user has access to
- View logs, metrics, and deployment status

**Web Interface:**

- Dashboard for all environments across projects
- Log streaming and container inspection
- One-click environment creation and deletion

**MCP (Model Context Protocol):**

- AI agents discover and interact with environments programmatically
- Create, inspect, shell into, and delete environments via tools
- Full parity with human interfaces

### Security

- Namespace isolation prevents cross-environment access
- Network policies restrict egress to approved services only
- Credentials injected ephemerally, never stored in containers
- Audit logging for all environment operations
