# 001-environments Implementation Plan

## Overview

Kubernetes functionality is split across two packages:

1. **kube-client** (`/web/packages/kube-client`) - Lightweight read-only client for the web application
2. **kube-operator** (`/packages/kube-operator`) - Kubernetes operator handling all deployment orchestration

This plan covers the `kube-client` package. The `kube-operator` is a separate implementation effort.

## Rationale

### Why Two Packages?

1. **Separation of Concerns**: The web app needs read-only access (logs, status, pod lists). Deployment orchestration belongs in a Kubernetes operator running in-cluster.

2. **Security Model**: Web app runs with minimal permissions. Operator runs with elevated cluster permissions for creating namespaces, deployments, etc.

3. **Reliability**: Operator's reconciliation loop handles failures and drift. Web app just reads state.

4. **Independence**: Operator can be developed, tested, and deployed separately from the web application.

### Why kube-client as a Package?

1. **Dependency Isolation**: `@kubernetes/client-node` has ESM/CommonJS compatibility issues. Containing it in one package simplifies workarounds.

2. **Type Safety**: A single package with explicit exports ensures all Kubernetes interactions go through a well-typed API surface.

3. **Focused Testing**: The package can have its own test suite with proper mocking.

4. **Private by Design**: Marked as `private: true` in package.json—internal use only.

## Files to Extract (kube-client)

Current Kubernetes files in `web/src/lib/` and their disposition:

| File                        | Disposition       | Notes                                     |
| --------------------------- | ----------------- | ----------------------------------------- |
| `k8s-client.ts`             | **kube-client**   | Core client wrapper, KubeConfig, registry |
| `k8s-namespaces.ts`         | **kube-client**   | Read operations only (list, exists)       |
| `k8s-pods.ts`               | **kube-client**   | Pod listing and status                    |
| `k8s-preview-deployment.ts` | **kube-operator** | Deploy/delete moves to operator           |
| `k8s-pull-request-pod.ts`   | **kube-operator** | Build jobs move to operator               |
| `k8s-github-oidc.ts`        | **kube-operator** | OIDC config moves to operator             |
| `helm-deployment.ts`        | **kube-operator** | Helm deployment moves to operator         |
| `mcp-namespaces.ts`         | **kube-client**   | MCP integration (read-only)               |

**Note:** Files marked "kube-operator" will be removed from the web app once the operator is implemented. Until then, they remain functional but are not part of kube-client.

## Target Package Structure

```
web/packages/kube-client/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts              # Public exports
│   ├── client.ts             # KubeConfig, registry, API factories
│   ├── namespaces.ts         # Namespace read operations
│   ├── pods.ts               # Pod listing and status
│   ├── logs.ts               # Log streaming
│   ├── resources.ts          # Resource usage queries
│   └── types.ts              # Shared types
└── __tests__/
    ├── client.test.ts
    ├── namespaces.test.ts
    └── ...
```

## Package Configuration

```json
{
  "name": "@catalyst/kube-client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@kubernetes/client-node": "^1.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Migration Strategy

### Phase 1: Create Package Structure

1. Create `web/packages/kube-client/` directory
2. Initialize package.json with proper configuration
3. Set up tsconfig.json extending root config
4. Configure vitest for the package

### Phase 2: Extract Read-Only Operations

1. Copy read-only files from `web/src/lib/k8s-*.ts` to package
2. Rename to cleaner names (drop `k8s-` prefix)
3. Remove any write/mutation operations (will move to operator)
4. Create unified `index.ts` with explicit exports

### Phase 3: Update Consumers

1. Find all imports of `@/lib/k8s-*` for read operations
2. Update to import from `@catalyst/kube-client`
3. Add package to Next.js `transpilePackages` if needed

### Phase 4: Move Tests

1. Move related tests from `web/__tests__/` to package
2. Update test imports and mocks
3. Ensure CI runs package tests

### Phase 5: Cleanup

1. Delete extracted files from `web/src/lib/`
2. Keep deployment/orchestration files (temporary until operator exists)
3. Update documentation

## Export API Design

The package exposes read-only operations:

```typescript
// Client & Configuration
export { KubeConfig, KubeConfigRegistry } from './client'
export { getCoreV1Api, getAppsV1Api } from './client'

// Namespace Operations (read-only)
export { listNamespaces, namespaceExists } from './namespaces'
export { getNamespaceStatus } from './namespaces'

// Pod Operations (read-only)
export { listPodsInNamespace, getPodStatus } from './pods'

// Log Operations
export { getPodLogs, streamPodLogs } from './logs'

// Resource Usage
export { getPodResourceUsage, getNamespaceResourceUsage } from './resources'

// Types
export type { ... } from './types'
```

**Not included** (moves to kube-operator):

- `createProjectNamespace`, `deleteNamespace`
- `deployPreviewApplication`, `deletePreviewDeployment`
- `createPullRequestPodJob`, `cleanupPullRequestPodJob`
- `deployHelmChart`, `deleteHelmRelease`

## Success Criteria

- [ ] Read-only K8s operations live in `@catalyst/kube-client`
- [ ] Package has dedicated test suite
- [ ] MCP server uses `@catalyst/kube-client` for queries
- [ ] UI uses `@catalyst/kube-client` for status/logs
- [ ] CI passes with package-level testing
- [ ] Deployment operations remain in `web/src/lib/` (until operator)

## Future: kube-operator

The `kube-operator` package (`/packages/kube-operator`) will be implemented separately and will:

- Define Project and Environment CRDs
- Handle namespace creation with policies
- Orchestrate Helm and manifest deployments
- Manage build jobs for PR images
- Run as a Kubernetes Deployment in-cluster

See `spec.md` Architecture section for details.
