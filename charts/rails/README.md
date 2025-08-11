# Rails Helm Chart

This Helm chart deploys a Rails application on Kubernetes with optional database and Redis support.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PostgreSQL operator (CloudNativePG) if using managed database
- Redis operator if using managed Redis

## Installing the Chart

To install the chart with the release name `my-rails-app`:

```bash
helm install my-rails-app ./charts/rails
```

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
| `image.repository` | Rails image repository | `ruby` |
| `image.tag` | Rails image tag | `3.2.3-slim` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Rails Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rails.env` | Environment variables for Rails | `[{name: "RAILS_ENV", value: "production"}, {name: "PORT", value: "80"}]` |
| `rails.envFrom` | Environment variables from secrets/configmaps | `[]` |
| `rails.database.enabled` | Enable managed PostgreSQL database | `false` |
| `rails.database.name` | Database name | `myapp_production` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `80` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.hosts` | Ingress hosts configuration | `[{host: "chart-example.local", paths: [{path: "/", pathType: "ImplementationSpecific"}]}]` |

### Resource Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `1000m` |
| `resources.limits.memory` | Memory limit | `1Gi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.requests.memory` | Memory request | `256Mi` |

### Background Jobs

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sidekiq.enabled` | Enable Sidekiq background job processing | `false` |
| `sidekiq.replicaCount` | Number of Sidekiq workers | `1` |
| `redis.enabled` | Enable managed Redis for jobs and cache | `false` |

## Example Values

```yaml
# Custom Rails image built from Catalyst Dockerfiles
image:
  repository: ghcr.io/myorg/my-rails-app
  tag: "v1.0.0"

# Enable database and Redis
rails:
  database:
    enabled: true
    name: myapp_production
  env:
    - name: RAILS_ENV
      value: "production"
    - name: SECRET_KEY_BASE
      valueFrom:
        secretKeyRef:
          name: rails-secrets
          key: secret_key_base

redis:
  enabled: true

# Enable background job processing
sidekiq:
  enabled: true
  replicaCount: 2

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

The chart includes health checks that probe the `/health` endpoint on port 80. Make sure your Rails application includes a health check route:

```ruby
# config/routes.rb
Rails.application.routes.draw do
  get '/health', to: 'health#show'
end

# app/controllers/health_controller.rb
class HealthController < ApplicationController
  def show
    render json: { status: 'ok' }, status: 200
  end
end
```

## Database Migrations

The chart includes an optional job for running database migrations. Set `migrations.enabled: true` to run migrations before the main application starts.

## Background Jobs

The chart supports Sidekiq for background job processing. Enable it by setting `sidekiq.enabled: true` and `redis.enabled: true`.

## Notes

- This chart assumes your Rails application is containerized and listens on port 80
- The default image is `ruby:3.2.3-slim` which is suitable for custom Rails builds
- Environment variables can be customized via the `rails.env` values
- The chart supports horizontal pod autoscaling when `autoscaling.enabled` is set to `true`
- Database and Redis can be managed by Kubernetes operators when enabled