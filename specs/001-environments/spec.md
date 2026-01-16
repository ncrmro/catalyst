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

## User Scenarios & Testing

### User Story 1 - Zero-Friction Development Environments (Priority: P1)

As a developer, I want to use development environments with as little friction as possible so that I can adopt the platform quickly and get to deploying features faster.

**Why this priority**: Core value proposition. Without automatic, easy-to-use environments, the platform adds friction rather than removing it.

**Independent Test**: Create a Pull Request in a repository with a standard `package.json`, verify a comment is posted with a working preview URL within 3 minutes.

**Acceptance Scenarios**:

1. **Given** a repository with `package.json` having a `dev` script, **When** a PR is opened, **Then** a development environment is automatically provisioned with the correct dev server command inferred.
2. **Given** the system detects an incorrect project type, **When** I view the environment configuration, **Then** I can override the dev command via UI or API.
3. **Given** a PR is opened, **When** the environment is ready, **Then** I receive a public URL within 3 minutes without any setup steps.
4. **Given** I need to debug an issue, **When** I access the environment, **Then** I can shell in immediately without additional authentication steps.

---

### User Story 2 - Deployment Visibility & Logs (Priority: P2)

As a developer, I want to view deployment progress and container logs so that I can troubleshoot issues when an environment fails to start.

**Why this priority**: Essential for debugging. "Black box" failures lead to user abandonment.

**Independent Test**: Navigate to the preview environment detail page in the UI, trigger a deployment error (e.g., bad build command), and verify error logs are visible.

**Acceptance Scenarios**:

1. **Given** a deployment is in progress, **When** I view the dashboard, **Then** I see the real-time status (Pending, Building, Deploying, Ready).
2. **Given** a deployment failed, **When** I click on the environment, **Then** I can see the container logs (stdout/stderr) to identify the error.

---

### User Story 3 - Continuous Feedback & Auto-Redeploy (Priority: P2)

As a developer, I want my preview environment to automatically update when I push code so that I'm always testing the latest version.

**Why this priority**: Matches standard CI/CD expectations. Stale previews are misleading.

**Independent Test**: Push a new commit to an open PR branch, verify the environment status changes to "Building/Deploying" and eventually updates with the new code.

**Acceptance Scenarios**:

1. **Given** an active preview environment, **When** I push a new commit to the PR branch, **Then** the environment automatically redeploys with the new code.
2. **Given** a redeployment completes, **When** I check the PR, **Then** the deployment comment is updated with the new status/timestamp.

---

### User Story 4 - Resource Hygiene & Cleanup (Priority: P3)

As a platform owner, I want preview environments to be deleted automatically when PRs are closed so that I don't waste cluster resources.

**Why this priority**: Cost control and cluster health. Prevents "zombie" environments.

**Independent Test**: Close a Pull Request, verify that the corresponding Kubernetes namespace and resources are deleted within 5 minutes.

**Acceptance Scenarios**:

1. **Given** an open PR with an environment, **When** the PR is closed or merged, **Then** the environment and all its resources are deleted.
2. **Given** an environment needs to be kept, **When** I disable auto-deletion (future), **Then** it persists after PR close (Edge Case).

---

### User Story 5 - Platform Operator Resource Visibility (Priority: P3)

As a platform operator, I want to see resource usage across all environments so that I can identify expensive or stuck deployments.

**Why this priority**: Operational management. Necessary for scaling beyond a single team.

**Independent Test**: View the global environments list, verify CPU/Memory usage metrics are displayed for each environment.

**Acceptance Scenarios**:

1. **Given** multiple running environments, **When** I view the admin list, **Then** I see CPU and Memory usage for each.
2. **Given** an environment is stuck or consuming excessive resources, **When** I click delete/stop, **Then** the environment is forcefully removed.

---

### User Story 6 - Advanced Configuration & Templates (Priority: P2)

As a power user, I want to configure deployments using standard tools (Docker Compose, Nix, Helm) so that I can support complex applications beyond simple Node.js apps.

**Why this priority**: Enables adoption by complex/legacy projects and "production-grade" usage.

**Independent Test**: Configure a project with a `nix-flake` or `docker-compose` template, trigger a deployment, and verify the environment matches the specification.

**Acceptance Scenarios**:

