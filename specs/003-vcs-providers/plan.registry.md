# Implementation Plan: Container Registry Integration

**Spec**: `003-vcs-providers`
**Date**: 2026-01-10

## Summary

Enable the platform to authenticate with private container registries (GHCR, Docker Hub, etc.) to pull base images and push built artifacts.

## Strategy

1.  **Project Secrets**: Store registry credentials as standard Kubernetes Secrets in the project namespace.
    -   Standard Name: `registry-credentials`
    -   Type: `kubernetes.io/dockerconfigjson`
2.  **Operator Propagation**: The Operator copies these secrets to environment namespaces.
3.  **Service Account Patching**: The Operator adds `imagePullSecrets` to the `default` ServiceAccount in environment namespaces.

## Components

### Web App
- UI to input registry credentials (username/token/registry URL).
- Backend logic to create/update `Secret` in Kubernetes.

### VCS Provider (GitHub)
- Automatically create a Secret using the GitHub App Installation Token (if scoped) or prompt user for PAT.

## Future: Catalyst-Managed Registry

To reduce dependency on external providers, Catalyst can optionally provision a self-hosted container registry.

### Strategy
1.  **Cluster-Wide Registry**: A single instance of `distribution/distribution` running in the `catalyst-system` namespace.
    -   Backed by S3 (AWS/MinIO) or PVC.
    -   Exposed via Service (ClusterIP) for internal pushing/pulling.
    -   Auth handled via mTLS or shared secret.
2.  **Project-Specific Registry**: For strict isolation, a lightweight registry instance per project.
3.  **Operator Integration**: The Operator automatically configures environments to push/pull from this internal registry if no external registry is configured.
