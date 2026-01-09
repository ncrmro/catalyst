# Environments Specification

Catalyst manages two types of environments: **Deployment Environments** (production/staging) for running workloads reliably, and **Development Environments** for interactive development. Development environments serve as **preview environments for pull requests**—automatically created when a PR is opened, providing a public URL for testing and full shell access for debugging.

## Research

- [research.devpod.md](./research.devpod.md) - DevPod with Kubernetes provider, workspace creation, access methods, and Catalyst integration architecture
- [research.kubectl-oidc-auth.md](./research.kubectl-oidc-auth.md) - Kubernetes API OIDC authentication, kubelogin setup, RBAC integration, and cloud provider options
- [research.kube-namespace-resources.md](./research.kube-namespace-resources.md) - Resource quotas for CPU, memory, storage limits per namespace
- [research.kube-network-policies.md](./research.kube-network-policies.md) - Network policies for namespace isolation and egress control
- [research.docker-registry.md](./research.docker-registry.md) - Docker Distribution registry for storing PR branch images
- [research.nginx-ingress.md](./research.nginx-ingress.md) - NGINX ingress controller for routing to preview environments
- [research.web-terminal.md](./research.web-terminal.md) - Web terminal implementation approaches (WebSocket, SSE, polling, custom servers)
- [research.local-url-testing.md](./research.local-url-testing.md) - Local development URL testing approaches (nip.io, hosts, dnsmasq, tunnels)
- [research.project-detection.md](./research.project-detection.md) - Automatic project type detection implementation (FR-ENV-006 through FR-ENV-011)

## Child Specifications

- [Operator Specification](../../operator/spec.md) - Kubernetes operator that manages Environment CRs

## Why

Environments provide isolated and pre-configured contexts for code to run. The platform distinguishes between two fundamental use cases:

1. **Deployment** - Running production and staging workloads reliably with managed infrastructure
2. **Development** - Interactive environments where humans and agents can build, test, and iterate with real-world feedback

This separation ensures production stability while enabling rapid experimentation. Development environments extend the traditional "preview environment" concept—they're not just view-only deployments, but fully interactive spaces where developers can shell in, agents can autonomously code, and both can inspect their work through real public URLs.

## User Stories

### US-1: Zero-Friction Development Environments (P1)

As a developer, I want to use development environments with as little friction as possible so that I can adopt the platform quickly and get to deploying features faster.

**Acceptance Criteria**:

1. **Given** a repository with a standard project structure (e.g., `package.json` with `dev` script), **When** a PR is opened, **Then** a development environment is automatically provisioned with the correct dev server command inferred—no manual configuration required.
2. **Given** the system detects an incorrect project type, **When** I view the environment configuration, **Then** I can override the dev command via UI or API.
3. **Given** a PR is opened, **When** the environment is ready, **Then** I receive a public URL within 2 minutes without any setup steps.
4. **Given** I need to debug an issue, **When** I access the environment, **Then** I can shell in immediately without additional authentication steps.

**Related Requirements**: [FR-ENV-006] Automatic Project Type Detection

## What

### Deployment Environments

Deployment environments run production and staging workloads. They are long-lived, updated through CI/CD pipelines, and configured for reliability and observability.

**Environment Templates:**

Projects define **templates** that specify how different types of environments (e.g., "development", "staging", "production") should be deployed. These templates allow for different configurations, such as:

- **Development**: Hot-reload setup, smaller resource limits, "preview" values.
- **Production**: optimized container builds, higher resource limits, "production" values, different Helm chart or manifest paths.

**Deployment Methods:**

The templates support various deployment strategies:

