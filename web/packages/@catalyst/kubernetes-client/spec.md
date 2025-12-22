# Catalyst Kubernetes Client Specification

## Overview
The `@catalyst/kubernetes-client` is a specialized TypeScript client designed for interacting with Catalyst Kubernetes Custom Resource Definitions (CRDs) like `Environment` and `Project`. It abstracts the complexity of the official Kubernetes client, provides robust configuration management for multi-cluster environments, and handles specific operational requirements like executing commands in pods and watching resources.

## Functional Requirements

### 1. Configuration Management & Registry
The client must provide a unified way to manage connections to multiple Kubernetes clusters, supporting both local development and production environments.

*   **Dynamic Module Loading**: 
    *   Must dynamically import `@kubernetes/client-node` to ensure compatibility with both ESM (Next.js) and CommonJS (Jest) environments.
*   **Multi-Cluster Registry**: 
    *   Maintain a global registry of configured clusters.
    *   Load configurations from environment variables matching `KUBECONFIG_*` (value must be base64-encoded KubeConfig JSON).
    *   Support loading from the default filesystem location (`~/.kube/config`) as a fallback or explicit entry.
    *   Allow retrieval of specific cluster configurations by name (e.g., the suffix `PRIMARY` from `KUBECONFIG_PRIMARY`).
*   **Default Cluster Resolution**:
    *   Implement a priority strategy for determining the "default" cluster when none is specified.
    *   Priority: `PRODUCTION`, `PROD`, `PRIMARY`, `MAIN`.
    *   Fallback: First available configured cluster.
    *   Error Handling: Throw a descriptive `ConnectionError` if no clusters are configured.
*   **Environment-Aware Normalization**:
    *   **API Server Override**: If `KUBERNETES_API_SERVER_HOST` is present, override the cluster endpoint (forcing `https` and port `6443`).
    *   **Docker Connectivity**: In `NODE_ENV=development`, automatically rewrite `localhost` or `127.0.0.1` endpoints to `host.docker.internal` to allow connectivity from within Docker containers.
    *   **TLS Verification**:
        *   Automatically disable TLS verification (`skipTLSVerify: true`) for detected local clusters (`localhost`, `kind-`, `host.docker.internal`).
        *   Respect `KUBE_SKIP_TLS_VERIFY` environment variable to explicitly enable/disable verification.

### 2. Core Kubernetes API Access
Provide simplified access to standard Kubernetes APIs.

*   **Helper Functions**:
    *   `getAppsV1Api()`: Return the `AppsV1Api` constructor.
    *   `getCoreV1Api()`: Return the `CoreV1Api` constructor.
    *   `getCustomObjectsApi()`: Return the `CustomObjectsApi` constructor.
*   **Client Factory**:
    *   `KubeConfig.makeApiClient(ApiClass)`: Create an authenticated instance of a Kubernetes API class using the configured context.

### 3. CRD Operations
Provide typed, higher-level clients for Catalyst CRDs.

*   **Environment Client**:
    *   Supports CRUD operations: `create`, `get`, `list`, `update`, `patch`, `delete`.
    *   `apply` method for idempotent create-or-update.
    *   Type-safe interfaces mirroring the Go definitions (`Environment`, `EnvironmentSpec`, `EnvironmentStatus`).
*   **Project Client** (Planned):
    *   Similar CRUD capabilities for `Project` resources.

### 4. Watch Mechanism
Robust resource watching with automatic recovery.

*   **Reliability**:
    *   Automatic reconnection with exponential backoff on connection loss or errors.
    *   Handle `resourceVersion` to resume watching from the last known state.
*   **Cluster-wide & Namespaced**:
    *   Support watching resources in a specific namespace or across the entire cluster.

### 5. Pod Operations & Execution
Utilities for interacting with running pods.

*   **Exec**:
    *   Execute one-off commands in containers (`exec`).
    *   Support capturing `stdout`, `stderr`, and exit codes.
*   **Interactive Shell**:
    *   `createShellSession`: Establish a WebSocket-based interactive terminal session.
    *   Handle window resizing (TTY dimensions).
    *   Bi-directional streaming of data.
*   **Logs**:
    *   Fetch logs (`getPodLogs`) or stream them (`streamPodLogs`).
    *   Support tailing, timestamps, and previous container logs.
*   **Metrics**:
    *   Retrieve CPU and Memory usage for pods and containers (`getPodMetrics`).

## Migration & Compatibility
This package consolidates logic previously found in `web/src/lib/k8s-client.ts`.

*   **Legacy Adapter**: The `web/src/lib/k8s-client.ts` file should be refactored to re-export functionality from this package, ensuring backward compatibility for the web application while centralizing the logic here.
