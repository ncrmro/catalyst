# Catalyst Singleton Helm Chart

This Helm chart provides singleton services for the Catalyst platform, including a Docker registry for container image storage and distribution.

## Overview

The `catalyst-singleton` chart is designed to deploy shared infrastructure components that are typically deployed once per cluster and used by multiple applications. Currently, it includes:

- **Docker Registry**: A private Docker registry for storing and distributing container images within the cluster

**Note**: This chart was originally intended to use the `twuni/docker-registry` chart from `https://helm.twun.io` as a dependency (as specified in `helm repo add twuni https://helm.twun.io` and `helm install twuni/docker-registry`). However, to ensure reliability and avoid external dependencies, we've implemented a standalone Docker registry deployment that provides the same functionality.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+

## Installing the Chart

To install the chart with the release name `catalyst-singleton`:

```bash
# Install with default configuration
helm install catalyst-singleton ./charts/catalyst-singleton

# Install with custom values
helm install catalyst-singleton ./charts/catalyst-singleton \
  --set dockerRegistry.persistence.enabled=true \
  --set dockerRegistry.persistence.size=20Gi
```

## Uninstalling the Chart

To uninstall the deployment:

```bash
helm delete catalyst-singleton
```

## Configuration

The following table lists the configurable parameters of the catalyst-singleton chart and their default values.

### Docker Registry Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `dockerRegistry.enabled` | Enable Docker Registry deployment | `true` |
| `dockerRegistry.image.repository` | Docker Registry image repository | `registry` |
| `dockerRegistry.image.tag` | Docker Registry image tag | `2.8.3` |
| `dockerRegistry.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `dockerRegistry.service.type` | Kubernetes service type | `ClusterIP` |
| `dockerRegistry.service.port` | Service port | `5000` |
| `dockerRegistry.service.targetPort` | Container port | `5000` |
| `dockerRegistry.persistence.enabled` | Enable persistent storage | `false` |
| `dockerRegistry.persistence.size` | Storage size | `10Gi` |
| `dockerRegistry.persistence.storageClass` | Storage class | `""` |
| `dockerRegistry.persistence.accessMode` | Access mode | `ReadWriteOnce` |
| `dockerRegistry.resources.limits.cpu` | CPU limit | `100m` |
| `dockerRegistry.resources.limits.memory` | Memory limit | `256Mi` |
| `dockerRegistry.resources.requests.cpu` | CPU request | `50m` |
| `dockerRegistry.resources.requests.memory` | Memory request | `128Mi` |

### Global Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imagePullSecrets` | Global image pull secrets | `[]` |
| `global.storageClass` | Global storage class | `""` |

## Usage

### Accessing the Docker Registry

Once deployed, the Docker registry will be available within the cluster at:

```
<release-name>-catalyst-singleton-docker-registry:5000
```

For example, if installed with the default release name:

```
catalyst-singleton-docker-registry:5000
```

### Using with Port Forwarding

To access the registry from outside the cluster during development:

```bash
kubectl port-forward service/catalyst-singleton-docker-registry 5000:5000
```

Then you can push/pull images:

```bash
# Tag and push an image
docker tag my-image:latest localhost:5000/my-image:latest
docker push localhost:5000/my-image:latest

# Pull an image
docker pull localhost:5000/my-image:latest
```

### Integration with CI/CD

This chart is designed to work with the Kind cluster testing setup. When deployed in a Kind cluster, it provides a local registry for building and caching container images during testing.

## Example Values

```yaml
# Enable persistent storage for the registry
dockerRegistry:
  persistence:
    enabled: true
    size: 20Gi
    storageClass: "fast-ssd"
  
  # Increase resource limits for heavy usage
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 256Mi

# Global configuration
global:
  storageClass: "fast-ssd"
```

## Notes

- The Docker registry is configured for development and testing use cases
- For production use, consider enabling authentication and TLS
- The registry uses filesystem storage by default; for production, consider using object storage backends
- When persistence is disabled, registry data will be lost when pods restart