- **Kubernetes Manifests**: Direct YAML definitions for full control (stored in the user's repo)
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
- **Real Public & Local URLs**: Traffic proxied through Cloudflare (for public access) or NGINX hostname-based routing via `*.localhost` (for local development) to the environment
- **Namespace Resource Control**: Agents have full access to create, modify, and delete Kubernetes resources within their namespace—databases, caches, sidecars, or any infrastructure needed for development
- **Agent Workspace**: Agents can work autonomously—coding, running tests, inspecting results. Enables [spec-driven development](https://github.com/github/spec-kit/blob/main/spec-driven.md) workflows with real-world validation
- **Browser Testing**: From inside the environment, agents can use Playwright to test the real proxied URL, seeing exactly what users would see
- **Devcontainer Support**: Standard devcontainer configurations for consistent tooling

**Triggers:**

- **Pull Request Opened**: Automatically provisions a development environment for the PR branch
- **Manual Creation**: Developers can spin up environments for experimentation
- **Agent Request**: Agents can request environments for autonomous coding workflows
- **Branch Push**: Optionally trigger on any branch push (configurable)

**Key Insight: Development Environments ARE Preview Environments**

Development environments are "preview environments but more." When a pull request is opened, Catalyst creates a development environment that serves as the preview—but unlike traditional preview-only deployments, these environments let you:

- Shell into the running containers
- Have agents work inside them autonomously
- Inspect the real public URL with actual browser automation
- Iterate without leaving the environment

**Pull Request Integration (Preview Environments):**

When a PR is opened, a development environment serves as the preview environment:

1. A development environment (the "preview environment") is automatically created
2. The branch is deployed with a real public URL for review and testing
3. A comment is posted to the PR with the preview URL and environment status
4. Developers and agents can shell in to debug, test, or iterate
5. On PR close/merge, the preview environment is cleaned up

## How

### Kubernetes Foundation

All environments operate within dedicated Kubernetes namespaces, structured hierarchically:

**Namespace Hierarchy:**

1.  **Team Namespace** (`<team-name>`): Contains shared infrastructure (monitoring, logging).
2.  **Project Namespace** (`<team-name>-<project-name>`): Logical grouping for project resources.
3.  **Environment Namespace** (`<team-name>-<project-name>-<environment-name>`): The actual target for workload deployments.

**Labels:**

All generated namespaces and resources are tagged with:

- `catalyst.dev/team`
- `catalyst.dev/project`
- `catalyst.dev/environment`
- `catalyst.dev/branch`

**Isolation Features:**

- **Resource Isolation**: CPU, memory, and storage quotas per environment
- **Network Isolation**: Network policies restrict cross-namespace traffic
- **Security Boundaries**: RBAC controls what each environment can access

### URL Proxying

Development environments receive real public URLs through proxy infrastructure:

- Cloudflare Tunnels (or similar) route traffic to environment namespaces
- TLS termination handled at the proxy layer
- DNS automatically configured for each environment
- Agents inside the environment can fetch their own public URL to test with Playwright

**[FR-ENV-002] Local Development URL Testing**:
For local development where public DNS is not available or desired, the system supports hostname-based routing using `*.localhost` (e.g., `http://namespace-name.localhost:8080/`). Modern browsers automatically resolve `*.localhost` to `127.0.0.1`, enabling hostname-based routing without DNS configuration or hosts file modifications. This approach maintains parity with production routing patterns while working fully offline.

**[FR-ENV-003] Self-Deployment via Environment Flag**:
When `SEED_SELF_DEPLOY=true` is set, the seeding script creates Catalyst itself as a fixture project with both production and development environments. This enables end-to-end testing of deployment and development workflows within the local K3s environment.

**[FR-ENV-004] Production Deployment Mode**:
The operator supports a "production" deployment mode that creates a static deployment from the existing manifest pattern (similar to `.k3s-vm/manifests/base.json`). Production deployments include:

- Deployment with built container image
- Service for internal routing
- Ingress for external access
- Optional PostgreSQL sidecar

**[FR-ENV-005] Development Deployment Mode**:
The operator supports a "development" deployment mode that creates a hot-reload development environment. Development deployments include:

- hostPath volume mount for live code changes (`/code`)
- Init containers for `npm install` and database migrations
- PVCs for node_modules and .next cache persistence
- `WATCHPACK_POLLING=true` for file system watching in VMs
- PostgreSQL sidecar for database

**[FR-ENV-006] Automatic Project Type Detection**:
When creating a development environment, the system attempts to detect the project type and infer sensible defaults for the dev server command. Detection is best-effort—if incorrect, users can override in the environment configuration. Detection heuristics include:

| Indicator                              | Inferred Setup                                 |
| -------------------------------------- | ---------------------------------------------- |
| `package.json` with `scripts.dev`      | `npm run dev` (or pnpm/yarn based on lockfile) |
| `package.json` with `scripts.start`    | `npm start` as fallback                        |
| `docker-compose.yml` or `compose.yml`  | `docker compose up`                            |
| `Dockerfile` only                      | Build and run container                        |
| `Makefile` with `dev` target           | `make dev`                                     |
| `pyproject.toml` or `requirements.txt` | Python environment (future)                    |
| `go.mod`                               | Go environment (future)                        |

The detected configuration is stored in the Environment CR's `spec.devCommand` field and can be overridden via the UI or API. This enables zero-config preview environments for common project structures while remaining flexible for custom setups.

**[FR-ENV-007] Detection Precedence Rules**:
When multiple project indicators are present, detection follows this priority order:

1. `docker-compose.yml` / `compose.yml` (highest - explicit orchestration intent)
2. `Dockerfile` (containerized but no orchestration)
3. `package.json` with `scripts.dev` (Node.js development)
4. `Makefile` with `dev` target (generic build system)
5. `package.json` with `scripts.start` (Node.js fallback)

The first matching indicator wins. Users can override if the inferred choice is incorrect.

**[FR-ENV-008] Fallback When No Project Type Detected**:
When no recognized project indicators are found, the system:

1. Creates the environment with a generic base container (e.g., `ubuntu:latest`)
2. Displays a prompt in the UI indicating "No project type detected"
3. Provides a configuration form to manually specify the dev command
4. Does NOT block environment creation—users can still shell in and configure manually

**[FR-ENV-009] Monorepo and Nested Project Handling**:
For repositories with multiple project roots or nested structures:

- Detection scans the repository root by default
- If `spec.workdir` is specified in the Environment CR, detection runs from that subdirectory
- Common patterns auto-detected: `web/`, `app/`, `frontend/`, `backend/`, `packages/*`
- When multiple `package.json` files exist, the root-level one takes precedence unless `workdir` overrides

**[FR-ENV-010] Dev Command Failure Recovery**:
When the detected or configured dev command fails on startup:

1. Environment enters `degraded` status (not `failed`)
2. Container remains running for debugging (shell access preserved)
3. Logs are captured and surfaced in the UI
4. User is prompted to either fix the command or override it
5. "Retry" action re-runs the dev command without full environment recreation

**[FR-ENV-011] Override Scope and Persistence**:
User overrides to detected configuration follow these rules:

- **Scope**: Overrides apply at the **project level** by default (all environments for that project)
- **Per-environment override**: Optional flag to apply override only to specific environment
- **Persistence**: Overrides are stored in the database `projectEnvironments.deploymentConfig` field
- **PR updates**: When a PR is updated (new commits), existing overrides are preserved unless the user explicitly resets to auto-detect

### User Interfaces

**CLI/TUI:**

- OIDC authentication for secure `kubectl` and `k9s` access
- Shell into any environment the user has access to
- View logs, metrics, and deployment status

**Web Interface:**

- Dashboard for all environments across projects
- Log streaming and container inspection
- One-click environment creation and deletion
- **[FR-ENV-001] Graceful handling of missing Kubernetes resources**: Pages that display Kubernetes resources must handle cases where a resource exists in the database but is not found in the cluster (e.g., deleted externally, cluster connectivity issues, developer ran `make reset` which cleared the cluster, or operator not yet reconciled). The page must display available context from the database, distinguish between "pending creation" vs "missing/deleted" states, and provide options to retry, re-create, or clean up orphaned records. Primary example: the environment detail page (`/projects/[slug]/env/[envSlug]`) when an Environment CR is missing from the cluster

**MCP (Model Context Protocol):**

- AI agents discover and interact with environments programmatically
- Create, inspect, shell into, and delete environments via tools
- Full parity with human interfaces

### Security

- Namespace isolation prevents cross-environment access
- Network policies restrict egress to approved services only
- Credentials injected ephemerally, never stored in containers
- Audit logging for all environment operations

### Kubernetes Access via OIDC

Users can access environments directly via Kubernetes tools (kubectl, k9s, custom TUI) using OIDC authentication.

**Authentication Options:**

- **Catalyst OIDC Provider**: Authenticate through Catalyst's built-in OIDC flow
- **Cloud Provider OIDC**: Use native cloud provider flows (AWS EKS, GCP GKE, Azure AKS)

**Access Level Conventions:**

| Environment Type                    | Role     | Capabilities                                                                            |
| ----------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| **Deployment** (production/staging) | Observer | View logs, describe resources, list pods/deployments. No secrets, exec, or port-forward |
| **Deployment** (production/staging) | Admin    | Full access including secrets, exec, port-forward, resource modifications               |
| **Development**                     | Owner    | Full namespace access—exec, port-forward, create/delete resources, view secrets         |

**Key Principles:**

- **Deployment Environments**: Role assigned per user/team per environment. Most users get Observer; Admins are explicitly granted
- **Development Environments**: Users have full control within their namespace boundaries via service account token. They can do anything they want, limited only to that namespace
- **Namespace Scoping**: Users only see and can access namespaces they've been granted access to

## Architecture

### Package Structure

Kubernetes functionality is split across two packages with distinct responsibilities:

```
/packages/
└── kube-operator/        # Kubernetes operator (separate package)

/web/
└── packages/
    └── kube-client/      # Lightweight K8s client for web app
```

### kube-operator

A dedicated Kubernetes operator that manages environment lifecycle through Custom Resource Definitions (CRDs).

**Location**: `/packages/kube-operator`

**Responsibilities:**

- **Project CRD**: Defines deployment configuration using **templates** for different environment types (dev, prod)
- **Environment CRD**: Represents dev/staging/production environments
- **Deployment Orchestration**: Helm chart deployment, manifest application based on selected template
- **Preview Environment Lifecycle**: Create/update/delete on PR events
- **Policy Application**: ResourceQuota and NetworkPolicy per namespace
- **Build Jobs**: Container image builds from PR branches

**Why a Separate Operator:**

- Moves complex orchestration out of the web application
- Runs in-cluster with proper service account permissions
- Reconciliation loop handles failures and drift
- CRDs provide declarative API for environment state
- Can be developed and deployed independently

### kube-client (@catalyst/kubernetes-client)

A TypeScript client library for Catalyst Kubernetes CRDs (Environment, Project) with exec/shell support.

**Location**: `/web/packages/catalyst-kubernetes-client`

**API Group**: `catalyst.catalyst.dev/v1alpha1`

**CRD Types:**

- `Environment` - Represents development/staging/production environments
- `Project` - Defines project configuration (future)

**Capabilities:**

- **Environment Operations**: CRUD operations on Environment CRs (get, list, create, update, delete, apply)
- **Watch Support**: Real-time updates with automatic reconnection and exponential backoff
- **Pod Operations**: List pods, get container logs, stream logs
- **Exec/Shell**: Execute commands in containers, interactive shell sessions
- **Namespace Operations**: Create/delete namespaces with resource quotas and network policies
- **Multi-Cluster**: Registry-based configuration for multiple clusters

**Key Features:**

- Dynamic ESM loading for @kubernetes/client-node (avoids SSR issues)
- TypeScript types matching Go operator CRD definitions
- Watch auto-reconnection with configurable backoff
- Exec via WebSocket with channel multiplexing

**Usage:**

```typescript
import {
  createEnvironmentClient,
  EnvironmentWatcher,
  getClusterConfig,
  exec,
} from "@catalyst/kubernetes-client";

// List environments
const client = await createEnvironmentClient();
const envs = await client.list({ namespace: "catalyst-system" });

// Execute command in pod
const kubeConfig = await getClusterConfig();
const result = await exec(kubeConfig, {
  namespace: "pr-123",
  pod: "app-0",
  command: ["ls", "-la"],
});
```

**Why Separate from Operator:**

- Web app doesn't need cluster-admin permissions
- Simpler security model (read-only for most operations)
- Can be tested independently
- Provides typed interface for frontend components
- Faster, lighter dependency for the web tier

### Interaction Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Application                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Web UI    │    │  MCP Server │    │   Actions   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│                    ┌─────────────┐                               │
│                    │ kube-client │  (read-only queries)          │
│                    └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼ kubectl API
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    kube-operator                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │ Project CRD │  │Environment  │  │ Reconciler  │     │    │
│  │  │  Watcher    │  │ CRD Watcher │  │   Loop      │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                  │
│         ▼                  ▼                  ▼                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │  Namespace  │   │ Deployment  │   │   Ingress   │            │
│  │ + Policies  │   │  + Service  │   │             │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow Example: PR Opened

1. GitHub webhook received by web app
2. Web app creates/updates Environment CR via Kubernetes API
3. kube-operator reconciler detects new Environment CR
4. Operator creates namespace with ResourceQuota and NetworkPolicy
5. Operator builds image, pushes to registry
6. Operator deploys application and creates Ingress
7. Operator updates Environment CR status with URL
8. Web app (via kube-client) reads status, posts comment to PR
