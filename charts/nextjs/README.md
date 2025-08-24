# NextJS Helm Chart

This Helm chart deploys a NextJS application on Kubernetes with optional PostgreSQL database support.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+

## Installing the Chart

To install the chart with the release name `my-nextjs-app`:

```bash
# You must specify your NextJS application image
helm install my-nextjs-app ./charts/nextjs \
  --set image.repository=my-nextjs-app \
  --set image.tag=v1.0.0
```

**Important**: You must provide a containerized NextJS application image. The chart does not work with the base Node.js image.

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
| `image.repository` | NextJS image repository | `""` (required) |
| `image.tag` | NextJS image tag | `""` (uses chart appVersion if not set) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Development Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `developmentImage.repository` | Development image repository for helm tests | `node` |
| `developmentImage.tag` | Development image tag for helm tests | `Chart.AppVersion` |
| `developmentImage.pullPolicy` | Development image pull policy for helm tests | `IfNotPresent` |

### E2E Tests Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `e2eTests.image.repository` | E2E test image repository | `""` (required when using E2E tests) |
| `e2eTests.image.tag` | E2E test image tag | `Chart.AppVersion` |
| `e2eTests.image.pullPolicy` | E2E test image pull policy | `IfNotPresent` |
| `e2eTests.smokeOnly` | Run only smoke tests | `true` |
| `e2eTests.testFiles` | Custom test files to run | `[]` |
| `e2eTests.env` | Additional environment variables for E2E tests | `[]` |
| `e2eTests.resources` | Resource limits for E2E test pod | See values.yaml |

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

## Helm Tests

The chart includes two types of tests that can be run with `helm test`:

### Connection Test
A basic connectivity test that verifies the NextJS service is accessible:
```bash
helm test my-nextjs-app
```

### E2E Tests
Advanced end-to-end tests using Playwright that validate application functionality:

**Prerequisites:**
- A container image built with E2E test capabilities (see `web/Dockerfile.e2e`)
- The E2E test image must be specified in values

**Configuration:**
```yaml
e2eTests:
  image:
    repository: my-nextjs-app-e2e
    tag: v1.0.0
  smokeOnly: true  # Run only smoke tests (recommended)
  
  # Alternative: specify custom test files
  # smokeOnly: false
  # testFiles:
  #   - "__tests__/e2e/smoke.spec.ts"
  #   - "__tests__/e2e/teams.spec.ts"
```

**Running E2E Tests:**
```bash
# Run all tests (including E2E)
helm test my-nextjs-app

# Run only E2E tests
helm test my-nextjs-app --filter name=*e2e*
```

**Building E2E Test Image:**
```bash
cd web
docker build -f Dockerfile.e2e -t my-nextjs-app-e2e:v1.0.0 .
```

The E2E tests run against the deployed NextJS service and validate:
- Application loading and basic functionality
- Authentication flows
- Core page navigation
- API endpoint accessibility

## Notes

- **This chart requires a containerized NextJS application** - you must provide your own built NextJS image
- The NextJS application must include database migration capabilities (`npm run db:migrate` command)
- The application should listen on port 3000 and respond to HTTP health checks on the root path (`/`)
- Environment variables can be customized via the `nextjs.env` values
- The chart supports horizontal pod autoscaling when `autoscaling.enabled` is set to `true`
- When PostgreSQL is enabled, database migrations run automatically before the application starts
- The PostgreSQL password is auto-generated if not specified and stored in a Kubernetes secret