# 001-environments Implementation Plan

## Overview

Kubernetes functionality is split across two packages:

1. **@catalyst/kubernetes-client** (`/web/packages/catalyst-kubernetes-client`) - TypeScript client for Catalyst CRDs and pod operations
2. **kube-operator** (`/operator`) - Kubernetes operator handling environment lifecycle

This plan covers the `@catalyst/kubernetes-client` package. The operator is a separate implementation effort with its own [spec](../../operator/spec.md).

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
  - Works but not truly interactive (no WebSocket)

- **Exec server action** - `web/src/actions/pod-exec.ts`
  - Executes commands in pod containers
  - Returns stdout/stderr

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
