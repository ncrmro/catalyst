# Operator Implementation Plan

This plan details the steps to build the `kube-operator` using Go and the Kubernetes Operator SDK/Kubebuilder pattern.

## Prerequisites
- [x] Development environment initialized (Go, Flake).
- [ ] `kubebuilder` installed (via Flake or manual download if not in nixpkgs).

## Testing Strategy
To ensure reliability and maintainability, the operator will be tested at three levels. All logic must be covered by tests before moving to the next phase.

-   **Unit Tests (`go test`)**:
    -   Focus on pure functions, helper logic, and internal methods.
    -   Mock Kubernetes clients/interfaces where appropriate to test error handling and edge cases without a cluster.
    -   Target: >80% code coverage for internal logic packages.

-   **Integration Tests (`envtest`)**:
    -   Use `controller-runtime/pkg/envtest` (provided by Kubebuilder) to spin up a local K8s control plane (etcd + apiserver).
    -   Verify that the Controller correctly interacts with the API server (creating Namespaces, updating Status).
    -   These run fast and don't require a full cluster (Docker/Kind).

-   **End-to-End Tests (Kind)**:
    -   Run against the local `bin/k3s-vm` or Kind cluster.
    -   Verify the full lifecycle: CR creation -> Pods running -> Ingress working.

## Phase 1: Scaffolding & API Definition
**Goal**: Initialize the project structure and define the Custom Resource Definitions (CRDs).

- [ ] **T001**: Initialize Kubebuilder project.
  - Run `kubebuilder init --domain catalyst.dev --repo github.com/ncrmro/catalyst/operator`.
  - This effectively replaces the current `main.go`.
- [ ] **T002**: Create `Project` API.
  - Run `kubebuilder create api --group catalyst --version v1alpha1 --kind Project`.
  - Define `ProjectSpec` struct in `api/v1alpha1/project_types.go` (repo URL, build config, resource quotas).
  - **Test**: Verify CRD generation and basic struct validation (e.g., required fields).
- [ ] **T003**: Create `Environment` API.
  - Run `kubebuilder create api --group catalyst --version v1alpha1 --kind Environment`.
  - Define `EnvironmentSpec` struct (project ref, commit SHA, type, config).
  - Define `EnvironmentStatus` struct (phase, URL, conditions).
  - **Test**: Verify CRD generation and status subresource behavior.
- [ ] **T004**: Generate manifests.
  - Run `make manifests` to generate CRD YAMLs.

## Phase 2: Environment Controller - Foundation
**Goal**: A basic controller that creates a namespace for an Environment CR.

- [ ] **T005**: Implement `Reconcile` loop skeleton in `internal/controller/environment_controller.go`.
- [ ] **T006**: Implement Namespace management.
  - Check if namespace exists.
  - Create namespace if missing (name format: `env-<project>-<id>`).
  - Add OwnerReference to the Namespace (pointing to Environment CR) for automatic garbage collection.
- [ ] **T007**: Implement Status updates.
  - Update `Environment.Status.Phase` to "Initializing".
  - Update `Environment.Status.Conditions`.
- [ ] **T008**: **Test Controller Logic**.
  - Write `envtest` suite to verify:
    1. Creating an `Environment` CR triggers Namespace creation.
    2. Deleting `Environment` CR triggers Namespace deletion (via OwnerRef).
    3. Status is correctly updated to "Initializing".

## Phase 3: Infrastructure Policies
**Goal**: Apply security and resource constraints to the created namespace.

- [ ] **T009**: Implement ResourceQuota creation.
  - Apply default quotas (CPU, Memory, Storage) to the namespace.
- [ ] **T010**: Implement NetworkPolicy creation.
  - Default Deny All.
  - Allow Ingress from Ingress Controller.
  - Allow Egress to DNS and Registry.
- [ ] **T011**: **Test Policy Generation**.
  - Unit test the helper functions that generate `ResourceQuota` and `NetworkPolicy` structs to ensure correct values/selectors.
  - Integration test to verify these resources are actually created in the cluster when the Environment is reconciled.

## Phase 4: Build Orchestration (The "CI" Part)
**Goal**: Build a container image from the source code if it doesn't exist.

- [ ] **T012**: Implement Image Existence Check.
  - Check internal registry for `image:tag`.
  - **Test**: Mock the registry client to verify "exists" vs "missing" logic.
- [ ] **T013**: Implement Build Job creation.
  - If image missing, create a Kubernetes Job (using Kaniko or similar).
  - Mount Secrets for Git cloning and Registry pushing.
- [ ] **T014**: Implement Job Watcher.
  - Watch owned Jobs in `EnvironmentController`.
  - Update Environment status to "Building".
  - Handle Job success/failure.
- [ ] **T015**: **Test Build Logic**.
  - Unit test the Job spec generation (ensure correct image, command, volumes).
  - Integration test: Simulate a Job completing and verify the Controller detects the change and updates the Environment status.

## Phase 5: Deployment & Ingress (The "CD" Part)
**Goal**: Deploy the application into the namespace.

- [ ] **T016**: Implement Helm/Manifest deployment.
  - For MVP: Support raw manifest application or simple Helm install logic using `helm.go` libraries.
  - Inject environment variables.
- [ ] **T017**: Implement Ingress creation.
  - Create Ingress resource routing to the application Service.
  - Configure TLS annotations.
- [ ] **T018**: Update Final Status.
  - Set Phase to "Ready".
  - Populate `Status.URL`.
- [ ] **T019**: **Test Deployment Logic**.
  - Unit test the manifest rendering logic.
  - Integration test: Verify Service and Ingress are created with correct labels and spec.

## Phase 6: Web App Integration
**Goal**: Connect the frontend to the new operator.

- [ ] **T016**: Update Web App to create `Environment` CRs instead of direct K8s calls.
- [ ] **T017**: Update Web App to poll `Environment` CR status for progress bars/logs.

## Directory Structure (Target)

```
operator/
├── api/
│   └── v1alpha1/
│       ├── project_types.go
│       └── environment_types.go
├── cmd/
│   └── main.go
├── internal/
│   ├── controller/
│   │   ├── project_controller.go
│   │   ├── environment_controller.go
│   │   └── build_job.go
│   └── lib/
│       ├── helm/
│       └── k8s/
├── config/
│   ├── crd/
│   └── rbac/
├── Dockerfile
└── Makefile
```
