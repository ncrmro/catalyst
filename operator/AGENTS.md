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

Instead, the web app acts as a simple control plane that defines *what* should exist (e.g., "I want a preview environment for PR #123"), and the operator ensures it happens.

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
- **Spec-Driven**: Include relevant sections of the specification (`spec.md`) as comments in the code files. This ensures the code documents *why* it exists and *what* it is fulfilling.
- **Testing**:
  - Unit tests: Focus on logic packages (>80% coverage).
  - Avoid testing generated code or standard library behavior.
  - Integration tests: Use `envtest` for controller logic.