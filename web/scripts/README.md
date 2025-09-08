# PR Pod TypeScript Script

This directory contains TypeScript scripts for submitting PR pod jobs that build and push images to GitHub Container Registry (GHCR).

## Scripts

### `submit-pr-pod.ts`
Main script that creates a special `pr-000` PR pod job for building and pushing images. Based on the work in spike `1757044045_pr_pod_helm_deployment`.

**Usage:**
```bash
npm run submit-pr-pod
```

**Features:**
- Creates RBAC resources (ServiceAccount, Role, RoleBinding)
- Creates PVCs for git and helm caching
- Creates GitHub authentication secrets
- Submits a PR pod job that builds and pushes to GHCR
- Uses the pre-built `ghcr.io/ncrmro/catalyst/pr-job-pod:latest` image

### `submit-pr-pod-dry-run.ts`
Dry-run version that only creates RBAC and PVCs without requiring GitHub credentials.

**Usage:**
```bash
npm run submit-pr-pod:dry-run
```

**Features:**
- Tests Kubernetes connectivity
- Creates RBAC resources
- Creates PVCs for caching
- Skips secret creation and job submission

## Prerequisites

1. **Kubernetes Cluster**: Configure `KUBECONFIG_PRIMARY` environment variable with base64-encoded kubeconfig
2. **GitHub Credentials** (for full script):
   - `GITHUB_PAT`: GitHub Personal Access Token
   - `GITHUB_GHCR_PAT`: GitHub Classic PAT with packages scope

## Environment Variables

All scripts support these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PR_NAME` | `pr-000` | PR identifier for the job |
| `NAMESPACE` | `default` | Kubernetes namespace |
| `GITHUB_USER` | `ncrmro` | GitHub username |
| `REPO_URL` | `https://github.com/ncrmro/catalyst.git` | Repository URL |
| `PR_BRANCH` | `main` | Branch to build |
| `CLUSTER_NAME` | (auto-detect) | Target cluster name |

## Configuration

Set credentials in `web/.env`:

```bash
# GitHub credentials
GITHUB_PAT=your_personal_access_token
GITHUB_GHCR_PAT=your_classic_pat_with_packages_scope

# Kubernetes configuration
KUBECONFIG_PRIMARY=base64_encoded_kubeconfig
```

## Expected Output

After successful execution, the PR pod will:

1. Clone the catalyst repository
2. Set up buildx Kubernetes driver
3. Build the web application image
4. Push images to GHCR with tags:
   - `ghcr.io/ncrmro/catalyst/web:pr-000`
   - `ghcr.io/ncrmro/catalyst/web:pr-000-cache`

## Monitoring

Monitor the job execution:

```bash
# Check job status
kubectl get job pr-job-pr-000-* -n default

# View job logs
kubectl logs -f job/pr-job-pr-000-* -n default

# Check created resources
kubectl get serviceaccount,role,rolebinding,pvc -n default
```

## Cleanup

To clean up resources:

```bash
# Delete the job
kubectl delete job pr-job-pr-000-* -n default

# Delete secrets (if you want to recreate them)
kubectl delete secret github-pat-secret ghcr-registry-secret -n default

# Delete PVCs (will remove caches)
kubectl delete pvc git-cache-pvc helm-cache-pvc -n default

# Delete RBAC resources
kubectl delete serviceaccount pull-request-job-pod -n default
kubectl delete role pull-request-job-role -n default
kubectl delete rolebinding pull-request-job-binding -n default
```