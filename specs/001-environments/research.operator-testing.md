# Operator Integration Testing Research

This document outlines the strategy for integration testing the Catalyst Operator independently of the web application. The goal is to verify all reconciliation logic, environment lifecycle management, and advanced features (Nix, Build, Health Checks) against a real Kubernetes cluster (`kind` or `bin/k3s-vm`).

## Objective

To validate that the Operator correctly implements the [Environment Specification](./spec.md) by:
1.  Responding to `Environment` CR changes.
2.  Correctly provisioning Kubernetes resources (Namespaces, Quotas, Policies, Deployments, Services).
3.  Managing advanced development workflows (Nix shells, Devcontainers).
4.  Reporting accurate status updates to the CR status fields.

## Test Infrastructure

### 1. Kind (Kubernetes in Docker)
*   **Use Case**: CI/CD pipelines and isolated local testing.
*   **Mechanism**: The existing `make test-e2e` target uses Kind.
*   **Pros**: Ephemeral, reproducible, standard for Kubebuilder projects.
*   **Cons**: May differ slightly from the production K3s environment (Ingress, storage classes).

### 2. Local K3s VM (`bin/k3s-vm`)
*   **Use Case**: Local development fidelity.
*   **Mechanism**: The project includes a customized K3s VM.
*   **Pros**: Matches production environment (Ingress, CNI, Storage).
*   **Cons**: Stateful, requires manual cleanup or careful namespacing between tests.

## Testing Strategy

We will primarily use the **Go-based E2E framework** (`controller-runtime` + `Ginkgo`/`Gomega`) provided by Kubebuilder, as it allows for complex logic assertion which is required for features like "verify build completed" or "check health probe status".

### Test Suite Structure

The `operator/test/e2e` suite should be expanded to cover the following isolated contexts:

#### A. Environment Lifecycle
1.  **Creation**:
    *   Apply `Environment` CR.
    *   **Assert**: Namespace created.
    *   **Assert**: `ResourceQuota` and `LimitRange` exist in namespace.
    *   **Assert**: `NetworkPolicy` exists (Default Deny + DNS/Registry allow).
2.  **Deletion**:
    *   Delete `Environment` CR.
    *   **Assert**: Namespace stuck in Terminating until Finalizer releases (if applicable).
    *   **Assert**: Namespace eventually removed.

#### B. Development Environments (Advanced)
1.  **Nix Flake Support**:
    *   Create CR with `devContainer.type: nix`.
    *   **Assert**: Pod created with Nix-capable image.
    *   **Assert**: `nix develop` or equivalent command runs successfully (via `kubectl exec`).
2.  **Build Capabilities**:
    *   Create CR with `features.dockerEnabled: true` (or similar).
    *   **Assert**: Pod has access to Docker socket or rootless buildkit.
    *   **Assert**: `docker build` (or `nix build`) succeeds inside the pod.
3.  **Shell Access**:
    *   **Assert**: SSH/Exec port is accessible.

#### C. Deployment Environments
1.  **Branch Tracking**:
    *   Simulate Git repo state (using a mock Git server or local path).
    *   Update CR to track `main`.
    *   **Assert**: Operator pulls latest commit.
    *   **Assert**: Deployment image tag matches commit SHA.
2.  **Managed Services**:
    *   Create CR asking for `services: [postgres, redis]`.
    *   **Assert**: StatefulSets/Deployments for Postgres/Redis created.
    *   **Assert**: Secrets created with connection strings.
    *   **Assert**: Main application has env vars injected.

#### D. Health & Liveness
1.  **Probes**:
    *   Deploy app that fails `/healthz`.
    *   **Assert**: CR status reports `Healthy: False`.
    *   Update app to pass `/healthz`.
    *   **Assert**: CR status updates to `Healthy: True`.
2.  **Service Connectivity**:
    *   **Assert**: App container can reach Postgres service (via NetworkPolicy check or actual connection).

## Implementation Plan

### 1. Test Harness Extensions
Extend the existing `e2e_test.go` to support:
*   **Kubectl Helper**: A wrapper to execute `kubectl` commands for assertions that are hard to do via client-go (e.g., `kubectl exec`).
*   **Mock Git Server**: A simple in-cluster HTTP git server to test cloning and branch tracking without external dependencies.
*   **Fixture Generator**: Helper functions to generate `Environment` CRs with various permutations.

### 2. Execution against `bin/k3s-vm`
To run against the local VM instead of Kind:
1.  Ensure `~/.kube/config` points to the K3s VM.
2.  Run `make install` to update CRDs.
3.  Run `make deploy IMG=controller:local` (assuming local registry) OR run the operator locally via `make run`.
    *   *Recommendation*: `make run` is faster for the edit-test loop as it connects to the K3s VM from the host process.

### 3. Scenario Matrix

| Scenario ID | Description | Target Component | assertion |
|-------------|-------------|------------------|-----------|
| **SCN-01** | Basic Dev Env Creation | Reconciler | Namespace, Quota, NetPol exist |
| **SCN-02** | Nix Shell Startup | Pod Spec | `nix --version` returns 0 |
| **SCN-03** | Build-in-Build | Pod Security | `docker info` or `nix build` works |
| **SCN-04** | Postgres Provisioning | Service Manager | Postgres StatefulSet Ready |
| **SCN-05** | Health Check Failure | Status Updater | CR Status.Conditions["Ready"] == False |
| **SCN-06** | Cleanup | Finalizer | Namespace deleted |

## Recommendations

1.  **Prioritize `make run` integration**: Running tests against `bin/k3s-vm` while the operator runs locally (via `make run`) offers the fastest feedback loop.
2.  **Use `ginkgo` labels**: Tag tests as `[slow]`, `[network]`, `[build]` to allow filtering.
3.  **Mock Heavy Dependencies**: Don't build real large images during tests. Use lightweight busybox/alpine images that mock the behavior (e.g., a script that pretends to be a build).
