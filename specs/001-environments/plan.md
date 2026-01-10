# Implementation Plan: Environments & Templates

**Branch**: `copilot/update-deployment-ingresses-system` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-environments/spec.md`

## Summary

Standardize environment deployment strategies using **Environment Templates** within the `Project` CRD. This enables supporting diverse project types (Helm, Docker Compose, Nix) with a consistent operator and UI surface.

## Technical Context

**Language/Version**: Go 1.22+ (Operator), TypeScript/Next.js 15 (Web)
**Target Platform**: Kubernetes (K3s/Kind/EKS/GKE)
**Project Type**: System (Operator + Web Platform)

## Constitution Check

*GATE: Passed. Standardization reduces complexity by unifying deployment paths.*

## Project Structure

### Documentation

```text
specs/001-environments/
├── plan.md              # This file
├── spec.md              # Functional requirements & User Stories
├── research.*.md        # Deep dives
└── tasks.md             # Implementation tasks
```

### Source Code

```text
operator/
├── api/v1alpha1/        # CRD Definitions
├── internal/controller/ # Reconciliation Logic
└── examples/            # Standardized Manifest Examples

web/
├── src/app/(dashboard)/ # UI Pages
├── packages/@catalyst/kubernetes-client/ # Client Lib
└── __tests__/integration/ # Contract Tests
```

---

## North Star Goals (Amendment 2026-01-09)

We are focusing on enabling fully functional **development environments** for three distinct use cases:

1.  **Catalyst (Self-hosting)**:
    -   **Strategy**: Helm-based for both development (hot-reload) and production.
    -   **Goal**: Prove the platform can host itself using standard Helm charts.

2.  **Next.js App + LibSQL**:
    -   **Strategy**: Zero-config (no Dockerfile) build. Managed database service (LibSQL/Turso).
    -   **Goal**: Prove "Zero-Friction" onboarding for modern web apps without containers.

3.  **Rails App**:
    -   **Strategy**: `docker-compose.yml` for development (complex local setup reuse). Helm for production.
    -   **Goal**: Prove support for legacy/complex stacks that rely on Docker Compose for local dev.

## Implementation Strategy (Phase 14 Amendment)

The North Star goal will be delivered through a prioritized sequence:

1.  **Operator Logic**: Implement the core translation and deployment logic for the three template types (Helm, Compose, Zero-Config).
2.  **Local Validation (Extended Test)**: Developers validate all three use cases in a local K3s cluster.
    -   **Note**: Builds are specifically deferred for now. The primary focus is getting the Next.js configuration running in a preview environment using a boilerplate Next.js app.
    -   **Requirement**: Use a boilerplate Next.js application with a readiness check that verifies it can reach a LibSQL database.
    -   A `make validate` script will be created to automate these checks.
3.  **UI Validation**: Manual verification that the Web UI reflects the state and allows configuration of these environments.
4.  **CI Integration (Lightweight)**: Automated regression testing for the most common use case (Next.js/Zero-Config) in Kind to manage resource constraints.

## Environment Templates Standardization (Amendment 2026-01-09)

**Goal**: Standardize how environments are defined and deployed to support the North Star use cases.

**Completed**:
- **Standardized Keys**: Mandated `development` and `deployment` as the standard template keys in `Project` CRD.
- **Reference Examples**: Created standardized example pairs in `operator/examples/` (`catalyst.*`, `compose.*`, `prebuilt.*`, `custom-helm.*`) as the source of truth.
- **Spec Updates**: Updated `spec.md` to document standard templates and managed services.

**Upcoming Work**:
1. **Docker Compose Support (FR-ENV-012)**: Allow `type: docker-compose` in templates.
2. **Prebuilt Image Overrides (FR-ENV-013)**: Allow templates to define a base image with tag/SHA provided by the Environment CR.
3. **User-Managed Helm (FR-ENV-014)**: Support "passthrough" mode for custom Helm charts.
4. **Nix Flake Support (FR-ENV-015)**: Support Nix devShells and builds.

---

## Current Status

### Implemented (Client & UI)
- **@catalyst/kubernetes-client package**: Complete with CRUD, Watch, Pod Ops, and Exec/Shell support.
- **Terminal UI component**: xterm.js integration via server actions.
- **Exec server action**: Command execution in pod containers.

### Remaining Integration Work
1. **Package Dependency**: Add client package to web app.
2. **Real Data Integration**: Use client package for real Pod/Container status in UI.
3. **Legacy Cleanup**: Remove old `lib/k8s-*` files.

### Operator Implementation Roadmap
1. **Build Controller**: Kaniko-based builds for Docker/Auto-detect.
2. **Generic Deployment**: Standard K8s resources (Deployment/Service/Ingress).
3. **Helm Deployment**: Helm SDK integration for template-driven deployments.
4. **Registry Support**: Secret management for private image pulling/pushing.
5. **CI/Job Orchestration**: Future support for lifecycle hooks.

See `tasks.md` for the detailed execution list.
