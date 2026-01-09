# 001-environments Implementation Plan

## Overview

Kubernetes functionality is split across two packages:

1. **@catalyst/kubernetes-client** (`/web/packages/catalyst-kubernetes-client`) - TypeScript client for Catalyst CRDs and pod operations
2. **kube-operator** (`/operator`) - Kubernetes operator handling environment lifecycle

This plan covers the `@catalyst/kubernetes-client` package. The operator is a separate implementation effort with its own [spec](../../operator/spec.md).

## Environment Templates Standardization

**Goal**: Standardize how environments are defined and deployed, ensuring the web UI, operator, and specs are aligned.

**Completed**:
- **Standardized Keys**: Mandated `development` and `deployment` as the standard template keys in `Project` CRD.
- **Reference Examples**: Created `operator/examples/project-reference.yaml` as the source of truth for template configurations (Helm, Dockerfile, Managed Services).
- **Spec Updates**: Updated `spec.md` to document standard templates and managed services.

**Upcoming Work**:
1. **Docker Compose Support (FR-ENV-012)**:
   - Design: Allow `type: docker-compose` in templates. See [`operator/examples/docker-compose.yaml`](../../operator/examples/docker-compose.yaml).
   - Implementation: Operator translates `docker-compose.yml` to Kubernetes manifests (or delegates to a tool).

2. **Prebuilt Image Overrides (FR-ENV-013)**:
   - Design: Allow templates to define a base image, with the specific tag/SHA provided by the `Environment` CR instance. See [`operator/examples/prebuilt-image.yaml`](../../operator/examples/prebuilt-image.yaml).
   - Implementation: Operator logic to inject `Environment.Spec.Sources[0].CommitSha` or `Config.Image` into the template values.

3. **User-Managed Helm (FR-ENV-014)**:
   - Design: Support templates where the user provides the full chart and values, with minimal operator interference. See [`operator/examples/user-helm.yaml`](../../operator/examples/user-helm.yaml).
   - Implementation: Ensure operator supports "passthrough" mode for Helm values.

4. **UI Updates**:
   - Update Platform page to reflect these capabilities (partially done with cross-linking).
   - Create UI forms for configuring these advanced template types.

## Related Research

- [research.web-terminal.md](./research.web-terminal.md) - Web terminal implementation approaches (WebSocket, SSE, polling, custom servers)

## Current Status

### Implemented

- **@catalyst/kubernetes-client package** - Complete with:
  - Environment CR operations (CRUD, watch with auto-reconnection)
  - Pod operations (list, logs, metrics)
  - Exec/shell functionality (command execution)
  - Multi-cluster KubeConfig support
  - Dynamic ESM loading for @kubernetes/client-node

- **Terminal UI component** - `web/src/components/terminal.tsx` using xterm.js
  - Command-by-command execution via server actions
  - Fully integrated with `exec` from `@catalyst/kubernetes-client`

- **Exec server action** - `web/src/actions/pod-exec.ts`
  - Executes commands in pod containers using new client package

### Remaining Integration Work

1. **Package Dependency**:
   - Add `"@catalyst/kubernetes-client": "workspace:*"` to `web/package.json`

2. **Real Data Integration**:
   - Update `web/src/actions/preview-environments.ts` to use `@catalyst/kubernetes-client`
   - Fetch real Pod/Container status in `web/src/app/(dashboard)/projects/[slug]/env/[envSlug]/page.tsx`
   - Replace `mockContainers` in `EnvironmentDetailView` with real data

3. **Legacy Cleanup**:
   - Migrate usages of `web/src/lib/k8s-operator.ts` to new client
   - Delete legacy files:
     - `web/src/lib/k8s-operator.ts`
     - `web/src/lib/k8s-pods.ts`
     - `web/src/lib/k8s-namespaces.ts`

### Operator Implementation Plan

**1. Build Controller Logic (Docker/Auto-detect)**
   - **Goal**: Build source code into a container image inside the cluster using Kaniko.
   - **File**: `operator/internal/controller/environment_controller.go` (logic) & `operator/internal/controller/build.go` (resource definitions).
   - **Workflow**:
     1. **Check State**: If `Environment.Status.Phase` is empty or "Pending".
     2. **Check Job**: Look for an existing Job named `build-<project>-<commit-short>` in the target namespace.
     3. **Create Job (if missing)**:
        - **Image**: `gcr.io/kaniko-project/executor:latest`
        - **Args**:
          - `--context=git://github.com/<org>/<repo>.git#<commit-sha>` (Requires git secret if private)
          - `--destination=registry.cluster.local:5000/<project>:<commit-sha>`
          - `--dockerfile=Dockerfile` (Default, or from `Project.Spec.Deployment.Path`)
          - `--insecure` (For internal registry)
          - `--cache=true` (Speed up builds)
        - **Resources**: Set reasonable requests/limits (e.g., 1GB RAM).
     4. **Update Status**: Set `Environment.Status.Phase` to "Building".
     5. **Watch Job**:
        - If **Succeeded**: Transition Phase to "Deploying".
        - If **Failed**: Transition Phase to "Failed" (User must push new commit to retry).
   - **Job Spec Example**:
     ```yaml
     apiVersion: batch/v1
     kind: Job
     metadata:
       name: build-myproj-a1b2c3d
       namespace: env-myproj-pr-123
     spec:
       ttlSecondsAfterFinished: 3600 # Cleanup successful builds
       template:
         spec:
           containers:
           - name: kaniko
             image: gcr.io/kaniko-project/executor:latest
             args:
             - "--context=git://github.com/org/repo.git#commit-sha"
             - "--destination=registry.cluster.local:5000/myproj:commit-sha"
             - "--insecure"
             env:
             - name: GIT_TOKEN # If private repo
               valueFrom: { secretKeyRef: { ... } }
           restartPolicy: Never
     ```

