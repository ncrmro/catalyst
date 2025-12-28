# Implementation Plan: [FR-ENV-002] Local URL Testing

**Branch**: `001-environments` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-environments/spec.md`

## Summary

Implement local URL testing for development environments using path-based routing (`localhost:8080/namespace/`) alongside the existing Cloudflare proxy integration. This ensures agents and developers can access and test preview environments in offline, rootless local setups without public DNS dependencies.

The Operator must now distinguish between 'managed' deployments (where it creates Deployment/Service) and 'helm' deployments (where it only creates Ingress for routing). This ensures Ingress policies (like local path-based routing) are applied regardless of how the app is deployed.

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

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

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
|-----------|------------|-------------------------------------|
| N/A       |            |                                     |