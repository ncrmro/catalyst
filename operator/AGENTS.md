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
