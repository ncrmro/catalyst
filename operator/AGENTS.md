# Operator Agents Context

## Purpose

This directory contains the `kube-operator`, the centralized orchestration engine for the Catalyst platform.

## Key Architectural Concept

The operator implements a **declarative infrastructure pattern**. Instead of the web application imperatively managing Kubernetes resources (creating namespaces, running Helm commands, monitoring jobs), it simply creates `Environment` Custom Resources (CRs).

### Impact on Web App

This architecture **greatly simplifies the web application logic**. The web app no longer needs to:

- Manage complex retry loops for Kubernetes operations.
- Direct build jobs or Helm deployments.
- Maintain persistent connections for long-running operations.

Instead, the web app acts as a simple control plane that defines _what_ should exist (e.g., "I want a preview environment for PR #123"), and the operator ensures it happens.

## Working in this Directory

When implementing features in the operator:

1.  **Think Declaratively**: Logic should always drive the current state towards the desired state defined in the CR.
2.  **CRD First**: Changes to functionality often start with defining the schema in `api/v1alpha1/`.
3.  **Reconciliation**: Ensure controllers are idempotent and can recover from partial failures.

## Development Environment

This project uses **Nix** to manage the development environment dependencies (Go, Kubectl, Kustomize, etc.).

### Setting up

1.  Ensure you have Nix installed with flakes enabled.
2.  Enter the development shell:
    ```bash
    nix develop
    ```
    Or if using `direnv`:
    ```bash
    direnv allow
    ```

### Tools Included

- **Go**: Language runtime and compiler.
- **gopls**: Go language server for IDE support.
- **kubectl**: Kubernetes command-line tool.
- **kustomize**: Configuration management.
- **helm**: Package manager for Kubernetes.
- **kind**: Local Kubernetes cluster manager.

## Code Style & Conventions

- **Terse & Clean**: Avoid superfluous boilerplate. Code should be focused and minimal.
- **Spec-Driven**: Include relevant sections of the specification (`spec.md`) as comments in the code files. This ensures the code documents _why_ it exists and _what_ it is fulfilling.
- **Testing**: See TDD section below.

## K8s-Native Types Paradigm (FR-ENV-026)

**Core Design Principle**: CRD configuration fields MUST use **curated subsets of Kubernetes-native types** rather than custom abstractions.

### Why Kubernetes-Native Types?

Anyone who knows how to write a `Deployment`, `StatefulSet`, or `PersistentVolumeClaim` manifest already knows how to configure a Catalyst environment. By reusing native K8s types, we get:

- **User Familiarity**: No new schema to learn
- **Schema Validation**: Free validation from existing K8s types
- **Documentation**: Official K8s docs apply
- **IDE Support**: Existing tooling understands the types

### What is a "Curated Subset"?

We don't embed the full `corev1.Container` type (which has 30+ fields including `stdin`, `tty`, `lifecycle` that aren't relevant for environment configuration). Instead, we pick the ~10 fields people actually use:

| CRD Field        | K8s Type                      | From                              |
| ---------------- | ----------------------------- | --------------------------------- |
| `image`          | `string`                      | `corev1.Container.Image`          |
| `command`        | `[]string`                    | `corev1.Container.Command`        |
| `args`           | `[]string`                    | `corev1.Container.Args`           |
| `workingDir`     | `string`                      | `corev1.Container.WorkingDir`     |
| `ports`          | `[]corev1.ContainerPort`      | `corev1.Container.Ports`          |
| `env`            | `[]corev1.EnvVar`             | `corev1.Container.Env`            |
| `resources`      | `corev1.ResourceRequirements` | `corev1.Container.Resources`      |
| `livenessProbe`  | `*corev1.Probe`               | `corev1.Container.LivenessProbe`  |
| `readinessProbe` | `*corev1.Probe`               | `corev1.Container.ReadinessProbe` |
| `startupProbe`   | `*corev1.Probe`               | `corev1.Container.StartupProbe`   |
| `volumeMounts`   | `[]corev1.VolumeMount`        | `corev1.Container.VolumeMounts`   |

### Example: What NOT to Do

❌ **Custom abstraction** (requires learning a new schema):
```go
type ProbeConfig struct {
    Path          string `json:"path"`
    Port          int    `json:"port"`
    PeriodSeconds int    `json:"periodSeconds"`
}
```

✅ **K8s-native type** (users already know this):
```go
type EnvironmentConfig struct {
    LivenessProbe *corev1.Probe `json:"livenessProbe,omitempty"`
}
```

### When Adding New Config Fields

1. **Always check if a K8s type exists first**
2. **Use the native type if it exists**
3. **Only create custom types when absolutely necessary**
4. **Document why the custom type is needed**

### References

- **Spec**: `specs/001-environments/spec.md` (FR-ENV-026 through FR-ENV-032)
- **Plan**: `specs/001-environments/plan.full-config.md`

