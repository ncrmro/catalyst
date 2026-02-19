# Rails Helm Chart

This Helm chart deploys a Ruby on Rails application on Kubernetes with optional PostgreSQL database and Redis support.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+

## Installing the Chart

To install the chart with the release name `my-rails-app`:

```bash
# You must specify your Rails application image
helm install my-rails-app ./charts/rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0
```

**Important**: You must provide a containerized Rails application image. The chart does not work with the base Ruby image.

## Uninstalling the Chart

To uninstall the deployment:

```bash
helm delete my-rails-app
```

## Configuration

The following table lists the configurable parameters of the Rails chart and their default values.

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Rails image repository | `""` (required) |
| `image.tag` | Rails image tag | `""` (uses chart appVersion if not set) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Rails Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rails.env` | Environment variables for Rails | `[{name: "RAILS_ENV", value: "production"}, {name: "PORT", value: "3000"}, {name: "RAILS_LOG_TO_STDOUT", value: "true"}, {name: "RAILS_SERVE_STATIC_FILES", value: "true"}]` |
| `rails.envFrom` | Environment variables from secrets/configmaps | `[]` |
| `rails.migrations.enabled` | Enable database migrations as init container | `true` |
| `rails.migrations.command` | Command to run migrations | `["rails", "db:migrate"]` |
| `rails.healthCheck.livenessPath` | Liveness probe endpoint | `/up` |
| `rails.healthCheck.readinessPath` | Readiness probe endpoint | `/up` |

### Worker Configuration (SolidQueue)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `worker.enabled` | Enable worker deployment | `false` |
| `worker.replicaCount` | Number of worker replicas | `1` |
| `worker.env` | Worker-specific environment variables | `[]` |
| `worker.command` | Worker command | `["bundle", "exec", "rake", "solid_queue:start"]` |
| `worker.resources` | Worker resource limits/requests | See values.yaml |

### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL subchart | `true` |
| `postgresql.auth.username` | PostgreSQL username | `rails` |
| `postgresql.auth.database` | PostgreSQL database name | `rails_production` |
| `postgresql.auth.password` | PostgreSQL password (auto-generated if empty) | `""` |
| `postgresql.auth.existingSecret` | Existing secret containing PostgreSQL password | `rails-database` |
| `postgresql.primary.persistence.enabled` | Enable PostgreSQL persistence | `true` |
| `postgresql.primary.persistence.size` | PostgreSQL storage size | `1Gi` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis subchart | `false` |
| `redis.auth.password` | Redis password (auto-generated if empty) | `""` |
| `redis.auth.existingSecret` | Existing secret containing Redis password | `rails-redis` |
| `redis.master.persistence.enabled` | Enable Redis persistence | `true` |
| `redis.master.persistence.size` | Redis storage size | `1Gi` |

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

### Basic Deployment with PostgreSQL

```yaml
# Custom Rails image
image:
  repository: my-rails-app
  tag: "v1.0.0"

# Custom environment variables
rails:
  env:
    - name: RAILS_ENV
      value: "production"
    - name: SECRET_KEY_BASE
      valueFrom:
        secretKeyRef:
          name: rails-secrets
          key: secret-key-base

# PostgreSQL configuration
postgresql:
  enabled: true
  auth:
    password: "mySecurePassword"
  primary:
    persistence:
      size: 5Gi
```

### Deployment with Workers and Redis

```yaml
image:
  repository: my-rails-app
  tag: "v1.0.0"

# Enable Redis for SolidQueue
redis:
  enabled: true
  auth:
    password: "myRedisPassword"

# Enable SolidQueue workers
worker:
  enabled: true
  replicaCount: 2
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 256Mi
```

### Production Deployment with Ingress

```yaml
image:
  repository: my-rails-app
  tag: "v1.0.0"

# Enable ingress
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: my-app-tls
      hosts:
        - my-app.example.com

# Scale to multiple replicas
replicaCount: 3

