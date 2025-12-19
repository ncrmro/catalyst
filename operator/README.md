# Catalyst Kubernetes Operator

The `kube-operator` is the core infrastructure controller for the Catalyst platform. It manages the lifecycle of projects and environments within the Kubernetes cluster.

## Why this exists

By introducing this operator, we shift from an imperative model (Web App running kubectl commands) to a declarative model (Web App creating Custom Resources). 

**This transition greatly simplifies the web application logic.**

- **Before**: Web app handled retries, race conditions, build timeouts, and complex K8s sequencing.
- **After**: Web app simply creates an `Environment` object. The operator handles the heavy lifting of reconciliation, ensuring the cluster state matches the user's intent.

## Core Resources

- **Project**: Defines a deployable application.
- **Environment**: Defines a specific instance (Preview, Staging, Production).

See [spec.md](./spec.md) for detailed architecture and design.
