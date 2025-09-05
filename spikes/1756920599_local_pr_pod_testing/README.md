# Spike: Local Pull Request Pod Testing

This spike demonstrates testing PR pods locally that can clone GitHub repos, build with buildx, and deploy with Helm.

## Goal

Test the complete PR pod workflow locally:
1. Clone repository using GitHub PAT
2. Build Docker images with buildx + Kubernetes driver
3. Deploy applications using Helm
4. Cache Git repository and Helm binary for faster subsequent runs

## Problem

Testing PR pods normally requires GitHub webhook integration. This spike provides a local testing environment using kind/devbox clusters.

## Quick Start

```bash
cd spikes/1756920599_local_pr_pod_testing/
./test-local-pr.sh
```

The script automatically:
- Loads GitHub PAT from `web/.env`
- Creates RBAC resources and PVCs
- Deploys and monitors the PR pod job

## What the Pod Does

1. **Setup**: Creates buildx Kubernetes builder, installs Helm (cached)
2. **Clone**: Pulls repository using GitHub PAT (cached for speed)  
3. **Verify**: Checks for `package.json`, `Dockerfile`, `docker-bake.yml`
4. **Build**: Uses `docker buildx bake` (or falls back to single build)
5. **Ready**: Environment prepared for Helm deployments

## Files Created

- `test-pr-pod.yaml` - Kubernetes Job definition
- `rbac.yaml` - ServiceAccount with deployment permissions
- `git-cache-pvc.yaml` - PVC for Git repository cache (1Gi)
- `helm-cache-pvc.yaml` - PVC for Helm binary cache (500Mi)
- `test-local-pr.sh` - Main test script
- `verify-cloned-files.sh` - Verification script

## Manual Commands

```bash
# Check job status
kubectl get job test-pr-pod-with-pat

# View logs
kubectl logs -l job-name=test-pr-pod-with-pat

# Clean up
kubectl delete job test-pr-pod-with-pat
kubectl delete secret github-pat-secret
kubectl delete pvc git-cache-pvc helm-cache-pvc  # Optional: removes cache
```

## Key Features

- **Caching**: Git repos and Helm binary persist across runs
- **RBAC**: ServiceAccount with deployment permissions 
- **Buildx**: Uses Kubernetes driver for container builds
- **Fallback**: Supports both bake files and single Dockerfiles
- **Verification**: Checks required files before building
