# Rails Helm Chart

This Helm chart deploys a Ruby on Rails application on Kubernetes with optional PostgreSQL database, Redis cache, and SolidQueue background job processing.

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
| `rails.env` | Environment variables for Rails | `[{name: "RAILS_ENV", value: "production"}, ...]` |
| `rails.envFrom` | Environment variables from secrets/configmaps | `[]` |
| `rails.secretKeyBase` | Rails SECRET_KEY_BASE (auto-generated if empty) | `""` |

### Worker Configuration (SolidQueue)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `worker.enabled` | Enable worker deployment for background jobs | `false` |
| `worker.replicaCount` | Number of worker replicas | `1` |
| `worker.env` | Additional environment variables for workers | `[]` |
| `worker.resources` | Resource limits for workers | See values.yaml |

**Note**: Rails 8 uses SolidQueue by default for background job processing. For older Rails versions using Sidekiq, you'll need to modify the worker command in `worker-deployment.yaml`.

### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL subchart | `true` |
| `postgresql.auth.username` | PostgreSQL username | `rails` |
| `postgresql.auth.database` | PostgreSQL database name | `rails_production` |
| `postgresql.auth.password` | PostgreSQL password (auto-generated if empty) | `""` |
| `postgresql.primary.persistence.enabled` | Enable PostgreSQL persistence | `true` |
| `postgresql.primary.persistence.size` | PostgreSQL storage size | `1Gi` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis subchart | `false` |
| `redis.auth.password` | Redis password (auto-generated if empty) | `""` |
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

### Health Check Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `livenessProbe.httpGet.path` | Liveness probe path | `/up` |
| `readinessProbe.httpGet.path` | Readiness probe path | `/up` |

## Example Values

### Basic Rails Application

```yaml
# Custom Rails image
image:
  repository: my-rails-app
  tag: "v1.0.0"

# Rails environment variables
rails:
  env:
    - name: RAILS_ENV
      value: "production"
    - name: RAILS_LOG_TO_STDOUT
      value: "true"

# PostgreSQL configuration
postgresql:
  enabled: true
  auth:
    password: "mySecurePassword"
  primary:
    persistence:
      size: 5Gi
```

### Rails with Redis and Workers

```yaml
# Rails image
image:
  repository: my-rails-app
  tag: "v1.0.0"

# Enable Redis for caching/ActionCable
redis:
  enabled: true

# Enable SolidQueue workers
worker:
  enabled: true
  replicaCount: 2
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
```

### Rails with Ingress

```yaml
# Rails image
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

# Scale to multiple replicas
replicaCount: 3
```

## Database Integration

When PostgreSQL is enabled (`postgresql.enabled: true`), the chart automatically:

1. **Deploys PostgreSQL**: Uses the Bitnami PostgreSQL subchart
2. **Creates Database User**: Sets up a `rails` user with access to the `rails_production` database
3. **Generates Secrets**: Creates a Kubernetes secret with randomly generated passwords and DATABASE_URL
4. **Runs Migrations**: Uses an init container to run `rails db:migrate` before starting the application
5. **Configures Environment**: Injects the DATABASE_URL environment variable into the Rails container

The DATABASE_URL format is: `postgresql://rails:password@postgresql.namespace.svc.cluster.local:5432/rails_production`

## Redis Integration

When Redis is enabled (`redis.enabled: true`), the chart automatically:

1. **Deploys Redis**: Uses the Bitnami Redis subchart
2. **Generates Secrets**: Creates a Kubernetes secret with Redis password and REDIS_URL
3. **Configures Environment**: Injects the REDIS_URL environment variable into both web and worker containers

The REDIS_URL format is: `redis://:password@redis-master:6379/0`

Use cases for Redis in Rails:
- **Caching**: Configure Rails to use Redis as the cache store
- **ActionCable**: WebSocket connections for real-time features
- **Session Store**: Store user sessions in Redis
- **SolidQueue**: Rails 8 background job processing (requires PostgreSQL, Redis is optional)

## Background Jobs (SolidQueue)

Rails 8 includes SolidQueue as the default background job processor, which uses PostgreSQL for job storage (no Redis required for basic operation).

### Enabling Workers

```yaml
worker:
  enabled: true
  replicaCount: 2
```

### Worker Configuration

The worker deployment runs the command: `bundle exec rails solid_queue:start`

For older Rails versions using Sidekiq, you'll need to:
1. Enable Redis: `redis.enabled: true`
2. Modify the worker command in `templates/worker-deployment.yaml` to: `bundle exec sidekiq`

## Health Checks

