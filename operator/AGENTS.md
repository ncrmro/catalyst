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
