# Implementation Plan: [FR-ENV-002] Local URL Testing

**Branch**: `001-environments` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-environments/spec.md`

## Summary

Implement local URL testing for development environments using hostname-based routing via `*.localhost` (e.g., `http://namespace.localhost:8080/`) alongside the existing Cloudflare proxy integration. This ensures agents and developers can access and test preview environments in offline, rootless local setups without public DNS dependencies. Modern browsers automatically resolve `*.localhost` to `127.0.0.1`, maintaining parity with production hostname-based routing patterns.

The Operator must now distinguish between 'managed' deployments (where it creates Deployment/Service) and 'helm' deployments (where it only creates Ingress for routing). This ensures Ingress policies (like local hostname-based routing) are applied regardless of how the app is deployed.

## Technical Context

**Language/Version**: TypeScript 5.3 (Web), Go 1.21 (Operator)
**Primary Dependencies**: `ingress-nginx` (Kubernetes), `@catalyst/kubernetes-client` (Web)
**Storage**: Kubernetes CRDs (Environment status), PostgreSQL (Web app state)
**Testing**: Vitest (Unit), Playwright (E2E), Go Test (Operator)
**Target Platform**: Linux/K3s (Local), Kubernetes (Production)
**Project Type**: Web application + Kubernetes Operator
**Performance Goals**: <50ms routing overhead
**Constraints**: Must work offline, rootless, and without manual host file edits
**Scale/Scope**: Support 10+ concurrent local preview environments

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Agentic-First Design**: Local URLs are deterministic and machine-accessible (localhost:port/path).
- [x] **Fast Feedback Loops**: Enables testing without full internet round-trip or DNS propagation.
- [x] **Deployment Portability**: Uses standard NGINX Ingress, compatible with standard K8s.
- [x] **Security by Default**: No new secrets; leverages existing cluster security.
- [x] **Test-Driven Quality**: Feature explicitly enables Playwright testing of preview envs.
- [x] **Layered Architecture**: Updates restricted to Operator (Ingress gen) and Web (display).

## Project Structure

### Documentation (this feature)

```text
specs/001-environments/
├── plan.md              # This file
├── research.md          # Consolidated research decision
├── research.local-url-testing.md # Detailed analysis
├── data-model.md        # Environment CRD updates
├── quickstart.md        # Usage guide
└── tasks.md             # To be created
```

### Source Code (repository root)

```text
operator/
├── api/v1alpha1/        # Environment CRD definition
└── internal/controller/ # Ingress resource generation logic

web/
└── src/
    └── components/      # UI updates to show local URLs
```

**Structure Decision**: Standard Operator pattern + Web UI update.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |

---

## [FR-ENV-003/004/005] Self-Deployment & Deployment Modes

### Summary

Enable Catalyst to deploy itself within the local K3s environment with both production and development modes, controlled by the `SEED_SELF_DEPLOY=true` environment flag.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ENV FLAG: SEED_SELF_DEPLOY=true                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  SEEDING SCRIPT (web/src/lib/seed.ts)                       │
│  1. Create Catalyst project in DB                           │
│  2. Create environment records with deploymentConfig        │
│  3. Create Environment CRs via k8s-operator.ts              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  KUBERNETES OPERATOR (operator/)                            │
│  1. Watch Environment CRs in "default" namespace            │
│  2. Branch reconciliation by spec.deploymentMode            │
│  3. Create namespace with resources per mode:               │
│     - "production": Deployment + Service + Ingress          │
│     - "development": PVCs + Init containers + Hot-reload    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  TARGET NAMESPACES                                          │
│  catalyst-production/  - Production deployment              │
│  catalyst-dev-local/   - Development with hot-reload        │
└─────────────────────────────────────────────────────────────┘
```

### CRD Extension (Gradual Approach)

Add `DeploymentMode` field only for MVP. Store detailed config in DB as JSONB. Operator reads mode and applies hardcoded templates.

```go
// operator/api/v1alpha1/environment_types.go
type EnvironmentSpec struct {
    // ... existing fields ...

    // DeploymentMode: "production" | "development" | "workspace" (default)
    // +optional
    DeploymentMode string `json:"deploymentMode,omitempty"`
}
```

### Database Schema Extension

Add `deploymentConfig` JSONB column to `projectEnvironments` table for storing detailed deployment configuration:

```typescript
// web/src/db/schema.ts
deploymentConfig: jsonb("deployment_config").$type<DeploymentConfig>();
```

### Operator Reconciliation Branching

```go
// operator/internal/controller/environment_controller.go
switch env.Spec.DeploymentMode {
case "development":
    return r.reconcileDevelopment(ctx, env, targetNamespace)
case "production":
    return r.reconcileProduction(ctx, env, targetNamespace)
default:
    return r.reconcileWorkspace(ctx, env, targetNamespace)
}
```

### Development Mode Resources (Hardcoded Templates)

Based on `.k3s-vm/manifests/base.json`:

```go
// operator/internal/controller/development_deploy.go
const (
    BaseImage       = "node:22"
    HostPath        = "/code"
    WorkDir         = "/code/web"
    PostgresImage   = "postgres:16"
)
```

Creates:

1. PVCs: `{namespace}-node-modules` (2Gi), `{namespace}-next-cache` (1Gi)
2. PostgreSQL: Deployment + Service + PVC
3. App Deployment: hostPath, init containers (npm-install, db-migrate), hot-reload
4. Service and Ingress

### Seeding Integration

```typescript
// web/src/lib/seed.ts
if (process.env.SEED_SELF_DEPLOY === "true") {
  await seedCatalystSelfDeploy(teamId);
}
```

### Environment Variable Injection

Port `get_web_env_vars()` from `bin/k3s-vm` to TypeScript for consistent env var injection into operator-created pods.