**2. Generic Deployment Logic (Docker/Auto-detect)**
   - **Goal**: Deploy the built image using standard K8s resources.
   - **File**: `operator/internal/controller/environment_controller.go`
   - **Logic**:
     - Once Build Job succeeds, call existing (unused) helpers in `deploy.go`:
       - `desiredDeployment`: Creates Deployment using the image from step 1.
       - `desiredService`: Creates ClusterIP service.
       - `desiredIngress`: Creates Ingress with TLS.
     - Apply these resources to the target namespace.
     - Update `Environment.Status.Phase` to "Ready".

**3. Helm Deployment Logic**
   - **Goal**: Deploy using a Helm chart defined in the repo.
   - **File**: `operator/internal/controller/environment_controller.go`
   - **Logic**:
     - If `Project.Spec.Deployment.Type` is "helm".
     - Import Helm Go SDK (`helm.sh/helm/v3`).
     - Create a Helm `ActionConfig` pointed at the target namespace.
     - Run `RunInstall` or `RunUpgrade`.
     - Map `Environment.Spec.Config.EnvVars` to Helm values (e.g., `--set env.foo=bar`).

**4. Prerequisites & Security**
   - **RBAC Permissions**:
     - Operator needs `create, get, list, watch, delete` on `batch/v1/jobs` to manage builds.
     - Operator needs `create, get` on `core/v1/secrets` to copy/mount git credentials.
   - **Secret Management**:
     - **Git Auth**: The Operator should expect a `git-credentials` Secret in its own namespace (or a referenced Secret in `Project`). It must mount this into the Kaniko pod (via `GIT_TOKEN` env var or `.git-credentials` file).
     - **Registry Auth**: Since we use `--insecure` for the internal registry, explicit auth config might be skipped for now, but production setups should mount a `docker-config` Secret.
   - **Network Policy**: The Build Job needs egress access to:
     - GitHub (to clone source).
     - Internal Registry (to push image).
     - *Note*: The `default-deny` policy created for the namespace must allow these.

**5. CI/Job Orchestration (Future/Extension)**
   - **Goal**: Run user-defined tasks (tests, migrations) within the environment.
   - **Design**: See `specs/001-environments/research.ci-jobs.md`.
   - **Implementation**:
     - Extend `Project` CRD with `jobs: []JobConfig`.
     - In `EnvironmentReconciler`, check for jobs matching current lifecycle phase (e.g., `PostBuild`).
     - Create K8s `Job` resources in the environment namespace.
     - Block/Advance `Environment` phase based on Job success.

**6. Schema Updates (Implemented)**
   - **Project CRD**: Updated to support multiple sources.
     - Changed `spec.source` (single) to `spec.sources` (array).
     - Added `name` field to `SourceConfig` to identify components (e.g., "frontend", "backend").
   - **Environment CRD**: Updated to match Project structure.
     - Changed `spec.source` (single) to `spec.sources` (array).
     - Added `name` field to `EnvironmentSource`.
   - **Impact**: Operator logic must now iterate over `sources` when reconciling builds and deployments.

**7. Testing Strategy**
   - **Unit Tests**: Coverage for helper logic (Namespace generation, URL generation).
   - **Integration Tests (Web)**:
     - **Goal**: Verify the contract between Web App and Operator.
     - **Scenario**:
       1. Call `createPreviewDeployment`.
       2. Verify `Environment` CR exists with correct `spec.sources`.
       3. *Simulate Operator*: Patch `Environment.Status` to `{ phase: "Ready", url: "..." }`.
       4. Verify `getPreviewDeploymentStatusFull` returns "Ready" and the correct URL.
   - **End-to-End Tests**: Full cluster tests (Kind/K3s) running both Web App and Operator are deferred to the Operator repo's CI.

### Deferred

- **True interactive terminal** - Requires WebSocket support
  - Next.js 15 doesn't support WebSocket route handlers natively
  - `next-ws` package not compatible with Next.js 15
  - See [research.web-terminal.md](./research.web-terminal.md) for alternatives

## Package Structure

