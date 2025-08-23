# NextJS Helm Chart

This Helm chart deploys a NextJS application on Kubernetes.

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

### Development Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `developmentImage.repository` | Development image repository for helm tests | `node` |
| `developmentImage.tag` | Development image tag for helm tests | `Chart.AppVersion` |
| `developmentImage.pullPolicy` | Development image pull policy for helm tests | `IfNotPresent` |

### NextJS Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nextjs.env` | Environment variables for NextJS | `[{name: "NODE_ENV", value: "production"}, {name: "PORT", value: "3000"}]` |
| `nextjs.envFrom` | Environment variables from secrets/configmaps | `[]` |

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

## Health Checks

The chart includes default health checks that probe the root path (`/`) on port 3000. Make sure your NextJS application responds to HTTP requests on this endpoint.

## Notes

- This chart assumes your NextJS application is containerized and listens on port 3000
- The default image is `node:20-alpine` which is suitable for custom NextJS builds
- Environment variables can be customized via the `nextjs.env` values
- The chart supports horizontal pod autoscaling when `autoscaling.enabled` is set to `true`