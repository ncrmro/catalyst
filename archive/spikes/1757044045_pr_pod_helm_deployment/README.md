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
6. **Namespace Isolation**: Deploy to dedicated namespace `catalyst-web-pr-000` for resource isolation
7. **Development Images**: Build both production and development images for helm tests

## Implementation

**Note**: The `charts/singleton/` contains infrastructure components (cert-manager, GitHub Actions Runner Controller), so this spike creates a simple web app chart instead.

### Components Created

1. **Pre-built PR Job Pod Image**: Docker image with pre-installed tools (kubectl, helm, git, docker)
2. **GitHub Action**: Automatically builds and pushes the PR job pod image to GHCR
3. **Enhanced PR Pod**: Builds, pushes to GHCR, and deploys with Helm
4. **GHCR Authentication**: Uses GitHub PAT for docker login
5. **NextJS Helm Chart**: Uses existing charts/nextjs with PostgreSQL subchart
6. **Deployment Script**: Orchestrates the entire workflow with reset flags
7. **RBAC Configuration**: ServiceAccount with comprehensive permissions for PR operations
8. **PVC Caching**: Git and Helm cache persistent volumes for efficiency

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

# Run with builds disabled (default)
./deploy-pr-with-registry.sh

# Run with builds enabled
# Edit pr-pod-with-registry.yaml line 46: value: "true"
./deploy-pr-with-registry.sh

# Reset helm release (regenerates secrets)
./deploy-pr-with-registry.sh --helm-reset

# Full reset (removes buildx driver and all resources)
./deploy-pr-with-registry.sh --reset
```

## What the Enhanced Pod Does

1. **Verify Tools**: Checks pre-installed tools (helm, kubectl, git, docker) from the custom image
2. **Clone**: Pulls repository using GitHub PAT (cached in PVC)
3. **Authenticate**: Logs into GHCR using GitHub PAT
4. **Setup Builder**: Creates or reuses buildx Kubernetes builder
5. **Build & Push** (when NEEDS_BUILD=true): 
   - Pulls cache layers from GHCR
   - Builds both production and development images with buildx bake
   - Pushes both cache and PR tags to GHCR
6. **Deploy**: Uses Helm to deploy the NextJS chart with PostgreSQL subchart
7. **Environment Variables**: Provides stubbed GITHUB_APP_ID, GITHUB_PRIVATE_KEY, TOKEN_ENCRYPTION_KEY
8. **Run Tests**: Executes helm tests using development image
9. **Verify**: Shows deployment status and scales replicas

## GHCR Integration

- **Registry URL**: `ghcr.io/{github-username}/catalyst`
- **Image Tags**: 
  - Production: `pr-{number}` (e.g., `pr-000`, `pr-123`)
  - Development: `pr-{number}-dev` (e.g., `pr-000-dev`)
  - Cache tags: `pr-{number}-cache` and `pr-{number}-cache-dev`
- **Authentication**: Uses GitHub classic PAT for docker login to GHCR
  - **⚠️ Important**: Requires a **classic Personal Access Token** with `write:packages` scope
  - Fine-grained tokens don't support GHCR push/pull operations
- **Cache Strategy**: Cross-target cache reuse between production and development builds
- **Namespace**: All resources deployed to `catalyst-web-pr-000` for isolation

## Files Created

### Core Infrastructure
- `../../dockerfiles/pr-job-pod.Dockerfile` - Pre-built image with kubectl, helm, git, docker
- `../../.github/workflows/dockerfiles.release.yaml` - GitHub Action to build and maintain the PR job pod image

### Spike Components
- `deploy-pr-with-registry.sh` - Main orchestration script with `--reset` and `--helm-reset` flags
- `pr-pod-with-registry.yaml` - Enhanced PR pod with NEEDS_BUILD environment variable
- `rbac.yaml` - ServiceAccount and RBAC permissions for PR operations
- `git-cache-pvc.yaml` - 1Gi PVC for caching git repository
- `helm-cache-pvc.yaml` - 500Mi PVC for caching helm data
- `build-pr-job-image.sh` - Local script to build the PR job pod image
- `dockerfiles/pr-job-pod.Dockerfile` - Original Dockerfile (kept for reference)
- `registry.yaml` - Docker registry manifest (no longer used, kept for reference)

### Image Automation
The PR job pod image (`ghcr.io/ncrmro/catalyst/pr-job-pod:latest`) is automatically:
- **Built on push** when the Dockerfile changes
- **Built weekly** on Sundays for security updates
- **Cached per branch** for efficient builds
- **Attested** with build provenance for supply chain security

## Expected Outcome

- PR pod successfully authenticates with GHCR
- Docker buildx bake builds both production and development images
- Images are pushed to GHCR with proper PR tags
- NextJS application deployed via Helm with PostgreSQL database
- Helm tests pass using the development image
- All resources isolated in `catalyst-web-pr-000` namespace
- Full CI/CD pipeline demonstrated locally
- Foundation established for production PR workflows

## Build Control

The `NEEDS_BUILD` environment variable in `pr-pod-with-registry.yaml` controls whether images are built:
- `"true"`: Builds and pushes both production and development images
- `"false"`: Skips build, assumes images already exist in GHCR

This allows for faster testing when iterating on deployment logic without rebuilding images.