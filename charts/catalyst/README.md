# Catalyst Helm Chart

A complete Helm chart for deploying the Catalyst development platform to Kubernetes.

## Overview

This chart deploys all components of the Catalyst platform:

- **Web Application**: NextJS-based web interface and API
- **PostgreSQL Database**: Data persistence for users, projects, and deployments
- **Kubernetes Operator**: Go-based operator managing Project and Environment CRDs

## Prerequisites

- Kubernetes 1.21+
- Helm 3.8+
- kubectl configured to communicate with your cluster

## Installation

### Quick Start with Kind

For local testing with kind:

```bash
# Create a kind cluster
kind create cluster --name catalyst

# Add Bitnami repo for PostgreSQL dependency
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install the chart
helm install catalyst ./charts/catalyst \
  --create-namespace \
  --namespace catalyst

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n catalyst --timeout=300s
kubectl wait --for=condition=ready pod --all -n catalyst-system --timeout=300s
```

### Production Installation

For production deployments, create a `values.yaml` file with your configuration:

```yaml
web:
  replicaCount: 3
  
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
      - host: catalyst.yourdomain.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: catalyst-tls
        hosts:
          - catalyst.yourdomain.com
  
  env:
    NEXTAUTH_URL: "https://catalyst.yourdomain.com"
    NEXTAUTH_SECRET: "your-secret-here"  # Use external secret manager in production
    GITHUB_CLIENT_ID: "your-github-client-id"
    GITHUB_CLIENT_SECRET: "your-github-client-secret"  # Use external secret manager
  
  secrets:
    create: false  # Use external secret manager in production
  
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi
  
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

postgresql:
  primary:
    persistence:
      size: 100Gi
      storageClass: fast-ssd  # Use your preferred storage class
    resources:
      limits:
        cpu: 2000m
        memory: 4Gi
      requests:
        cpu: 1000m
        memory: 2Gi
  
  auth:
    username: catalyst
    password: ""  # Set via --set or external secret
    database: catalyst

operator:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
```

Install with custom values:

```bash
helm install catalyst ./charts/catalyst \
  --create-namespace \
  --namespace catalyst \
  --values production-values.yaml \
  --set postgresql.auth.password=your-secure-password
```

## Configuration

### Web Application

| Parameter | Description | Default |
|-----------|-------------|---------|
| `web.enabled` | Enable web application deployment | `true` |
| `web.replicaCount` | Number of web replicas | `1` |
| `web.image.repository` | Web image repository | `ghcr.io/ncrmro/catalyst/web` |
| `web.image.tag` | Web image tag | Chart appVersion |
| `web.service.type` | Kubernetes service type | `ClusterIP` |
| `web.service.port` | Service port | `3000` |
| `web.ingress.enabled` | Enable ingress | `false` |
| `web.env.DATABASE_URL` | PostgreSQL connection string | Auto-configured for bundled PostgreSQL |
| `web.env.NEXTAUTH_URL` | NextAuth URL | `http://localhost:3000` |
| `web.env.NEXTAUTH_SECRET` | NextAuth secret | `change-me-in-production` |
| `web.resources.limits.cpu` | CPU limit | `1000m` |
| `web.resources.limits.memory` | Memory limit | `1Gi` |
| `web.autoscaling.enabled` | Enable HPA | `false` |

### PostgreSQL

This chart uses the [Bitnami PostgreSQL chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql) as a dependency.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL deployment | `true` |
| `postgresql.auth.username` | PostgreSQL username | `catalyst` |
| `postgresql.auth.password` | PostgreSQL password | `catalyst` |
| `postgresql.auth.database` | PostgreSQL database name | `catalyst` |
| `postgresql.primary.persistence.size` | PVC size | `8Gi` |

For external databases, set `postgresql.enabled=false` and configure `web.env.DATABASE_URL` appropriately.

### Operator

| Parameter | Description | Default |
|-----------|-------------|---------|
| `operator.enabled` | Enable operator deployment | `true` |
| `operator.replicaCount` | Number of operator replicas | `1` |
| `operator.image.repository` | Operator image repository | `ghcr.io/ncrmro/catalyst/operator` |
| `operator.image.tag` | Operator image tag | Chart appVersion |
| `operator.namespace` | Operator namespace | `catalyst-system` |
| `operator.crds.install` | Install CRDs with chart | `true` |
| `operator.rbac.create` | Create RBAC resources | `true` |
| `operator.metrics.enabled` | Enable metrics service | `true` |

## Upgrading

To upgrade an existing release:

```bash
helm upgrade catalyst ./charts/catalyst \
  --namespace catalyst \
  --values your-values.yaml
```

## Uninstalling

To uninstall/delete the `catalyst` release:

```bash
helm uninstall catalyst --namespace catalyst
```

This will delete all resources except:
- PersistentVolumeClaims (to prevent data loss)
- CRDs (if installed with the chart)

To delete CRDs manually:

```bash
kubectl delete crd projects.catalyst.catalyst.dev
kubectl delete crd environments.catalyst.catalyst.dev
```

To delete the namespaces:

```bash
kubectl delete namespace catalyst
kubectl delete namespace catalyst-system
```

## Verification

After installation, verify all components are running:

```bash
# Check web application
kubectl get pods -n catalyst -l app.kubernetes.io/component=web

# Check PostgreSQL
kubectl get pods -n catalyst -l app.kubernetes.io/name=postgresql

# Check operator
kubectl get pods -n catalyst-system -l app.kubernetes.io/component=operator

# Check CRDs
kubectl get crds | grep catalyst
```

Test the operator by creating a sample Project:

```bash
kubectl apply -f - <<EOF
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: sample-project
  namespace: catalyst-system
spec:
  source:
    repositoryUrl: "https://github.com/example/repo"
    branch: "main"
  deployment:
    type: "helm"
    path: "./charts/app"
  resources:
    defaultQuota:
      cpu: "1"
      memory: "2Gi"
EOF
```

Check the operator logs:

```bash
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator -f
```

## Troubleshooting

### Web application can't connect to database

Check that PostgreSQL is running and the connection string is correct:

```bash
kubectl get pods -n catalyst -l app.kubernetes.io/name=postgresql
kubectl logs -n catalyst -l app.kubernetes.io/component=web
```

### Operator not reconciling resources

Check operator logs for errors:

```bash
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator -f
```

Verify CRDs are installed:

```bash
kubectl get crds | grep catalyst
```

### CRD validation errors

If you get validation errors when creating resources, ensure CRDs are up to date:

```bash
helm upgrade catalyst ./charts/catalyst --reuse-values
```

## Development

To test changes to the chart:

```bash
# Lint the chart
helm lint ./charts/catalyst

# Template the chart (dry-run)
helm template catalyst ./charts/catalyst

# Install with debug output
helm install catalyst ./charts/catalyst --dry-run --debug
```

## Contributing

For bugs or feature requests, please open an issue on GitHub.

## License

This chart is licensed under the same license as the Catalyst project.