## Test-Driven Development (TDD) - REQUIRED

**CRITICAL: All code changes MUST follow TDD and pass CI before pushing.**

### Mandatory Workflow

1. **Write failing test FIRST** (Red)
   - Before writing any implementation, create a test that captures the expected behavior
   - Run `go test ./...` - test should FAIL

2. **Implement minimum code** (Green)
   - Write just enough code to make the test pass
   - No extra features, no premature abstractions

3. **Refactor** (if needed)
   - Clean up while keeping tests green

4. **Run full CI locally BEFORE pushing**

   ```bash
   make test   # Runs all Go tests
   make lint   # Runs linter
   ```

   **NEVER push code without tests passing locally.**

### Test Hierarchy (Prefer in Order)

1. **Unit tests** (PREFERRED) - Fast, isolated, test single functions
2. **Integration tests** - Only for controller reconciliation logic using `envtest`
3. **E2E tests** - Reserved for **happy path workflows only** unless explicitly requested

### What to Test

- **DO test**: Reconciliation logic, helper functions, data transformations
- **DO test**: The primary success path (happy path)
- **DO aim for**: >80% coverage on logic packages
- **DON'T test**: Edge cases or error handling unless explicitly requested
- **DON'T test**: Generated code (kubebuilder scaffolding, deepcopy, etc.)
- **DON'T test**: Standard library behavior or Kubernetes client behavior

### Documenting Potential Tests

Instead of writing exhaustive edge case tests, document them as code comments:

```go
// Potential additional tests:
// - [ ] Handle nil spec gracefully
// - [ ] Test with invalid resource names
// - [ ] Test concurrent reconciliation
```

### Before Creating a PR

- [ ] All new logic has unit tests
- [ ] `make test` passes completely
- [ ] `make lint` passes
- [ ] No `t.Skip()` left in test files

### Anti-Patterns (NEVER DO)

- ❌ Writing implementation without tests first
- ❌ Pushing code without running tests locally
- ❌ Writing edge case tests without explicit request
- ❌ Using integration tests when unit tests suffice
- ❌ Testing generated kubebuilder code
- ❌ Using `t.Skip()` to get CI to pass

## NetworkPolicy Configuration

The operator creates the following NetworkPolicy rules for each environment namespace (see `internal/controller/resources.go`):

1. **Default deny-all**: Isolates all pods in the namespace (both ingress and egress)
2. **Allow ingress from ingress controller**: Permits traffic from the `ingress-nginx` namespace
3. **Allow intra-namespace ingress**: `podSelector: {}` permits pod-to-pod communication within the namespace (required for web init containers to reach postgres)
4. **Allow DNS egress**: Permits UDP/TCP port 53 to `kube-system` for name resolution
5. **Allow registry egress**: Permits HTTPS (port 443) for pulling container images

### Why intra-namespace is required

Development environment pods include init containers (`git-clone`, `npm-install`, `db-migrate`) that run before the main web container. The `db-migrate` init container must connect to the postgres ClusterIP service in the same namespace. Without the intra-namespace ingress rule, the deny-all policy blocks this connection, causing `ETIMEDOUT` failures.

### CNI enforcement caveat

K3s uses Flannel by default, which **does not enforce** NetworkPolicies. Kind (used in CI) uses kindnet, which **does enforce** them. This means NetworkPolicy bugs are invisible during local development but surface in CI. Always verify policy changes pass CI before merging.

## Resource Limits

- `next dev --turbopack` requires **2Gi memory**. At 1Gi, the process is OOMKilled (exit code 137) and the pod enters CrashLoopBackOff. The ingress returns 502/503 while the pod restarts.
- Memory limit is set in `internal/controller/development_deploy.go`.
- PostgreSQL containers use 512Mi memory limit.

## Reconciliation Flow

The operator polls every 5 seconds and reconciles each Environment CR through this sequence:

1. **Create namespace** (if not exists)
2. **ResourceQuota** — applies CPU/memory/storage limits to the namespace
3. **NetworkPolicy** — applies deny-all + allow rules (see above)
4. **Postgres deployment** — creates postgres Deployment + Service
5. **Wait for postgres ready** — polls until postgres pod has `ReadyReplicas > 0`
6. **Web deployment** — creates web Deployment with init containers:
   - `git-clone`: clones the repo branch into the shared PVC
   - `npm-install`: runs `npm ci` in the cloned repo
   - `db-migrate`: runs `npm run db:migrate` (requires postgres to be reachable)
7. **Wait for web ready** — polls until web pod has `ReadyReplicas > 0`
8. **Set phase=Ready** — updates the Environment CR status

Each init container must complete before the next starts. If `db-migrate` cannot reach postgres (e.g., due to a NetworkPolicy misconfiguration), the pod hangs in init and eventually times out.