# Enable autoscaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## Database Integration

When PostgreSQL is enabled (`postgresql.enabled: true`), the chart automatically:

1. **Deploys PostgreSQL**: Uses the Bitnami PostgreSQL subchart
2. **Creates Database User**: Sets up a `rails` user with access to the `rails_production` database
3. **Generates Secrets**: Creates a Kubernetes secret with a randomly generated password and DATABASE_URL
4. **Runs Migrations**: Uses an init container to run database migrations before starting the application
5. **Configures Environment**: Injects the DATABASE_URL environment variable into the Rails container

The DATABASE_URL format is: `postgresql://rails:password@postgresql.namespace.svc.cluster.local:5432/rails_production`

## Redis Integration

When Redis is enabled (`redis.enabled: true`), the chart automatically:

1. **Deploys Redis**: Uses the Bitnami Redis subchart
2. **Generates Secrets**: Creates a Kubernetes secret with a randomly generated password and REDIS_URL
3. **Configures Environment**: Injects the REDIS_URL environment variable into Rails containers

The REDIS_URL format is: `redis://:password@redis-master.namespace.svc.cluster.local:6379/0`

Redis is typically used for:
- ActionCable (WebSockets)
- SolidQueue (background jobs)
- Rails cache store
- Session store

## Worker Deployment (SolidQueue)

SolidQueue is Rails 8's default background job processor. To enable workers:

```yaml
worker:
  enabled: true
  replicaCount: 2
```

Workers are deployed as a separate Deployment that runs the `solid_queue:start` rake task. They share the same environment variables as the web application (including DATABASE_URL and REDIS_URL).

**Note**: SolidQueue requires both PostgreSQL (for job storage) and optionally Redis (for pub/sub).

## Health Checks

The chart includes health checks that probe the `/up` endpoint (Rails 7.1+ default health check). Make sure your Rails application responds to HTTP requests on this endpoint.

To customize health check paths:

```yaml
rails:
  healthCheck:
    livenessPath: /health/live
    readinessPath: /health/ready
```

## Database Migrations

Database migrations run automatically as an init container before the Rails application starts. To disable migrations:

```yaml
rails:
  migrations:
    enabled: false
```

To customize the migration command:

```yaml
rails:
  migrations:
    command: ["bundle", "exec", "rails", "db:migrate"]
```

## Preview Environments

This chart is designed to work with Catalyst's preview environment system. When deployed via the Catalyst operator:

1. The operator creates an Environment CR with the chart reference
2. The chart is deployed to a namespaced environment
3. Database and Redis instances are isolated per environment
4. Migrations run automatically on deployment

Example Environment CR:

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: my-rails-pr-123
spec:
  projectRef:
    name: my-rails-project
  type: development
  deploymentMode: production
  sources:
    - name: app
      commitSha: abc123
      branch: feature-branch
      prNumber: 123
```

## Production Deployment

For production deployments via Catalyst:

1. Set `replicaCount` to desired number of pods
2. Enable autoscaling for dynamic scaling
3. Configure resource limits appropriately
4. Use persistent storage for PostgreSQL
5. Enable ingress with TLS
6. Consider enabling Redis for performance

## Helm Tests

The chart includes a basic connectivity test that can be run with:

```bash
helm test my-rails-app
```

This test verifies that the Rails service is accessible and responding to health check requests.

## Notes

- **This chart requires a containerized Rails application** - you must provide your own built Rails image
- The Rails application must include database migration capabilities (`rails db:migrate` command)
- The application should listen on port 3000 and respond to HTTP health checks on `/up`
- Environment variables can be customized via the `rails.env` values
- The chart supports horizontal pod autoscaling when `autoscaling.enabled` is set to `true`
- When PostgreSQL is enabled, database migrations run automatically before the application starts
- PostgreSQL and Redis passwords are auto-generated if not specified and stored in Kubernetes secrets
- Workers (SolidQueue) are optional and disabled by default - enable them when you need background job processing
