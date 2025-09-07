# Spike: PR Pod Helm Deployment with GitHub Container Registry (GHCR)

This spike demonstrates how PR pods can build images, push to GitHub Container Registry (GHCR), and deploy Helm charts using those images - simulating a real pull request workflow.

## Goal

Prove that PR pods can:
1. Build Docker images with buildx
2. Push images to GHCR with PR-specific tags
3. Use cache tags for efficient builds (push and pull)
4. Deploy Helm charts using the pushed images
5. Complete the full CI/CD workflow as it would work in production

## Problem

The [previous spike](../1756920599_local_pr_pod_testing/) proved PR pods can clone repos and build images, but didn't demonstrate the full deployment workflow with a real registry and proper tagging strategy.

## Solution Approach

1. **GitHub Container Registry**: Use GHCR as the image registry (production-like setup)
2. **PAT Authentication**: Login to GHCR using GitHub PAT for push access
3. **PR Tagging Strategy**: Tag images with PR-specific tags (e.g., `pr-123`, `pr-main`)
4. **Build Cache**: Push/pull cache tags for efficient incremental builds
5. **Helm Deployment**: Deploy using images from GHCR

## Implementation

**Note**: The `charts/singleton/` contains infrastructure components (cert-manager, GitHub Actions Runner Controller), so this spike creates a simple web app chart instead.

### Components Created

1. **Pre-built PR Job Pod Image**: Docker image with pre-installed tools (kubectl, helm, git, docker)
2. **GitHub Action**: Automatically builds and pushes the PR job pod image to GHCR
3. **Enhanced PR Pod**: Builds, pushes to GHCR, and deploys with Helm
4. **GHCR Authentication**: Uses GitHub PAT for docker login
5. **Simple Web App Chart**: Dynamically generated Helm chart for the web application
6. **Deployment Script**: Orchestrates the entire workflow

### Local Registry Investigation

This spike initially attempted to use a local in-cluster registry (`registry.registry.svc.cluster.local:5000`) for image storage. However, we discovered that making Kubernetes nodes pull from an internal registry requires configuring each node's container runtime to:
1. Trust the insecure registry
2. Resolve the registry's cluster DNS name
3. Access the registry network

This node-level configuration is outside the scope of this spike and varies by cluster setup (K3s, kind, EKS, etc.). For K3s clusters specifically, see the [K3s registry mirror documentation](https://docs.k3s.io/installation/registry-mirror) for future investigation.

Therefore, this spike pivoted to using GitHub Container Registry (GHCR) which:
- Works without node configuration
- Simulates the real PR workflow
- Provides a production-like testing environment

## Quick Start

```bash
cd spikes/1757044045_pr_pod_helm_deployment/
./deploy-pr-with-registry.sh
```

## What the Enhanced Pod Does

1. **Verify Tools**: Checks pre-installed tools (helm, kubectl, git, docker) from the custom image
2. **Clone**: Pulls repository using GitHub PAT (cached)
3. **Authenticate**: Logs into GHCR using GitHub PAT
4. **Setup Builder**: Creates or reuses buildx Kubernetes builder
5. **Build & Push**: 
   - Pulls cache layers from GHCR
   - Builds images with buildx
   - Pushes both cache and PR tags to GHCR
6. **Generate Chart**: Creates a simple Helm chart for the web app
7. **Deploy**: Uses Helm to deploy the application with GHCR images
8. **Verify**: Shows deployment status and scales replicas

## GHCR Integration

- **Registry URL**: `ghcr.io/{github-username}/catalyst`
- **Image Tags**: 
  - PR tags: `pr-{branch}` (e.g., `pr-main`, `pr-feature-123`)
  - Cache tags: `cache-{branch}` for build layer caching
- **Authentication**: Uses GitHub classic PAT for docker login to GHCR
  - **⚠️ Important**: Requires a **classic Personal Access Token** with `write:packages` scope
  - Fine-grained tokens don't support GHCR push/pull operations
- **Cache Strategy**: Pulls from cache tag, builds, then pushes both updated cache and PR tags

## Files Created

### Core Infrastructure
- `../../dockerfiles/pr-job-pod.Dockerfile` - Pre-built image with kubectl, helm, git, docker
- `../../.github/workflows/dockerfiles.release.yaml` - GitHub Action to build and maintain the PR job pod image

### Spike Components
- `deploy-pr-with-registry.sh` - Main orchestration script with `--reset` flag support
- `pr-pod-with-registry.yaml` - Enhanced PR pod using the pre-built image
- `build-pr-job-image.sh` - Local script to build the PR job pod image
- `dockerfiles/pr-job-pod.Dockerfile` - Original Dockerfile (kept for reference)
- `registry.yaml` - Docker registry manifest (no longer used, kept for reference)
- Generated Helm chart in `/tmp/web-app-chart/` (runtime)

### Image Automation
The PR job pod image (`ghcr.io/ncrmro/catalyst/pr-job-pod:latest`) is automatically:
- **Built on push** when the Dockerfile changes
- **Built weekly** on Sundays for security updates
- **Cached per branch** for efficient builds
- **Attested** with build provenance for supply chain security

## Expected Outcome

- In-cluster Docker registry is deployed and running
- PR pod builds web app image and pushes to registry
- Web application is deployed via Helm using the built image
- Full CI/CD pipeline demonstrated locally
- Foundation established for production PR workflows