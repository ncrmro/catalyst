# Environments Specification

## Research

- [research.devpod.md](./research.devpod.md) - DevPod with Kubernetes provider, workspace creation, access methods, and Catalyst integration architecture
- [research.kubectl-oidc-auth.md](./research.kubectl-oidc-auth.md) - Kubernetes API OIDC authentication, kubelogin setup, RBAC integration, and cloud provider options
- [research.kube-namespace-resources.md](./research.kube-namespace-resources.md) - Resource quotas for CPU, memory, storage limits per namespace
- [research.kube-network-policies.md](./research.kube-network-policies.md) - Network policies for namespace isolation and egress control
- [research.docker-registry.md](./research.docker-registry.md) - Docker Distribution registry for storing PR branch images
- [research.nginx-ingress.md](./research.nginx-ingress.md) - NGINX ingress controller for routing to preview environments

## Child Specifications

- [Operator Specification](../../operator/spec.md) - Kubernetes operator that manages Environment CRs

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

- **Project CRD**: Defines deployment configuration (Helm, manifests, images)
- **Environment CRD**: Represents dev/staging/production environments
- **Deployment Orchestration**: Helm chart deployment, manifest application
- **Preview Environment Lifecycle**: Create/update/delete on PR events
- **Policy Application**: ResourceQuota and NetworkPolicy per namespace
- **Build Jobs**: Container image builds from PR branches

**Why a Separate Operator:**

- Moves complex orchestration out of the web application
- Runs in-cluster with proper service account permissions
- Reconciliation loop handles failures and drift
- CRDs provide declarative API for environment state
- Can be developed and deployed independently

### kube-client

A lightweight Kubernetes client library used by the web application.

**Location**: `/web/packages/kube-client`

**Responsibilities:**

- Read-only operations (list pods, get logs, describe resources)
- Status queries for UI display
- MCP server integration for AI agent access
- No deployment or mutation logic

**Why Separate from Operator:**

- Web app doesn't need cluster-admin permissions
- Simpler security model (read-only)
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
