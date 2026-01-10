# Implementation Plan: Environments & Templates

**Branch**: `copilot/update-deployment-ingresses-system` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-environments/spec.md`

## Summary

Standardize environment deployment strategies using **Environment Templates** within the `Project` CRD. This enables supporting diverse project types (Helm, Docker Compose, Nix) with a consistent operator and UI surface.

**North Star Goal**: Enable fully functional **development environments** for three distinct use cases:
1.  **Catalyst (Self)**: Helm-based development and production.
2.  **Next.js App**: Zero-config (no Dockerfile) + LibSQL managed service.
3.  **Rails App**: Complex `docker-compose` for development + Helm for production.

## Technical Context

**Language/Version**: Go 1.22+ (Operator), TypeScript/Next.js 15 (Web)
**Primary Dependencies**: Operator SDK, Kubernetes Client (Go/TS), Helm SDK
**Storage**: PostgreSQL (Web App), CRDs (Kubernetes)
**Testing**: Vitest (Web), EnvTest/Go Test (Operator)
**Target Platform**: Kubernetes (K3s/Kind/EKS/GKE)
**Project Type**: System (Operator + Web Platform)
**Performance Goals**: Environment provision < 3 mins
**Constraints**: Must run in restricted namespaces; "Zero-Friction" setup for users

## Constitution Check

*GATE: Passed. Standardization reduces complexity by unifying deployment paths.*

## Project Structure

### Documentation

```text
specs/001-environments/
├── plan.md              # This file
├── spec.md              # Functional requirements & User Stories
├── research.*.md        # Deep dives (DevPod, Ingress, Auth, etc.)
└── checklists/          # Quality checks
```

### Source Code

```text
operator/
├── api/v1alpha1/        # CRD Definitions (Project, Environment)
├── internal/controller/ # Reconciliation Logic
│   ├── environment_controller.go
│   ├── development_deploy.go
│   └── production_deploy.go
└── examples/            # Standardized Manifest Examples

web/
├── src/app/(dashboard)/ # UI Pages
├── packages/@catalyst/kubernetes-client/ # Shared Client Lib
└── __tests__/integration/ # Contract Tests
```

**Structure Decision**: Monorepo with `operator` (Go) and `web` (TypeScript) co-located. Shared contracts defined via CRDs.

## Phases

### Phase 1: Standardization & Specifications (Completed)

**Goal**: Define the data model and user experience for environment templates.

- [x] **Spec**: Update `spec.md` with "User Scenarios", "Requirements", and "Success Criteria".
- [x] **CRD Design**: Refactor `Project` CRD to use `templates` map instead of single `deployment`.
- [x] **Keys**: Standardize on `development` and `deployment` template keys.
- [x] **Examples**: Create comprehensive YAML examples in `operator/examples/` for Helm, Compose, Nix, and Prebuilt strategies.
- [x] **Reference**: Document Managed Services configuration (`services.postgres`, etc.).

### Phase 2: Operator Foundation (In Progress)

**Goal**: Prepare the operator to handle the new template structure.

- [x] **Plumbing**: Refactor `EnvironmentReconciler` to fetch `Project` and resolve `EnvironmentTemplate` based on `env.Spec.Type`.
- [x] **Signature Updates**: Pass `Template` object to `ReconcileDevelopmentMode` and `ReconcileProductionMode`.
- [ ] **Implementation**:
    - Update `ReconcileDevelopmentMode` to respect template configuration (e.g., specific image, env vars).
    - Implement `ReconcileProductionMode` generic logic.

### Phase 3: North Star Implementation (Critical Path)

**Goal**: Deliver the three key use cases end-to-end.

#### Use Case 1: Catalyst (Helm)
*Current status: Partially supported via legacy logic.*
- [ ] **Operator**: Implement `type: helm` support using Helm SDK (or internal emulation for MVP).
- [ ] **Template**: Verify `catalyst.project.yaml` works with the operator.

#### Use Case 2: Next.js + LibSQL (Zero-Config)
*Requirement: No Dockerfile, managed database.*
- [ ] **Build**: Implement "Zero-Config" build logic (Kaniko or similar) that defaults to a Node.js builder if no Dockerfile is found (`FR-ENV-006`).
- [ ] **Services**: Implement `services.libsql` (or generic `services` hook) in the operator to provision a sidecar or external DB.
- [ ] **Template**: Create `nextjs.project.yaml` example.

#### Use Case 3: Rails + Docker Compose
*Requirement: Complex local dev setup reuse.*
- [ ] **Parser**: Implement `docker-compose` parser in Operator (`FR-ENV-012`).
- [ ] **Translation**: Map Compose services to Kubernetes `Deployment` and `Service` objects.
- [ ] **Volume Mapping**: Handle `volumes:` for hot-reload in dev mode.
- [ ] **Template**: Create `rails.project.yaml` example using `compose.project.yaml` as base.

### Phase 4: Web Integration & Validation

**Goal**: Ensure the UI reflects the real state and allows configuration.

- [ ] **Validation**: Update `k8s-environment-cr.test.ts` to require a `Project` CR (Issue #368).
- [ ] **UI**: Update "Platform" page to display active template configuration.
- [ ] **E2E**: Verify all three North Star projects can spin up a "Ready" environment via the UI.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multiple Template Types | Diverse ecosystem (JS vs Rails vs Nix) | Forcing everyone to write K8s manifests hurts adoption ("Zero-Friction" goal). |
| Docker Compose Support | Rails/Legacy apps rely heavily on it | Rewriting complex Compose setups to Helm is a high barrier to entry. |