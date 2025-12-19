# Operator Kind Deployment Experience

This spike documents the experience of deploying the Catalyst operator to a kind (Kubernetes in Docker) cluster and creates a comprehensive Helm chart for deploying the entire Catalyst platform.

## Goal

Create a production-ready Helm chart that deploys:
1. PostgreSQL database
2. Catalyst web application
3. Catalyst Kubernetes operator (with CRDs and RBAC)

All components should be installable to a kind cluster with a single Helm command.

## Background

The Catalyst platform consists of three main components:

- **Web Application** (`/web`): NextJS application that provides the UI and API
- **PostgreSQL Database**: Data persistence for users, projects, and deployments
- **Kubernetes Operator** (`/operator`): Go-based operator that manages Project and Environment CRDs

The operator handles deployment orchestration, moving complex Kubernetes logic out of the web application into a dedicated controller following Kubernetes best practices.

## Prerequisites

Before deploying to kind, ensure you have:

- Docker installed and running
- kind installed (`kind version` should work)
- kubectl installed
- helm installed (v3.x)

## Creating a Kind Cluster

```bash
# Create a new kind cluster
kind create cluster --name catalyst

# Verify the cluster is running
kubectl cluster-info --context kind-catalyst
kubectl get nodes
```

Expected output:
```
NAME                     STATUS   ROLES           AGE   VERSION
catalyst-control-plane   Ready    control-plane   1m    v1.34.0
```

## Operator Deployment Steps

### 1. Build Operator Image

First, build the operator Docker image:

```bash
cd operator
make docker-build IMG=catalyst-operator:latest

# Load the image into kind cluster
kind load docker-image catalyst-operator:latest --name catalyst
```

### 2. Generate and Install CRDs

The operator defines two Custom Resource Definitions:
- `Project` - Defines a deployable application
- `Environment` - Defines a specific instance (preview, staging, production)

```bash
cd operator

# Generate CRD manifests
make manifests

# Verify CRDs were generated
ls -la config/crd/bases/
# Should show:
# - catalyst.catalyst.dev_projects.yaml
# - catalyst.catalyst.dev_environments.yaml

# Install CRDs to the cluster
make install
# OR manually:
kubectl apply -f config/crd/bases/
```

Verify CRDs are installed:
```bash
kubectl get crds | grep catalyst
```

Expected output:
```
environments.catalyst.catalyst.dev   2024-12-19T17:00:00Z
projects.catalyst.catalyst.dev       2024-12-19T17:00:00Z
```

### 3. Deploy Operator Controller

The operator controller needs:
- ServiceAccount for pod identity
- ClusterRole with permissions to manage namespaces, deployments, etc.
- ClusterRoleBinding to bind the role to the service account
- Deployment for the operator pod

```bash
cd operator

# Deploy using kustomize (includes RBAC, deployment, service)
make deploy IMG=catalyst-operator:latest

# Verify deployment
kubectl get deployment -n operator-system
kubectl get pods -n operator-system
```

Expected output:
```
NAME                                 READY   STATUS    RESTARTS   AGE
operator-controller-manager-xxxxx    1/1     Running   0          30s
```

### 4. Test Operator Functionality

Create a test Environment CR to verify the operator is working:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: test-project
spec:
  source:
    repositoryUrl: "https://github.com/ncrmro/catalyst"
    branch: "main"
  deployment:
    type: "helm"
    path: "./charts/nextjs"
  resources:
    defaultQuota:
      cpu: "1"
      memory: "2Gi"
EOF

cat <<EOF | kubectl apply -f -
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: test-env
spec:
  projectRef:
    name: test-project
  type: "development"
  source:
    commitSha: "abc123"
    branch: "main"
EOF
```

Check operator logs to see reconciliation:
```bash
kubectl logs -n operator-system deployment/operator-controller-manager -f
```

### 5. Verify Namespace Creation

The operator should create a namespace for the environment:

```bash
kubectl get namespaces | grep env-
# Should show a namespace like: env-test-project-test-env
```

## Deployment Experience & Learnings

### What Went Well

1. **CRD Generation**: Kubebuilder makes it easy to generate CRDs from Go structs
2. **RBAC Scaffolding**: The operator scaffold includes proper RBAC configuration
3. **Kustomize Integration**: Using kustomize makes it easy to customize deployments
4. **Kind Compatibility**: The operator works well in kind clusters with proper image loading

### Challenges Encountered

1. **Image Loading**: Remember to load images into kind with `kind load docker-image`
2. **Namespace Conflicts**: The operator uses `operator-system` namespace by default
3. **CRD Versioning**: Ensure CRDs are re-applied if the schema changes
4. **RBAC Permissions**: The operator needs ClusterRole permissions, not just namespaced Role

### Best Practices Learned

1. **Always verify CRDs first**: Check CRDs are installed before deploying the operator
2. **Check operator logs**: Use `kubectl logs` to debug reconciliation issues
3. **Test with sample CRs**: Create simple test resources to verify functionality
4. **Use proper image tags**: Avoid `latest` in production, use semantic versions

## Cleanup

To remove the operator and CRDs:

```bash
cd operator

# Undeploy the operator
make undeploy

# Uninstall CRDs
make uninstall

# Delete the kind cluster
kind delete cluster --name catalyst
```

## Next Steps

This deployment experience informed the creation of the comprehensive Helm chart at `/charts/catalyst` which packages all three components (web, database, operator) for easy installation.

See the [Catalyst Helm Chart README](/charts/catalyst/README.md) for installation instructions.
