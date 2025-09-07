# Spike: PR Pod Helm Deployment with In-Cluster Registry

This spike demonstrates how PR pods can build images, push to an in-cluster registry, and deploy Helm charts using those images.

## Goal

Prove that PR pods can:
1. Build Docker images with buildx
2. Push images to an in-cluster registry
3. Deploy the `charts/singleton/` Helm chart using the built images
4. Complete the full CI/CD workflow locally

## Problem

The [previous spike](../1756920599_local_pr_pod_testing/) proved PR pods can clone repos and build images, but didn't demonstrate the full deployment workflow with an in-cluster registry.

## Solution Approach

1. **In-Cluster Registry**: Set up a local Docker registry in the cluster
2. **Image Push**: Update PR pod to push built images to the registry
3. **Helm Deployment**: Deploy `charts/singleton/` chart with the new image references
4. **Script Integration**: Create a single script that orchestrates the entire workflow

## Implementation

**Note**: The `charts/singleton/` contains infrastructure components (cert-manager, GitHub Actions Runner Controller), so this spike creates a simple web app chart instead.

### Components Created

1. **In-Cluster Registry**: Docker registry deployed in `registry` namespace
2. **Enhanced PR Pod**: Builds, pushes images, and deploys with Helm
3. **Simple Web App Chart**: Dynamically generated Helm chart for the web application
4. **Deployment Script**: Orchestrates the entire workflow

## Quick Start

```bash
cd spikes/1757044045_pr_pod_helm_deployment/
./deploy-pr-with-registry.sh
```

## What the Enhanced Pod Does

1. **Setup**: Creates buildx builder, installs Helm (cached)
2. **Clone**: Pulls repository using GitHub PAT (cached)
3. **Build & Push**: Builds images and pushes to in-cluster registry
4. **Generate Chart**: Creates a simple Helm chart for the web app
5. **Deploy**: Uses Helm to deploy the application with built images
6. **Verify**: Shows deployment status and running pods

## Registry Integration

- **Registry URL**: `registry.registry.svc.cluster.local:5000`
- **Image Tags**: `catalyst-web:latest` and `catalyst-web:pr-{branch}`
- **Push Strategy**: Uses `--push` flag with buildx for direct registry push

## Files Created

- `deploy-pr-with-registry.sh` - Main orchestration script  
- `pr-pod-with-registry.yaml` - Enhanced PR pod with registry push
- `registry.yaml` - Docker registry manifest (namespace, PVC, deployment, service)
- Generated Helm chart in `/tmp/web-app-chart/` (runtime)

## Expected Outcome

- In-cluster Docker registry is deployed and running
- PR pod builds web app image and pushes to registry
- Web application is deployed via Helm using the built image
- Full CI/CD pipeline demonstrated locally
- Foundation established for production PR workflows