# Research: Docker Compose to Kubernetes Translation

**Date**: 2026-01-10
**Related**: FR-ENV-012, T149

## Summary

To support "Zero-Config" deployments for projects defined by `docker-compose.yml`, the Operator must be able to parse these files and translate them into equivalent Kubernetes resources (Deployments, Services, ConfigMaps).

## Options Analysis

### 1. Kompose (Kubernetes Official Tool)
[Kompose](https://kubernetes.io/docs/tasks/configure-pod-container/translate-compose-kubernetes/) is the standard tool for this.
*   **Workflow**: `kompose convert -f docker-compose.yml` -> Generates YAML files.
*   **Pros**: Robust, handles many edge cases, widely used.
*   **Cons**: It's a CLI tool. Using it inside the Operator (Go) requires shelling out or importing its internal packages (which might be heavy or not designed as a library).

### 2. Podman (`podman kube generate`)
Podman can generate K8s YAML from running containers.
*   **Pros**: Good for "exporting" a running state.
*   **Cons**: Requires running containers first, which we don't have in the Operator. Less suitable for static analysis of `docker-compose.yml`.

### 3. Native Go Implementation (Chosen Approach)
Since we need tight integration with our `Environment` CRD (injecting specific labels, env vars, owner references), implementing a lightweight parser using `gopkg.in/yaml.v3` is preferred over wrapping a heavy CLI tool.

## Translation Logic (MVP)

The Operator will parse `docker-compose.yml` and map concepts as follows:

| Docker Compose | Kubernetes Equivalent | Notes |
| :--- | :--- | :--- |
| **Service** (`services.web`) | **Deployment** | One Deployment per service. Name: `<env>-<service>`. |
| **Image** (`image: nginx`) | `spec.template.spec.containers[0].image` | Direct mapping. |
| **Build** (`build: .`) | **BuildSpec** (Kaniko) | Triggers the Zero-Config build logic. Resulting image injected. |
| **Ports** (`ports: ["80:80"]`) | **Service** (ClusterIP) | Creates a Service exposing the container port. |
| **Environment** | `spec.template.spec.containers[0].env` | Direct mapping. |
| **Command** | `command` / `args` | Mapped to container command. |
| **Volumes** | `emptyDir` or `PVC` | Simple mounts mapped to EmptyDir for MVP. |

## Implementation Plan

1.  **Parse**: Use `gopkg.in/yaml.v3` to unmarshal `docker-compose.yml` into a struct.
2.  **Extract Builds**: Identify services with `build` directives. Create dynamic `BuildSpec` entries for the Controller to execute.
3.  **Generate Resources**:
    *   Iterate services.
    *   Generate `appsv1.Deployment`.
    *   If ports defined, generate `corev1.Service`.
4.  **Apply**: Use Server-Side Apply to create these resources in the target namespace.

## Libraries
*   `gopkg.in/yaml.v3`: For parsing generic YAML.
*   `k8s.io/api/...`: For constructing K8s objects.

## Handling "Build" Directive
When `build: .` is present:
1.  Operator creates a `BuildSpec` for this service.
2.  Triggers Kaniko Build (T148).
3.  Upon completion, replaces `image` in the generated Deployment with the internal registry URL of the built image.
