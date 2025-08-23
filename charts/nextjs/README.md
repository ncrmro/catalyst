# NextJS Helm Chart

This Helm chart deploys a NextJS application on Kubernetes with optional PostgreSQL database support.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+

## Installing the Chart

To install the chart with the release name `my-nextjs-app`:

```bash
helm install my-nextjs-app ./charts/nextjs
```

## Uninstalling the Chart

To uninstall the deployment:

```bash
helm delete my-nextjs-app
```

## Configuration

The following table lists the configurable parameters of the NextJS chart and their default values.

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | NextJS image repository | `node` |
| `image.tag` | NextJS image tag | `20-alpine` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### NextJS Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nextjs.env` | Environment variables for NextJS | `[{name: "NODE_ENV", value: "production"}, {name: "PORT", value: "3000"}]` |
| `nextjs.envFrom` | Environment variables from secrets/configmaps | `[]` |

### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL subchart | `true` |
| `postgresql.auth.username` | PostgreSQL username | `nextjs` |
| `postgresql.auth.database` | PostgreSQL database name | `nextjs` |
| `postgresql.auth.password` | PostgreSQL password (auto-generated if empty) | `""` |
| `postgresql.primary.persistence.enabled` | Enable PostgreSQL persistence | `true` |
| `postgresql.primary.persistence.size` | PostgreSQL storage size | `1Gi` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `3000` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.hosts` | Ingress hosts configuration | `[{host: "chart-example.local", paths: [{path: "/", pathType: "ImplementationSpecific"}]}]` |

### Resource Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |

## Example Values

```yaml
# Custom NextJS image
image:
  repository: my-nextjs-app
  tag: "v1.0.0"

# Custom environment variables
nextjs:
  env:
    - name: NODE_ENV
      value: "production"
    - name: NEXT_PUBLIC_API_URL
      value: "https://api.example.com"

# PostgreSQL configuration
postgresql:
  enabled: true
  auth:
    password: "mySecurePassword"
  primary:
    persistence:
      size: 5Gi

# Enable ingress
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific

# Scale to multiple replicas
replicaCount: 3
```

## Database Integration

When PostgreSQL is enabled (`postgresql.enabled: true`), the chart automatically:

1. **Deploys PostgreSQL**: Uses the Bitnami PostgreSQL subchart
2. **Creates Database User**: Sets up a `nextjs` user with access to the `nextjs` database
3. **Generates Secrets**: Creates a Kubernetes secret with a randomly generated password and DATABASE_URL
4. **Runs Migrations**: Uses an init container to run database migrations before starting the application
5. **Configures Environment**: Injects the DATABASE_URL environment variable into the NextJS container

The DATABASE_URL format is: `postgresql://nextjs:password@postgresql.namespace.svc.cluster.local:5432/nextjs`

## Health Checks

The chart includes default health checks that probe the root path (`/`) on port 3000. Make sure your NextJS application responds to HTTP requests on this endpoint.

## Notes

- This chart assumes your NextJS application is containerized and listens on port 3000
- The default image is `node:20-alpine` which is suitable for custom NextJS builds
- Environment variables can be customized via the `nextjs.env` values
- The chart supports horizontal pod autoscaling when `autoscaling.enabled` is set to `true`
- When PostgreSQL is enabled, database migrations run automatically before the application starts
- The PostgreSQL password is auto-generated if not specified and stored in a Kubernetes secret