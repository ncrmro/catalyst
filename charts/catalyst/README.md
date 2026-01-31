# Catalyst Helm Chart

This Helm chart deploys the Catalyst platform, including the web application and all infrastructure components (ingress-nginx, cert-manager, CloudNativePG operator, and PostgreSQL database).

## Components

- **Web Application**: Next.js application with database migrations
- **ingress-nginx**: v4.11.3 - Kubernetes Ingress controller
- **cert-manager**: v1.18.2 - Certificate management for Kubernetes
- **cloudnative-pg**: v0.23.0 - CloudNativePG operator for PostgreSQL
- **PostgreSQL**: CloudNativePG cluster for the web database

## CRD Management

This chart includes CRDs for CloudNativePG and the Catalyst operator in the `crds/` directory. Helm installs CRDs from this directory before templates, ensuring proper ordering.

### Updating CRDs

After updating chart dependencies or modifying operator CRDs, run the update script:

```bash
# First update Helm dependencies
helm dependency update ./charts/catalyst

# Then update CRDs
./charts/catalyst/scripts/update-crds.sh
```

The script extracts CloudNativePG CRDs from the subchart and copies Catalyst operator CRDs from the operator directory.

## Usage

### Installation

```bash
# Update dependencies before installing
helm dependency update ./charts/catalyst

# Update CRDs (required after dependency updates)
./charts/catalyst/scripts/update-crds.sh

# Install the chart
helm install catalyst ./charts/catalyst --namespace catalyst-system --create-namespace

# Install with custom image
helm install catalyst ./charts/catalyst \
  --namespace catalyst-system \
  --create-namespace \
  --set web.image.repository=ghcr.io/ncrmro/catalyst/web \
  --set web.image.tag=latest
```

### Configuration

#### Web Application

```yaml
web:
  enabled: true
  replicaCount: 1
  image:
    repository: ghcr.io/ncrmro/catalyst/web
    tag: latest
    pullPolicy: IfNotPresent
  service:
    type: ClusterIP
    port: 3000
  ingress:
    enabled: false
    className: nginx
    hosts:
      - host: catalyst.example.com
        paths:
          - path: /
            pathType: Prefix
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
  env: []
  envFrom: []
```

#### Ingress NGINX

```yaml
ingress-nginx:
  controller:
    service:
      type: LoadBalancer
    ingressClassResource:
      default: true
```

#### Cert-Manager

```yaml
cert-manager:
  installCRDs: true
```

#### PostgreSQL Cluster

```yaml
postgresql:
  enabled: true
  name: catalyst-db
  instances: 1
  storage:
    size: 10Gi
    storageClass: ""
  database: catalyst
  owner: catalyst
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1Gi
      cpu: 500m
```

### Database Connection

The web application automatically connects to the PostgreSQL cluster using the secret created by CloudNativePG:

- **Secret**: `catalyst-db-app` contains the `uri` key with the full connection string
- **Services**: `catalyst-db-rw` (read-write), `catalyst-db-ro` (read-only)

### Deployment Flow

1. CloudNativePG operator is installed
2. PostgreSQL cluster is created
3. Web deployment waits for database to be ready (init container)
4. Database migrations run (init container)
5. Web application starts

## Production Considerations

1. **High Availability**: Set `postgresql.instances: 3` and `web.replicaCount: 2+`
2. **Ingress**: Enable `web.ingress.enabled: true` with proper host configuration
3. **TLS**: Configure cert-manager issuers and ingress TLS
4. **Storage**: Configure appropriate `storageClass` for your environment
5. **Secrets**: Pass sensitive environment variables via `web.envFrom` referencing external secrets

## Development Environment Init Containers

When the operator creates a development environment pod, it runs three init containers in sequence before the main web container starts. All init containers share a `/code` PVC (PersistentVolumeClaim):

1. **`git-clone`**: Clones the repository branch into the shared PVC. Uses a git credential helper that fetches tokens from the web server's `/api/git-token/:installationId` endpoint.
2. **`npm-install`**: Runs `npm ci` in the cloned repository to install dependencies.
3. **`db-migrate`**: Runs `npm run db:migrate` to apply database migrations. This requires network access to the postgres service in the same namespace — if a NetworkPolicy blocks intra-namespace traffic, this step fails with `ETIMEDOUT`.

Kubernetes enforces init container ordering: each must exit successfully before the next starts.

## Resource Requirements

| Container  | Memory Limit | Notes                                                  |
| ---------- | ------------ | ------------------------------------------------------ |
| Web        | 2Gi          | `next dev --turbopack` OOMKills at 1Gi (exit code 137) |
| PostgreSQL | 512Mi        | Standard postgres workload                             |

**Namespace totals** (set via ResourceQuota):

- Memory limits: 8Gi
- CPU limits: 4

## License

See the parent project license for more information.
