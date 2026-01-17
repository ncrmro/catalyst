---
applyTo: "**"
---

# Kind Cluster Access in Copilot Environment

When working in the GitHub Copilot agent environment, a fully functional kind (Kubernetes in Docker) cluster is available for testing and development.

## Cluster Information

- **Cluster Name**: `preview-cluster`
- **Cluster Type**: Kind (Kubernetes in Docker)
- **API Server**: Accessible via kubectl (typically at `https://127.0.0.1:<random-port>`)
- **Control Plane Node**: `preview-cluster-control-plane`

## Available Resources

The cluster comes pre-configured with:

1. **Environment CRD**: `environments.catalyst.catalyst.dev` Custom Resource Definition is installed
2. **NGINX Ingress Controller**: Running in `ingress-nginx` namespace
3. **Test Environment CR**: An example Environment custom resource named `ci-test-env` in the default namespace
4. **Test Application**: `ci-test-app` deployment running in default namespace
5. **Ingress Configuration**: Pre-configured with hostname-based routing (e.g., `test-project-ci-test-env.localhost`)

## Cluster Access Verification

You can verify cluster access at any time:

```bash
# Check if cluster is accessible
kubectl cluster-info

# List all namespaces
kubectl get namespaces

# View control plane node
kubectl get nodes

# Check running pods across all namespaces
kubectl get pods -A
```

## Creating Resources

You have full permissions to create resources in the cluster:

```bash
# Create a namespace
kubectl create namespace test-namespace

# Create a deployment
kubectl create deployment test-app --image=nginx:alpine -n test-namespace

# Create a service
kubectl expose deployment test-app --port=80 -n test-namespace

# Check deployment status
kubectl get deployments -n test-namespace

# Verify pods are running
kubectl get pods -n test-namespace
```

## Permissions

The Copilot agent has full cluster-admin permissions:
- ✅ Create/delete namespaces
- ✅ Create/delete deployments, services, pods
- ✅ Create/delete custom resources (Environments, etc.)
- ✅ View logs and describe resources
- ✅ Apply manifests and configurations

## Testing Kubernetes Integration

When testing Kubernetes integration features:

1. **Use the existing cluster**: Don't create a new kind cluster - one is already running
2. **Clean up test resources**: Always delete test namespaces/resources after testing
3. **Check existing resources first**: Use `kubectl get all -A` to see what's already deployed
4. **Use the Environment CRD**: Test with the pre-installed `environments.catalyst.catalyst.dev` CRD

## Example: Testing Environment Creation

```bash
# View the existing Environment CRD
kubectl get crd environments.catalyst.catalyst.dev

# Check existing Environment resources
kubectl get environments -A

# Describe the test environment
kubectl describe environment ci-test-env -n default

# View the environment status
kubectl get environment ci-test-env -n default -o yaml
```

## Common Tasks

### Check Ingress Controller Status
```bash
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### View Environment Status
```bash
# List all environments
kubectl get environments -A

# Get details about a specific environment
kubectl get environment ci-test-env -n default -o yaml
```

### Test Resource Creation
```bash
# Create a test namespace
kubectl create namespace copilot-test

# Deploy a simple app
kubectl create deployment hello --image=nginx:alpine -n copilot-test

# Wait for pod to be ready
kubectl wait --for=condition=Ready pod -l app=hello -n copilot-test --timeout=60s

# Clean up
kubectl delete namespace copilot-test
```

## Important Notes

- **The cluster is ephemeral**: It's created fresh for each Copilot session
- **Pre-configured setup**: The cluster already has ingress, CRDs, and test resources
- **No need to install**: Kind, kubectl, and cluster are already configured
- **Full access**: You have cluster-admin level permissions for all operations
- **Clean environment**: Always clean up test resources to avoid cluttering the cluster

## Troubleshooting

If you encounter issues:

1. **Check cluster is running**: `kind get clusters` should show `preview-cluster`
2. **Verify kubectl config**: `kubectl config current-context` should point to the kind cluster
3. **Check node status**: `kubectl get nodes` should show the control plane node as Ready
4. **View cluster events**: `kubectl get events -A --sort-by='.lastTimestamp'`

## Reference Documentation

For more detailed information about kind cluster testing:
- See `web/docs/kind-cluster-testing.md` for testing patterns
- See `.github/workflows/web.test.yml` for CI/CD setup examples
- See `.github/workflows/copilot-setup-steps.yml` for cluster initialization
