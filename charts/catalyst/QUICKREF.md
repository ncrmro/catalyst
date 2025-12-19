# Catalyst Helm Chart Quick Reference

## Installation

### Kind Cluster (Local Testing)

```bash
# Create cluster
kind create cluster --name catalyst

# Install chart with kind-optimized values
helm install catalyst . \
  --create-namespace \
  --namespace catalyst \
  --values values-kind.yaml \
  --wait

# Access web app
kubectl port-forward -n catalyst svc/catalyst-web 3000:3000
```

### Production Cluster

```bash
# Install with custom values
helm install catalyst . \
  --create-namespace \
  --namespace catalyst \
  --values production-values.yaml \
  --set postgresql.auth.password=<secure-password>
```

## Common Tasks

### Upgrade Release

```bash
helm upgrade catalyst . \
  --namespace catalyst \
  --values your-values.yaml
```

### Check Status

```bash
# Release status
helm status catalyst -n catalyst

# Pod status
kubectl get pods -n catalyst
kubectl get pods -n catalyst-system

# CRDs
kubectl get crds | grep catalyst
```

### View Logs

```bash
# Web application
kubectl logs -n catalyst -l app.kubernetes.io/component=web -f

# Operator
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator -f

# PostgreSQL
kubectl logs -n catalyst -l app.kubernetes.io/name=postgresql -f
```

### Testing the Operator

```bash
# Create a Project
kubectl apply -f - <<EOF
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: test-project
  namespace: catalyst-system
spec:
  source:
    repositoryUrl: "https://github.com/example/repo"
    branch: "main"
  deployment:
    type: "helm"
    path: "./charts/app"
EOF

# Create an Environment
kubectl apply -f - <<EOF
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: test-env
  namespace: catalyst-system
spec:
  projectRef:
    name: test-project
  type: "development"
  source:
    commitSha: "abc123"
    branch: "main"
EOF

# Check reconciliation
kubectl get projects -n catalyst-system
kubectl get environments -n catalyst-system
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator -f
```

## Cleanup

### Uninstall Chart

```bash
# Uninstall release
helm uninstall catalyst -n catalyst

# Delete CRDs (optional)
kubectl delete crd projects.catalyst.catalyst.dev
kubectl delete crd environments.catalyst.catalyst.dev

# Delete namespaces
kubectl delete namespace catalyst
kubectl delete namespace catalyst-system
```

### Delete Kind Cluster

```bash
kind delete cluster --name catalyst
```

## Troubleshooting

### Web app can't connect to database

```bash
# Check PostgreSQL is running
kubectl get pods -n catalyst -l app.kubernetes.io/name=postgresql

# Check connection string
kubectl get secret catalyst-web -n catalyst -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

### Operator not reconciling

```bash
# Check operator is running
kubectl get pods -n catalyst-system

# Check CRDs are installed
kubectl get crds | grep catalyst

# View operator logs
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator -f
```

### Image pull errors

```bash
# For local images with kind
kind load docker-image <image-name> --name catalyst

# For private registries, create imagePullSecret
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n catalyst
```

## Configuration Files

- `values.yaml` - Default values
- `values-kind.yaml` - Optimized for kind clusters
- `README.md` - Full documentation

## Key Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `web.enabled` | `true` | Deploy web application |
| `postgresql.enabled` | `true` | Deploy PostgreSQL |
| `operator.enabled` | `true` | Deploy operator |
| `operator.crds.install` | `true` | Install CRDs |
| `web.ingress.enabled` | `false` | Enable ingress |
| `web.service.port` | `3000` | Web service port |
