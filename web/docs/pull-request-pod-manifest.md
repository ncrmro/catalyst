# Pull Request Pod Manifest Documentation

## Overview

The Pull Request Pod Manifest functionality provides a way to deploy Kubernetes jobs that can use the Docker Buildx Kubernetes driver to create build pods within the cluster. This is particularly useful for CI/CD workflows where you need to build container images using Kubernetes resources.

## Features

- **Service Account Creation**: Automatically creates service accounts with appropriate permissions
- **RBAC Configuration**: Sets up roles and role bindings for pod creation permissions
- **Job Deployment**: Deploys Kubernetes jobs that can use buildx kubernetes driver
- **Resource Management**: Includes cleanup functionality for created resources
- **Status Monitoring**: Provides job status checking capabilities

## Core Functions

### `createPullRequestPodJob(options: PullRequestPodOptions)`

Creates a Kubernetes job with a service account that has permissions to create pods for buildx.

**Parameters:**
- `name`: Unique identifier for the PR job
- `namespace`: Kubernetes namespace (default: 'default')
- `image`: Container image to use (default: 'docker:24-dind')
- `clusterName`: Target cluster name (optional)

**Returns:** `PullRequestPodResult` containing job details

**Example:**
```typescript
import { createPullRequestPodJob } from '@/lib/k8s-pull-request-pod';

const result = await createPullRequestPodJob({
  name: 'pr-123-build',
  namespace: 'default',
  image: 'docker:24-dind'
});

console.log(`Created job: ${result.jobName}`);
```

### `createBuildxServiceAccount(name, namespace, clusterName)`

Creates a service account with the necessary permissions for buildx kubernetes driver.

**Permissions Created:**
- `pods`: create, get, list, watch, delete
- `pods/log`: get
- `configmaps, secrets`: get, list

### `getPullRequestPodJobStatus(jobName, namespace, clusterName)`

Retrieves the current status of a pull request pod job.

**Returns:**
- `jobName`: Name of the job
- `status`: Current job status
- `succeeded`, `failed`, `active`: Job execution counters
- `conditions`: Detailed status conditions

### `cleanupPullRequestPodJob(name, namespace, clusterName)`

Cleans up all resources created for a pull request pod job including:
- Jobs with matching labels
- Service account
- Role and role binding

## Docker Buildx Integration

The created pods are configured to use Docker Buildx with the Kubernetes driver:

```bash
# The job automatically sets up buildx kubernetes driver
docker buildx create --driver=kubernetes --name k8s-builder
docker buildx use k8s-builder

# Build images using the kubernetes driver
docker buildx build --platform linux/amd64 -t my-image .
```

## Service Account Permissions

The service account created has these specific permissions:

```yaml
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "get", "list", "watch", "delete"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
```

## Resource Labels

All created resources are labeled for easy identification and cleanup:

- `app`: 'catalyst-buildx' or 'catalyst-pr-job'
- `created-by`: 'catalyst-web-app'
- `pr-job` or `pr-name`: The provided name parameter

## Job Configuration

Jobs are created with the following specifications:

- **Restart Policy**: Never
- **Backoff Limit**: 3 retries
- **TTL**: 3600 seconds (1 hour) for automatic cleanup
- **Resource Limits**: 500m CPU, 512Mi memory
- **Resource Requests**: 100m CPU, 128Mi memory

## Error Handling

The module includes comprehensive error handling:

- Configuration validation
- Kubernetes API error handling
- Resource creation conflict handling
- Cleanup error tolerance (continues if resources don't exist)

## Security Considerations

- Service accounts are scoped to specific namespaces
- Minimum required permissions are granted
- Resources are properly labeled for tracking
- Automatic cleanup prevents resource accumulation

## Usage in GitHub Actions

This functionality is designed to work with GitHub Actions workflows:

```yaml
- name: Create PR Build Job
  run: |
    curl -X POST https://your-app.com/api/kubernetes/pr-jobs \
      -H "Content-Type: application/json" \
      -d '{"name": "pr-${{ github.event.number }}", "namespace": "builds"}'
```

### API Endpoint

The functionality is exposed via `/api/kubernetes/pr-jobs` endpoint:

**Create a job:**
```bash
curl -X POST /api/kubernetes/pr-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "name": "pr-123-build",
    "namespace": "default",
    "image": "docker:24-dind"
  }'
```

**Check job status:**
```bash
curl -X POST /api/kubernetes/pr-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "action": "status",
    "name": "pr-123-build",
    "jobName": "pr-job-pr-123-build-1640995200000"
  }'
```

**Clean up resources:**
```bash
curl -X POST /api/kubernetes/pr-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup",
    "name": "pr-123-build"
  }'
```

## Monitoring and Observability

- Job status can be monitored through the status function
- All resources are labeled for easy kubectl queries
- Resource limits prevent runaway resource consumption

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the cluster has RBAC enabled and your kubeconfig has appropriate permissions
2. **Image Pull Errors**: Verify the container image is accessible from the cluster
3. **Buildx Driver Issues**: Ensure the kubernetes driver can create build pods in the cluster

### Debugging Commands

```bash
# Check job status
kubectl get jobs -l pr-name=your-pr-name

# Check job logs
kubectl logs -l pr-name=your-pr-name

# Check service account
kubectl get serviceaccount your-pr-name-buildx-sa

# Check permissions
kubectl describe role your-pr-name-buildx-role
```