1. **Given** a project with a `docker-compose.yml`, **When** I set the template type to `docker-compose`, **Then** the operator creates deployments/services matching the compose file.
2. **Given** a project using Nix, **When** I set the template type to `nix-flake`, **Then** the environment is provisioned with the correct devShell.
3. **Given** a production requirement, **When** I configure `services.postgres.enabled: true` in the template, **Then** a managed PostgreSQL instance is provisioned alongside the app.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users receive a working preview URL within **3 minutes** of PR creation for standard project types.
- **SC-002**: Environment cleanup occurs within **5 minutes** of PR closure.
- **SC-003**: System successfully detects project type for **90%** of supported standard repositories.
- **SC-004**: Users can troubleshoot a failed deployment using UI logs within **1 minute** (without needing kubectl).

## Requirements

### Functional Requirements

- **FR-ENV-001**: System MUST gracefully handle missing Kubernetes resources in web UI (e.g. display "Pending" instead of crash).
- **FR-ENV-002**: System MUST support local URL testing via `*.localhost` hostname routing (no DNS/hosts config required).
- **FR-ENV-003**: System MUST support self-deployment via `SEED_SELF_DEPLOY` flag for end-to-end testing.
- **FR-ENV-004**: Operator MUST support "production" deployment mode (static deployment, no hot-reload).
- **FR-ENV-005**: Operator MUST support "development" deployment mode (hot-reload, volume mounts).
- **FR-ENV-006**: System MUST automatically detect project type and infer dev server command (Zero-Config).
- **FR-ENV-007**: System MUST follow precedence rules when multiple project indicators exist (Compose > Dockerfile > Node).
- **FR-ENV-008**: System MUST provide a fallback mechanism when no project type is detected (generic container + manual config).
- **FR-ENV-009**: System MUST support monorepo and nested project structures via `workdir` configuration.
- **FR-ENV-010**: System MUST handle dev command failures gracefully (status=Degraded, shell access preserved).
- **FR-ENV-011**: System MUST persist user overrides for deployment configuration across PR updates.
- **FR-ENV-012**: System MUST support `docker-compose.yml` as a deployment template source.
- **FR-ENV-013**: System MUST support prebuilt image deployments with tag overrides (for staging/promotion).
- **FR-ENV-014**: System MUST support custom/external Helm charts for advanced deployment control.
- **FR-ENV-015**: System MUST support Nix Flakes for reproducible build/dev environments.
- **FR-ENV-016**: Operator MUST copy project-level registry credentials (secrets) to environment namespaces to enable image pulling.
- **FR-ENV-017**: Operator MUST patch the default ServiceAccount in environment namespaces with `imagePullSecrets` matching the project registry credentials.
- **FR-ENV-018**: System MUST support provisioning an internal container registry (cluster-wide or per-project) backed by object storage for zero-config image hosting.
- **FR-ENV-019**: Operator MUST support a sidecar/init mechanism in "development" mode to clone sources into the development pod and enable bi-directional sync (push back to Git) for interactive development workflows.
- **FR-ENV-020**: Custom Resources (CRs) MUST follow a strict namespace hierarchy to ensure permission isolation and resource tracking:
    - **Project CRs** MUST be created in the Team Namespace (`<team-name>`).
    - **Environment CRs** MUST be created in the Project Namespace (`<team-name>-<project-name>`).
    - The Operator MUST generate the final Environment Namespace (workload target) as `<team-name>-<project-name>-<environment-name>`.
