# Catalyst Helm Chart

This Helm chart deploys the Catalyst platform, including the web application and all infrastructure components (ingress-nginx, cert-manager, CloudNativePG operator, PostgreSQL database, and Istio service mesh).

## Components

- **Web Application**: Next.js application with database migrations
- **ingress-nginx**: v4.11.3 - Kubernetes Ingress controller
- **cert-manager**: v1.18.2 - Certificate management for Kubernetes
- **cloudnative-pg**: v0.23.0 - CloudNativePG operator for PostgreSQL
- **PostgreSQL**: CloudNativePG cluster for the web database
- **Istio**: v1.24.2 - Service mesh for mTLS, traffic management, and observability
  - **istio-base**: Core CRDs and resources
  - **istiod**: Control plane for service mesh management

## CRD Management

This chart includes CRDs for CloudNativePG and the Catalyst operator in the `crds/` directory. Helm installs CRDs from this directory before templates, ensuring proper ordering.

**Note**: Istio CRDs are managed by the `istio-base` subchart, not in the parent chart's `crds/` directory. This allows Istio to properly manage CRD lifecycle and upgrades according to Istio's own versioning and compatibility requirements.

### Updating CRDs

After updating chart dependencies or modifying operator CRDs, run the update script:

```bash
# First update Helm dependencies
helm dependency update ./charts/catalyst

# Then update CRDs (CloudNativePG and Catalyst operator)
./charts/catalyst/scripts/update-crds.sh
```

The script extracts CloudNativePG CRDs from the subchart and copies Catalyst operator CRDs from the operator directory. Istio CRDs are automatically managed by the istio-base subchart.

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

#### Istio Service Mesh

The chart includes Istio service mesh with automatic mTLS enabled for secure pod-to-pod communication.

```yaml
istio-base:
  enabled: true

istiod:
  enabled: true
  meshConfig:
    enableAutoMtls: true  # Automatically enables mTLS when both sides support it (PERMISSIVE mode)
  pilot:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

**Istio Features Enabled:**
- **Automatic mTLS (PERMISSIVE mode)**: Service-to-service communication automatically upgrades to mTLS when both sides support it, while still allowing plain-text connections for compatibility
- **Traffic Management**: Advanced routing, load balancing, and traffic control
- **Observability**: Built-in metrics, logs, and tracing for all mesh traffic

**Note**: By default, Istio is configured in PERMISSIVE mode, which allows both mTLS and plain-text traffic. For production deployments, consider enforcing STRICT mTLS mode (see below).

**To enable Istio sidecar injection for a namespace:**
```bash
kubectl label namespace <namespace> istio-injection=enabled
```

**To enable Istio for specific workloads**, add the following annotation to your deployment:
```yaml
metadata:
  annotations:
    sidecar.istio.io/inject: "true"
```

**To enforce STRICT mTLS mode** (recommended for production), create a PeerAuthentication policy:
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: <your-namespace>
spec:
  mtls:
    mode: STRICT
```

This ensures that only mTLS connections are accepted, rejecting any plain-text traffic. See `examples/istio-strict-mtls.yaml` for a ready-to-use example.

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
3. **TLS**: Configure cert-manager issuers and ingress TLS (see section below)
4. **Storage**: Configure appropriate `storageClass` for your environment
5. **Secrets**: Pass sensitive environment variables via `web.envFrom` referencing external secrets
6. **Istio Service Mesh**:
   - Enable sidecar injection for namespaces with workloads: `kubectl label namespace <namespace> istio-injection=enabled`
   - Configure PeerAuthentication policies for stricter mTLS enforcement if needed
   - Monitor mesh traffic using Istio's built-in observability tools (Kiali, Jaeger, Grafana)
   - Adjust `istiod.pilot.resources` based on the number of services in your mesh

## Production Certificate Setup

For production and preview environments (e.g., `*.preview.tetraship.app`), we use a wildcard certificate managed by cert-manager using the Cloudflare DNS-01 challenge.

### Cloudflare Permissions
You need a Cloudflare API Token with the following permissions for the target zone:
- **Zone / Zone / Read**
- **Zone / DNS / Edit**

### Manual Setup Steps

1. **Create the Cloudflare Secret**:
   ```bash
   kubectl create secret generic cloudflare-api-token-secret \
     --from-literal=api-token=<YOUR_CLOUDFLARE_API_TOKEN> \
     -n catalyst-system
   ```

2. **Apply Certificate Manifests**:
   The certificate configuration is excluded from the Helm chart (via `.helmignore`) because it is specific to the managed Tetraship environment (`*.preview.tetraship.app`). Open-source users should configure their own `ClusterIssuer` and `Certificate` resources according to their DNS provider and domain.

   For the managed environment:
   ```bash
   kubectl apply -f charts/catalyst/certs.yaml
   ```
   *Note: This file contains the `ClusterIssuer` and wildcard `Certificate` resources.*

3. **Configure Ingress Controller**:
   Ensure `values.production.yaml` sets the default SSL certificate for the ingress controller:

   ```yaml
   ingress-nginx:
     controller:
       extraArgs:
         default-ssl-certificate: "catalyst-system/wildcard-preview-tetraship-app-tls"
   ```

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
