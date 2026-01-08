# Kind Cluster Testing Guide

This document explains how the web application integrates with a kind (Kubernetes in Docker) cluster for testing Kubernetes functionality.

## Overview

The web application includes Kubernetes integration capabilities that can be tested against a local kind cluster. This setup is particularly useful for:

- E2E testing of Kubernetes API endpoints
- Validating deployment creation and management
- Testing without requiring a full production Kubernetes cluster
- Building and caching container images with the in-cluster registry

## Integration Test Support

The repository includes comprehensive integration tests for Kubernetes functionality:

### Running Integration Tests

```bash
# Run all integration tests (requires Kubernetes cluster)
npm run test:integration

# Run specific Kubernetes integration tests
npm run test:integration -- __tests__/integration/k8s-namespaces.test.ts
npm run test:integration -- __tests__/integration/k8s-preview-deployment.test.ts
npm run test:integration -- __tests__/integration/environment-url-access.test.ts
```

### Test Results

**Working Tests (133/135):**
- ✅ Database integration tests (webhook, models)
- ✅ Basic Kubernetes operations (namespace listing, deployment management)
- ✅ Preview deployment operations (create, update, delete, status checking)
- ✅ Environment URL access tests (gracefully skips when CRD not available)

**Known Limitations (2/135):**
- ⚠️ `k8s-pull-request-pod-docker-build.test.ts`: Requires Docker buildx with Kubernetes driver
  - This test validates Docker-in-Kubernetes builds with buildx
  - Requires pods to access the Kubernetes API and create builder deployments
  - Works in production environments with proper RBAC configuration
  - May timeout in minimal Kind clusters without network policy configuration

### GitHub Copilot Environment

The `.github/workflows/copilot-setup-steps.yml` workflow sets up a complete Kubernetes environment for GitHub Copilot agents:

- Kind cluster with ingress controller (port 8080)
- NGINX Ingress Controller
- Environment CRD installed
- Test application deployed
- Base64-encoded kubeconfig in .env

Copilot agents can run integration tests with: `npm run test:integration`

## In-Cluster Container Registry

The Kind cluster includes an in-cluster container registry that enables fast image building and caching:

- **Registry URL**: `localhost:5000` (when port-forwarded)
- **Purpose**: Fast image caching and deployment without external dependencies
- **Usage**: Images can be built and pushed directly to the registry for immediate use in deployments

Example usage:

```bash
# Build and push to in-cluster registry
docker build -t localhost:5000/myapp:latest .
docker push localhost:5000/myapp:latest

# Deploy from in-cluster registry
kubectl run myapp --image=localhost:5000/myapp:latest
```

## Prerequisites

- Docker installed and running
- kubectl installed and configured
- kind cluster running (this should be automatically configured in the development environment)

## Verifying Kind Cluster Access

Check if the kind cluster is accessible:

```bash
# Check cluster info
kubectl cluster-info

# Check nodes
kubectl get nodes

# Expected output should show kind control plane node
# NAME                            STATUS   ROLES           AGE   VERSION
# preview-cluster-control-plane   Ready    control-plane   5m    v1.29.2
```

## Running Kubernetes E2E Tests

The E2E tests are designed to work with the kind cluster and **require** a working Kubernetes cluster to pass:

```bash
# Run all Kubernetes-related E2E tests
npm run test:e2e -- --grep "Kubernetes"

# Run all E2E tests
npm run test:e2e
```

**Important**: These tests will fail if the Kubernetes cluster is not accessible. They use the Kubernetes JavaScript client to verify cluster connectivity by listing namespaces before running any deployment tests.

## Testing the Kubernetes API Endpoint

### Via API Call

```bash
# Deploy nginx container via API
curl http://localhost:3000/api/kubernetes/deploy-nginx

# Expected successful response:
{
  "success": true,
  "message": "Nginx deployment created successfully",
  "deployment": {
    "name": "nginx-deployment-1755060836096",
    "namespace": "default",
    "replicas": 1,
    "timestamp": 1755060836096
  }
}
```

### Via Kubernetes Client Verification

After making API calls, the E2E tests use the Kubernetes JavaScript client to verify deployments were actually created:

```bash
# List all deployments created by the web app
kubectl get deployments -l created-by=catalyst-web-app

# Check specific deployment status
kubectl get deployment nginx-deployment-<timestamp> -o wide

# View deployment details
kubectl describe deployment nginx-deployment-<timestamp>

# Check that pods are running
kubectl get pods -l created-by=catalyst-web-app
```

## Expected Test Flow

1. **Cluster Connectivity Check**: Tests verify the Kubernetes cluster is accessible by listing namespaces using the Kubernetes JavaScript client
2. **E2E Test Execution**: Playwright tests call the `/api/kubernetes/deploy-nginx` endpoint
3. **API Processing**: The endpoint creates a deployment in the kind cluster
4. **Response Validation**: Tests verify the API response structure and success status
5. **Kubernetes Client Verification**: Tests verify the deployment exists in the cluster using the Kubernetes JavaScript client
6. **Pod Verification**: Tests verify pods are running with correct configuration using the Kubernetes client
7. **Cleanup**: Test deployments are cleaned up using the Kubernetes client

**Important**: All tests will fail if the Kubernetes cluster is not accessible. There is no fallback or graceful degradation.

## Cleanup

Remove test deployments:

```bash
# Remove all deployments created by the web app
kubectl delete deployments -l created-by=catalyst-web-app

# Or remove specific deployment
kubectl delete deployment nginx-deployment-<timestamp>
```

## Troubleshooting

### Common Issues

1. **"Failed to load Kubernetes configuration"**
   - Ensure kind cluster is running: `kind get clusters`
   - Check kubectl context: `kubectl config current-context`

2. **"Cannot connect to Kubernetes cluster"**
   - Verify cluster is accessible: `kubectl cluster-info`
   - Check if kind cluster is healthy: `kubectl get nodes`

3. **Database Connection Errors**
   - Ensure PostgreSQL is running: `docker ps | grep postgres`
   - Run database migrations: `npm run db:migrate`

### Verifying Configuration

```bash
# Check current kubectl context (should point to kind cluster)
kubectl config current-context

# View cluster configuration
kubectl config view --raw

# Test cluster connectivity
kubectl auth can-i create deployments
```

## Integration with CI/CD

This kind cluster setup is designed to work in CI environments where:

- A kind cluster is automatically provisioned and must be accessible
- The web application can create real Kubernetes resources
- Tests verify end-to-end functionality including actual cluster state using the Kubernetes JavaScript client
- Tests will fail if the cluster is not accessible (no graceful fallback)

**Test Requirements**:

- Kubernetes cluster must be running and accessible
- Tests use the default kubeconfig context
- Full RBAC permissions required for creating/deleting deployments and listing namespaces
