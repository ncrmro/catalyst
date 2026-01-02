# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Philosophy & Vision

We aim to clearly delineate **Platform Engineering** from **Feature Development**. Our goal is to keep users focused on shipping features without getting distracted by "sidequests" like managing deployments, infrastructure, or configuring developer tooling. By automating setup and configuration, we create a **"pit of success"** for the user.

**Core Principles:**

*   **Platform vs. Feature Delineation**:
    *   **Platform Work Litmus Test**: Commits should almost always be `chore` or `docs`. Descriptions must explain *why* this chore impacts feature development. We aim to cherry-pick these changes and open separate PRs to keep them isolated.
    *   **Feature Work**: Commits use `feat`, `fix`, `style`, `test` and are used in release logic. Subjects should usually reference a spec.
*   **Spec-Driven Development**: We promote keeping documentation, specifications, and declarative configuration in order, setting things up automatically as much as possible.
*   **Rapid Iteration**: We facilitate quick feature development through small, concise Pull Requests, utilizing tools like feature flags and semantic commit messages to ensure easy reviews.
*   **Agentic Future**:
    *   **Platform & Project Agents**: Will eventually assist users in both infrastructure management and code iteration.
    *   **Development Environments**: Agents run in isolated Kubernetes namespaces with full access.
    *   **Deep Introspection**: Agents leverage a comprehensive toolset including Playwright MCP for UI inspection and Grafana MCP for system observability (Prometheus/Loki/Alertmanager). This allows agents to not only debug code but also investigate performance issues and alert triggers across the full deployment spectrum.
*   **Flexible Deployment**: The platform supports self-hosted or managed SaaS models, connecting to either our clusters or the user's.

## Observability

**Guiding Context**: While full implementation is ongoing, the platform is designed to provide agents with deep visibility into system health and behavior.

*   **Stack**: The platform supports deploying a full observability stack (Prometheus, Loki, Alertmanager, Alloy) via the Prometheus Operator and Helm charts.
*   **Isolation**: Teams or projects can manage their own isolated observability stack if required.
*   **Agent Integration**: 
    *   **Grafana MCP**: Enables agents to query metrics (Prometheus) and logs (Loki) and inspect alerts (Alertmanager).
    *   **Use Cases**: Agents can autonomously review Alertmanager alerts, correlate them with logs/metrics, and debug complex infrastructure or application issues.

## Spec Driven Development

We use a specification-first approach to define features through user stories and functional requirements. For detailed guidance on our specification process, see [specs/AGENTS.md](specs/AGENTS.md).

### Active Specifications

- **[001-environments](specs/001-environments/)**: Manages deployment (production/staging) and isolated development environments with preview URLs.
- **[003-vcs-providers](specs/003-vcs-providers/)**: Integrates version control systems (GitHub) for authentication, team sync, and PR orchestration.
- **[006-cli-codeing-agents-harness](specs/006-cli-codeing-agents-harness/)**: Provides an environment for running and managing CLI-based coding agents.
- **[007-user-agent-interfaces](specs/007-user-agent-interfaces/)**: Defines the interaction patterns across Web, TUI, MCP, and ChatOps.
- **[009-projects](specs/009-projects/)**: Groups repositories into projects to enable centralized CI, release management, and spec-driven workflows.
- **[010-platform](specs/010-platform/)**: Automates project conventions, enables spec-driven development, and provides unified observability.

## Component-Specific Guidance

For detailed guidance on specific components, see their AGENTS.md files:

- `operator/AGENTS.md` - Kubernetes operator (Go, declarative infrastructure)
- `.k3s-vm/AGENTS.md` - Local K3s VM management and troubleshooting
- `web/AGENTS.md` - Web application specifics (Next.js, Database, Preview Environments)

## Development Commands

### Web Application (in `/web` directory)

For detailed NPM scripts (linting, testing, database), see `web/AGENTS.md`.

**Docker/Make Commands (from `/web`):**

```bash
make up               # Start all services with mocked GitHub data (YAML-based)
make up-real          # Start all services with real GitHub integration
make down             # Stop all services
make destroy          # Clean all services and volumes
make reset            # Clean and restart all services with fresh data
make dbshell          # Connect to PostgreSQL shell
make ci               # Run comprehensive CI tests locally
make ci-docker        # Run CI tests in Docker
```

## Architecture Overview

### Core Components

**Catalyst Platform**: A development platform for faster shipping with opinionated deployments, CI/CD pipelines, and boilerplates. 

- **Deployment Environments**: Supports Production and Staging environments with automated reconciliation.
- **Preview Environments**: Integrates with Git repositories to create isolated, full-stack preview environments for every pull request, accessible via unique URLs.

**Kubernetes Operator (`/operator`)**: Go-based Kubernetes operator that implements declarative infrastructure management. The web app creates `Environment` Custom Resources, and the operator reconciles them into actual Kubernetes resources. See `operator/AGENTS.md` for detailed guidance.