The chart includes default health checks that probe the `/up` endpoint (standard in Rails 7+) on port 3000. 

For older Rails versions, you may need to:
1. Add a health check endpoint to your application
2. Update the probe paths in values.yaml:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
readinessProbe:
  httpGet:
    path: /health
    port: http
```

## Asset Precompilation

Rails assets should be precompiled as part of your Docker image build process, not at runtime. Your Dockerfile should include:

```dockerfile
# Example Dockerfile for Rails
FROM ruby:3.3

# Install dependencies
RUN apt-get update -qq && apt-get install -y nodejs postgresql-client

# Set working directory
WORKDIR /app

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy application code
COPY . .

# Precompile assets
RUN bundle exec rails assets:precompile

# Expose port
EXPOSE 3000

# Start Rails server
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

## Database Migrations

Database migrations run automatically before the application starts via an init container. The migration command is: `bundle exec rails db:migrate`

If migrations fail, the pod will not start. You can check migration logs:

```bash
kubectl logs <pod-name> -c migrate
```

## Environment Variables

### Required Environment Variables

The chart automatically provides:
- `DATABASE_URL`: PostgreSQL connection string (if PostgreSQL is enabled)
- `SECRET_KEY_BASE`: Rails secret key (auto-generated)
- `REDIS_URL`: Redis connection string (if Redis is enabled)

### Additional Environment Variables

Add custom environment variables via `rails.env`:

```yaml
rails:
  env:
    - name: RAILS_ENV
      value: "production"
    - name: SMTP_ADDRESS
      value: "smtp.example.com"
    - name: ALLOWED_HOSTS
      value: "example.com,www.example.com"
```

### Environment Variables from Secrets

For sensitive data, use `rails.envFrom`:

```yaml
rails:
  envFrom:
    - secretRef:
        name: my-secret
```

## Scaling

### Horizontal Pod Autoscaling

Enable autoscaling based on CPU/Memory usage:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### Manual Scaling

Scale application replicas:

```bash
kubectl scale deployment my-rails-app --replicas=5
```

Scale worker replicas:

```bash
kubectl scale deployment my-rails-app-worker --replicas=3
```

## Deployment Strategies

### Preview Environments (PR-driven)

This chart integrates with Catalyst's Environment CR for automatic preview environment creation:

1. When a PR is opened, the operator creates an Environment CR
2. The Environment CR references this chart via the Project template
3. The chart deploys a full Rails application with database for that PR
4. When the PR is closed, the environment is automatically cleaned up

### Production Deployment

For production deployments:

```yaml
replicaCount: 3

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

postgresql:
  primary:
    persistence:
      size: 50Gi

worker:
  enabled: true
  replicaCount: 2

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
```

## Troubleshooting

### Pod Won't Start

1. Check init container (migration) logs:
   ```bash
   kubectl logs <pod-name> -c migrate
   ```

2. Check application logs:
   ```bash
   kubectl logs <pod-name>
   ```

3. Check pod events:
   ```bash
   kubectl describe pod <pod-name>
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   kubectl get pods | grep postgresql
   ```

2. Check DATABASE_URL secret:
   ```bash
   kubectl get secret rails-database -o jsonpath='{.data.DATABASE_URL}' | base64 -d
   ```

3. Test database connection from pod:
   ```bash
   kubectl exec -it <pod-name> -- rails dbconsole
   ```

### Worker Not Processing Jobs

1. Check worker logs:
   ```bash
   kubectl logs deployment/my-rails-app-worker
   ```

2. Verify database connection (SolidQueue requires PostgreSQL)

3. Check job queue in Rails console:
   ```bash
   kubectl exec -it <pod-name> -- rails console
   # In console: SolidQueue::Job.count
   ```

### Asset Loading Issues

If assets are not loading:

1. Ensure assets are precompiled in Docker image
2. Set `RAILS_SERVE_STATIC_FILES=true` (already set by default)
3. Check asset paths in browser developer tools

## Notes

- **This chart requires a containerized Rails application** - you must provide your own built Rails image
- The Rails application must include database migration capabilities (`rails db:migrate` command)
- The application should respond to HTTP health checks on the `/up` endpoint (Rails 7+) or provide a custom health endpoint
- Environment variables can be customized via the `rails.env` values
- The chart supports horizontal pod autoscaling when `autoscaling.enabled` is set to `true`
- When PostgreSQL is enabled, database migrations run automatically before the application starts
- The PostgreSQL and Redis passwords are auto-generated if not specified and stored in Kubernetes secrets
- SolidQueue (Rails 8) uses PostgreSQL for job storage - Redis is optional for caching/ActionCable