- **FR-ENV-021**: The System MUST validate and enforce the Kubernetes 63-character limit for namespace names:
    - If the generated namespace name (`<team>-<project>-<env>`) exceeds 63 characters, the System MUST truncate the components and append a hash to ensure uniqueness and validity.
    - See [Namespace Generation Procedure](#namespace-generation-procedure) for the specific algorithm.
- **FR-ENV-022**: The System MUST support just-in-time namespace creation to ensure zero-friction environment provisioning:
    - When creating a Project CR, the System MUST automatically create the Team Namespace if it doesn't exist.
    - When creating an Environment CR, the System MUST automatically create the Project Namespace if it doesn't exist.
    - Namespace creation MUST be idempotent—if a namespace already exists, the operation MUST succeed without error.
    - If namespace creation fails, the System MUST retry once and provide clear error messages indicating the failure reason.
    - This requirement ensures users can create development environments without pre-provisioning namespaces, reducing setup friction and enabling self-service workflows.

### Key Entities

- **Project**: Represents a code repository and its deployment configuration (Templates).
- **Environment**: Represents a running instance of the application (Development or Deployment).
- **EnvironmentTemplate**: Defines the deployment strategy (Helm, Nix, Compose) for a specific environment type.

## What

### Deployment Environments

Deployment environments run production and staging workloads. They are long-lived, updated through CI/CD pipelines, and configured for reliability and observability.

**Environment Templates:**

Projects define **templates** that specify how different types of environments should be deployed. To ensure consistency across the platform, projects should define two standard templates:

1.  **`development`**: Used for interactive, ephemeral environments (e.g., PR previews, local dev).
    *   Features: Hot-reload setup, smaller resource limits, "preview" configuration values.
2.  **`deployment`**: Used for stable, long-lived workloads (e.g., Staging, Production).
    *   Features: Optimized container builds, higher resource limits, production-grade configuration.
    *   Note: A "staging" environment is simply an instance that uses the `deployment` template (potentially with specific override values), ensuring parity with production.

Projects may define additional custom templates if necessary, but these two are the primary conventions.

> **Reference**: See the [`operator/examples/`](../../operator/examples/) directory for comprehensive examples of templates including Dockerfile builds, prebuilt images, Docker Compose, and managed services configuration. These files serve as the source of truth for template capabilities.

**Deployment Methods:**

The templates support various deployment strategies:

- **Kubernetes Manifests**: Direct YAML definitions for full control (stored in the user's repo)
- **Helm Charts**: Templated deployments with configurable values
- **Docker Images**: Container images deployed to managed infrastructure
- **Docker Compose**: Definition reuse from local development

**Managed Services:**

The platform provisions and manages common infrastructure dependencies. These are configured directly within the Environment Template `values`:

- **PostgreSQL**: `services.postgres.enabled: true`
- **Redis**: `services.redis.enabled: true`
- **Object Storage**: `services.s3.enabled: true`

See [`operator/examples/catalyst.project.yaml`](../../operator/examples/catalyst.project.yaml) for exact configuration syntax.

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

1.  **Team Namespace** (`<team-name>`): Contains shared infrastructure (monitoring, logging) and **Project CRs**.
2.  **Project Namespace** (`<team-name>-<project-name>`): Contains **Environment CRs** and provides a boundary for project-level permissions.
3.  **Environment Namespace** (`<team-name>-<project-name>-<environment-name>`): The actual target for workload deployments (Pods, Services, etc.).

**Just-in-Time Namespace Creation (FR-ENV-022):**

To enable zero-friction workflows, namespaces are created automatically when needed:

- When creating a **Project CR**, the system ensures the Team Namespace exists (creating it if needed).
- When creating an **Environment CR**, the system ensures the Project Namespace exists (creating it if needed).
- The operator ensures the Environment Namespace exists when reconciling the Environment CR.

This approach allows users to create development environments immediately without pre-provisioning infrastructure, while maintaining the hierarchical structure for permission isolation.

**Namespace Generation Procedure:**

Kubernetes namespaces are limited to 63 characters. When generating the namespace name `<team>-<project>-<env>`, if the total length exceeds 63 characters, the following procedure MUST be used:

1.  **Calculate Hash**: Compute a SHA-256 hash of the full string `<team>-<project>-<env>`.
2.  **Truncate Components**: Truncate the full string to 57 characters.
3.  **Append Hash**: Append a hyphen and the first 5 characters of the hash to the truncated string.
    - Format: `<truncated-string>-<hash>`
    - Total length: 57 + 1 + 5 = 63 characters.
4.  **Sanitization**: Ensure the final string complies with DNS-1123 (lowercase alphanumeric and hyphens only).

*Example:*
- Team: `my-super-long-team-name` (23)
- Project: `my-super-long-project-name` (26)
- Env: `feature-very-long-branch-name` (29)
- Total: 80 chars (exceeds 63)
- Result: `my-super-long-team-name-my-super-long-project-name-fe-a1b2c` (63 chars)

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

**[FR-ENV-012] Docker Compose Support**:
The platform supports using `docker-compose.yml` files as the definition for environments. This allows projects to reuse their existing local development configuration for Catalyst environments.
- **Mechanism**: The template specifies `type: docker-compose` and points to the file.
- **Example**: See [`operator/examples/compose.project.yaml`](../../operator/examples/compose.project.yaml).
- **Behavior**: The operator translates the Compose services into Kubernetes Deployments and Services (e.g., using Kompose logic or internal translation).
- **Scope**: Supports both "development" (hot-reload, mapped volumes if feasible) and "deployment" (static build) modes.

**[FR-ENV-013] Prebuilt Image Deployment**:
Projects can define templates that use prebuilt container images from a registry, rather than building from source.
- **Template**: Defines the repository URL and default configuration.
- **Example**: See [`operator/examples/prebuilt.project.yaml`](../../operator/examples/prebuilt.project.yaml).
- **Environment Instance**: Specifies the specific image tag or Git commit SHA to deploy.
- **Use Case**: Staging environments that deploy a specific artifact from CI, or "promotion" workflows.

**[FR-ENV-014] Custom/External Helm Chart Support**:
Advanced users can provide their own Helm charts for full control over the deployment.
- **Internal**: Path to a chart within the repository.
- **Example**: See [`operator/examples/custom-helm.project.yaml`](../../operator/examples/custom-helm.project.yaml).
- **External**: URL to an external Helm chart repository (future).
- **Behavior**: The operator acts as a "passthrough", applying the chart with the provided values, injecting only essential platform metadata (labels/annotations) without interfering with the workload structure.

**[FR-ENV-015] Nix Flake Support**:
The platform supports using Nix Flakes to define the development environment's toolchain and shell.
- **Mechanism**: The template specifies `type: nix-flake` and points to the `flake.nix` location.
- **Example**: See [`operator/examples/nix.project.yaml`](../../operator/examples/nix.project.yaml) for dev shells, and [`operator/examples/catalyst-nix.project.yaml`](../../operator/examples/catalyst-nix.project.yaml) for production builds.
- **Behavior**:
    - **Development**: The operator provisions an environment using the specified `devShell`.
    - **Production**: The operator builds container images using Nix attributes (e.g., `packages.x86_64-linux.image`) and deploys them using Helm.

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

### Devcontainer Support (Out of Scope - Future Work)

While not part of this initial specification, the preview environment architecture should be designed with future devcontainer support in mind. This would enable preview environments to serve as full interactive development environments for both humans and AI agents.

**Future Capabilities:**
- SSH access to preview environment containers for interactive development
- Port forwarding to enable local IDE connections (VS Code Remote, JetBrains Gateway)
- Devcontainer configuration support for standardized development environments
- AI agent access to development containers via SSH for autonomous coding workflows

**Architectural Implications for Current Design:**
- Preview environment containers should expose SSH ports (even if not immediately used)
- Namespace security policies should anticipate future SSH access requirements
- Container images should be structured to support both runtime and development modes
- Resource quotas should account for potential interactive development workloads

**Why Out of Scope:**
The initial preview environment deployment must focus on core deployment functionality (P1 user story). Adding interactive development support adds significant complexity around authentication, session management, and security that would delay delivery of core value. However, designing the architecture to accommodate this future use case ensures we don't create technical debt.

### Per-Team Observability (Future Work)

The strict namespace hierarchy (`Team Namespace` -> `Project Namespace` -> `Environment Namespace`) defined in this specification serves as the architectural foundation for multi-tenant observability, to be implemented in a future specification.

**Strategic Value:**
By isolating resources into predictable `<team>` and `<team>-<project>` namespaces with consistent labeling, we enable:

- **Per-Team Monitoring Stacks**: A single Prometheus/Grafana instance deployed in the Team Namespace (`<team-name>`) can automatically scrape metrics from all child Project and Environment namespaces without crossing tenant boundaries.
- **Log Isolation (Loki)**: Log aggregation agents can tag logs with `catalyst.dev/team` labels derived from the namespace, allowing RBAC-enforced log views where teams can only query their own logs.
- **Alert Routing**: Alertmanager can route notifications based on the team label to the specific team's communication channels (Slack, PagerDuty).

While the deployment of these tools is out of scope for this feature, adhering to the namespacing requirements **[FR-ENV-020]** and **[FR-ENV-021]** is critical to enabling this capability later without requiring a massive migration of existing environments.

### Open Questions

None - all critical decisions have reasonable defaults based on existing Catalyst architecture and industry standards.