**Web Application (`/web`)**: Next.js 15 application. For technical details on the database, GitHub integration, and preview environment orchestration, see `web/AGENTS.md`.

### Local K3s Development VM

**This is the primary method for testing Kubernetes functionality locally.** The project includes a NixOS-based K3s VM for local development and integration testing.

**VM Management (from project root):**

```bash
bin/k3s-vm           # Build and start K3s VM (first time setup + start)
bin/k3s-vm stop      # Stop the running VM
bin/k3s-vm status    # Check VM status
bin/k3s-vm reset     # Destroy and rebuild VM
bin/k3s-vm ssh       # SSH into the VM
bin/k3s-vm apply     # Apply/update Kubernetes manifests without rebuilding
```

**Using kubectl:**

```bash
bin/kubectl get nodes      # Uses kubeconfig from web/.kube/config
bin/kubectl get pods -A    # List all pods across namespaces
```

**How it works:**

- Creates a NixOS VM using `nix-build` with QEMU
- K3s runs as a systemd service inside the VM
- Port forwarding: SSH (localhost:2666), K3s API (localhost:6443), Web (WEB_PORT from .env → NodePort 30000)
- Kubeconfig auto-extracted to `web/.kube/config` on start
- Integration tests use `KUBECONFIG_PRIMARY` env var (base64-encoded JSON kubeconfig)
- Kubernetes manifests defined in `.k3s-vm/manifests/base.json`
- Environment variables from `web/.env` are injected into pods

**Requirements:**

- Nix package manager installed
- KVM support (for hardware acceleration)

**Troubleshooting:** See `.k3s-vm/AGENTS.md` for detailed troubleshooting (port conflicts, orphaned processes, SSH issues).

### Kubernetes Cluster Environments

Different contexts use different Kubernetes cluster providers:

| Context               | Cluster Provider | Purpose                          |
| --------------------- | ---------------- | -------------------------------- |
| Local development     | K3s VM           | NixOS-based VM with QEMU         |
| GitHub Actions (CI)   | Kind             | Kubernetes-in-Docker for testing |
| GitHub Copilot agents | Kind             | Same infrastructure as CI        |

**Key differences:**

- **K3s VM**: Full VM with persistent state, port forwarding via QEMU, requires Nix + KVM
- **Kind**: Ephemeral Docker containers, port exposure via extraPortMappings, requires Docker only

Both environments support the same path-based ingress routing pattern (`http://localhost:8080/{namespace}/`), ensuring test parity between local development and CI.

# User Story Happy Paths

### 1. Setting up a Project

**Why:** To establish a workspace that groups multiple Git repositories. This foundation enables:
- **CI/CD Integration**: Running automated tests and pipelines.
- **Deployment Management**: Releasing new code to various environments.
- **Repository Access**: Reading and writing to repositories for specs, documentation, and configuration-as-code.
- **Visibility**: Viewing branches, pull requests, and development activity across the project.

**Flow:**
1. **Create Project**: User defines a project name and associates it with a team.
2. **Link Repositories**: User selects primary and secondary Git repositories to link to the project.
3. **Outcome**: A centralized dashboard showing project activity, ready for configuration.

### 2. Setting up a Project Configuration

**Why:** To define how the application is built and run, enabling the creation of **Deployment Environments** (Production, Staging) and **Development Environments** (cloud-based workspaces). This configuration ensures consistent deployments across all stages.

**Flow:**
1. **Access Configuration**: Navigate to `/projects/[slug]/configure`.
2. **Image & Registry**:
   - Enter the **Registry URL** (e.g., `ghcr.io/my-org`).
   - Select a **Build Method** (`Dockerfile`, `Buildpack`, or `Prebuilt`).
   - Configure build details like Dockerfile path and context.
3. **Compute Resources**:
   - Set **Default Resources** (CPU/Memory requests and limits).
   - Configure **Default Replicas**.
4. **Managed Services**:
   - Toggle and configure services like **PostgreSQL** or **Redis**.
5. **Save Changes**: Persist the configuration to the project.
6. **Inheritance**: Environments automatically use these project defaults for deployments.

## Testing Strategy

- **Unit Tests**: Business logic and utilities
- **Integration Tests**: Database operations and API endpoints
- **Component Tests**: React component behavior
- **E2E Tests**: Full user workflows with Playwright

Tests use mocked GitHub API responses in development/test mode via `GITHUB_REPOS_MODE=mocked`.

## Active Technologies
- TypeScript 5.3 (Web), Go 1.21 (Operator) + `ingress-nginx` (Kubernetes), `@catalyst/kubernetes-client` (Web) (001-environments)
- Kubernetes CRDs (Environment status), PostgreSQL (Web app state) (001-environments)

## Recent Changes
- 001-environments: Added TypeScript 5.3 (Web), Go 1.21 (Operator) + `ingress-nginx` (Kubernetes), `@catalyst/kubernetes-client` (Web)