```
web/packages/catalyst-kubernetes-client/
├── package.json
├── tsconfig.json
├── README.md
├── index.ts                        # Main exports
└── src/
    ├── config.ts                   # KubeConfig, registry, TLS handling
    ├── loader.ts                   # Dynamic ESM loading for @kubernetes/client-node
    ├── errors.ts                   # KubernetesError, ExecError, ConnectionError
    ├── types/
    │   ├── index.ts
    │   ├── environment.ts          # Environment CR types (catalyst.catalyst.dev/v1alpha1)
    │   ├── project.ts              # Project CR types
    │   └── common.ts               # K8s metadata, conditions, etc.
    ├── environments/
    │   ├── index.ts
    │   ├── client.ts               # get, list, create, update, delete, apply
    │   └── watcher.ts              # watch with auto-reconnection
    ├── pods/
    │   ├── index.ts
    │   ├── list.ts                 # List pods in namespace
    │   ├── logs.ts                 # Get/stream pod logs
    │   └── metrics.ts              # Get pod resource usage
    ├── exec/
    │   ├── index.ts
    │   ├── exec.ts                 # Run command and get result
    │   ├── shell.ts                # Interactive shell session (WebSocket)
    │   └── resize.ts               # Terminal resize handling
    └── namespaces/
        └── index.ts                # Namespace CRUD with policies
```

## API Group

All Catalyst CRDs use: `catalyst.catalyst.dev/v1alpha1`

This follows kubebuilder convention: `{group}.{domain}/{version}` where group=`catalyst`, domain=`catalyst.dev`.

## Rationale

### Why a Separate Package?

1. **Dependency Isolation**: `@kubernetes/client-node` has ESM/CommonJS compatibility issues. Containing it in one package simplifies workarounds.

2. **Type Safety**: A single package with explicit exports ensures all Kubernetes interactions go through a well-typed API surface.

3. **Focused Testing**: The package can have its own test suite with proper mocking.

4. **Clean API**: Provides typed interfaces matching Go operator CRD definitions.

### Why Two Components (Client + Operator)?

1. **Separation of Concerns**: Web app needs read access + exec. Deployment orchestration belongs in the operator.

2. **Security Model**: Web app runs with limited permissions. Operator runs with elevated cluster permissions.

3. **Reliability**: Operator's reconciliation loop handles failures and drift.

4. **Independence**: Operator can be developed, tested, and deployed separately.

## Usage

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

## Web App Integration

The web app uses the package via a re-export:

```typescript
// web/src/lib/kubernetes-client.ts
export * from "@catalyst/kubernetes-client";
```

And is configured in `next.config.ts`:

```typescript
transpilePackages: [
  "@tetrastack/react-glass-components",
  "@catalyst/kubernetes-client",
],
```

## Old Code Migration

The following files in `web/src/lib/` remain for app-specific logic (gradual migration):

| File                        | Status        | Notes                            |
| --------------------------- | ------------- | -------------------------------- |
| `k8s-client.ts`             | Keep          | Re-exports new package           |
| `k8s-namespaces.ts`         | Migrate later | Namespace create/delete logic    |
| `k8s-pods.ts`               | Migrate later | Pod listing (uses new package)   |
| `k8s-operator.ts`           | Keep          | Environment CR operations        |
| `k8s-preview-deployment.ts` | Keep          | Preview deployment orchestration |
| `k8s-pull-request-pod.ts`   | Keep          | PR pod operations                |
| `k8s-github-oidc.ts`        | Keep          | GitHub OIDC configuration        |

## Success Criteria

- [x] Environment CR operations in package
- [x] Pod operations in package
- [x] Exec functionality in package
- [x] Terminal UI component with xterm.js
- [x] Server action for command execution
- [x] Package integrated into web app
- [x] TypeCheck and lint passing
- [ ] Interactive terminal (blocked by Next.js 15 WebSocket support)
- [ ] Full migration of old k8s-\*.ts files
- [ ] Integration tests with K3s VM
- [ ] Verify Namespace naming: `<team>-<project>-<env>` with labels
- [ ] FR-ENV-001: Graceful handling of missing Kubernetes resources in web UI

## FR-ENV-001: Graceful Handling of Missing Kubernetes Resources

### Approach

1. **Create reusable `KubeResourceNotFound` component** (`web/src/components/kube-resource-not-found.tsx`):
   - Accepts resource type (e.g., "Environment"), resource name, and optional retry callback
   - Displays clear message that resource was not found in cluster
   - Lists possible causes (deleted externally, `make reset`, cluster connectivity, operator not reconciled)
   - Provides retry button to re-fetch from cluster

2. **Update environment page** (`web/src/app/(dashboard)/projects/[slug]/env/[envSlug]/page.tsx`):
   - Use `KubeResourceNotFound` component when environment CR is not found
   - Pass resource type and name for context

## Operator Integration

The web application uses a declarative operator-based workflow:

**Web App Responsibilities:**

- Create Environment CRs
- Read CR status
- Delete CRs
- Poll CR status to update database and UI
- Execute commands in environment pods

**Operator Responsibilities:**

- Define Project and Environment CRDs
- Handle namespace creation with ResourceQuota and NetworkPolicy
- Orchestrate Helm and manifest deployments
- Manage build jobs for PR images
- Update CR status (phase: Pending → Building → Deploying → Ready)
- Cleanup on CR deletion (finalizer pattern)

See [Operator Specification](../../operator/spec.md) for implementation details.
