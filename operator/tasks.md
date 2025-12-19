# Operator Tasks

## Phase 1: Scaffolding & API Definition
- [x] **T001**: Initialize Kubebuilder project.
  - Run `kubebuilder init --domain catalyst.dev --repo github.com/ncrmro/catalyst/operator`.
- [x] **T002**: Create `Project` API.
  - Run `kubebuilder create api --group catalyst --version v1alpha1 --kind Project`.
  - Define `ProjectSpec` struct in `api/v1alpha1/project_types.go`.
  - **Test**: Verify CRD generation.
- [x] **T003**: Create `Environment` API.
  - Run `kubebuilder create api --group catalyst --version v1alpha1 --kind Environment`.
  - Define `EnvironmentSpec` struct.
  - Define `EnvironmentStatus` struct.
  - **Test**: Verify CRD generation.
- [x] **T004**: Generate manifests.
  - Run `make manifests`.

## Phase 2: Environment Controller - Foundation
- [x] **T005**: Implement `Reconcile` loop skeleton in `internal/controller/environment_controller.go`.
- [x] **T006**: Implement Namespace management.
  - Check/Create namespace `env-<project>-<id>`.
  - Add OwnerReference.
- [x] **T007**: Implement Status updates.
  - Update `Status.Phase` to "Initializing".
  - Update `Status.Conditions`.
- [x] **T008**: **Test Controller Logic**.
  - Write `envtest` suite to verify Namespace creation and Status updates.

## Phase 3: Infrastructure Policies
- [x] **T009**: Implement ResourceQuota creation.
  - Apply default quotas.
- [x] **T010**: Implement NetworkPolicy creation.
  - Default Deny All + Ingress/Egress rules.
- [x] **T011**: **Test Policy Generation**.
  - Unit test helper functions.
  - Integration test for resource creation.

## Phase 4: Build Orchestration
- [x] **T012**: Implement Image Existence Check.
- [x] **T013**: Implement Build Job creation.
  - Kaniko Job with Secrets.
- [x] **T014**: Implement Job Watcher.
  - Update status to "Building".
- [x] **T015**: **Test Build Logic**.
  - Unit test Job spec.
  - Integration test Job completion handling.

## Phase 5: Deployment & Ingress
- [x] **T016**: Implement Helm/Manifest deployment.
- [x] **T017**: Implement Ingress creation.
  - TLS annotations.
- [x] **T018**: Update Final Status.
  - Phase "Ready", populate URL.
- [x] **T019**: **Test Deployment Logic**.
  - Unit test manifest rendering.
  - Integration test Service/Ingress creation.

## Phase 6: Web App Integration
- [x] **T020**: Update Web App to create `Environment` CRs.
- [x] **T021**: Update Web App to poll `Environment` CR status.
