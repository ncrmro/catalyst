# Rails Helm Chart - Quick Reference

## Installation

### Basic Deployment
```bash
helm install my-rails-app charts/rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0
```

### With Workers
```bash
helm install my-rails-app charts/rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0 \
  --set worker.enabled=true \
  --set redis.enabled=true
```

### Preview Environment
```bash
helm install pr-123 charts/rails \
  --values charts/rails/examples/values-preview.yaml \
  --set image.repository=my-rails-app \
  --set image.tag=pr-123
```

## Configuration Checklist

### Required
- [ ] `image.repository` - Your Rails Docker image
- [ ] `image.tag` - Image version/tag

### Optional
- [ ] `postgresql.enabled` - Enable PostgreSQL (default: true)
- [ ] `redis.enabled` - Enable Redis (default: false)
- [ ] `worker.enabled` - Enable SolidQueue workers (default: false)
- [ ] `rails.migrations.enabled` - Run migrations (default: true)
- [ ] `ingress.enabled` - Expose via ingress (default: false)
- [ ] `autoscaling.enabled` - Enable HPA (default: false)

## Environment Variables

### Automatic (from secrets)
- `DATABASE_URL` - PostgreSQL connection string (if enabled)
- `REDIS_URL` - Redis connection string (if enabled)

### Default Rails Config
- `RAILS_ENV=production`
- `PORT=3000`
- `RAILS_LOG_TO_STDOUT=true`
- `RAILS_SERVE_STATIC_FILES=true`

### Custom Variables
```yaml
rails:
  env:
    - name: SECRET_KEY_BASE
      valueFrom:
        secretKeyRef:
          name: rails-secrets
          key: secret-key-base
```

## Health Checks

Default endpoint: `/up` (Rails 7.1+)

Custom endpoints:
```yaml
rails:
  healthCheck:
    livenessPath: /health/live
    readinessPath: /health/ready
```

## Database Migrations

Migrations run as init container before app starts:
```yaml
rails:
  migrations:
    enabled: true
    command: ["rails", "db:migrate"]
```

To disable migrations:
```yaml
rails:
  migrations:
    enabled: false
```

## Worker Configuration

Enable SolidQueue workers:
```yaml
worker:
  enabled: true
  replicaCount: 2
  command: ["bundle", "exec", "rake", "solid_queue:start"]
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 256Mi
```

## Resource Limits

### Default Web Pod
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### Preview Environment (minimal)
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### Production (recommended)
```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 256Mi
```

## Scaling

### Manual Replicas
```yaml
replicaCount: 3
```

### Autoscaling
```yaml
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## PostgreSQL Configuration

### Default
```yaml
postgresql:
  enabled: true
  auth:
    username: rails
    database: rails_production
    existingSecret: rails-database
```

### Custom Resources
```yaml
postgresql:
  primary:
    persistence:
      size: 10Gi
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
```

## Redis Configuration

### Enable Redis
```yaml
redis:
  enabled: true
  auth:
    existingSecret: rails-redis
```

### Custom Resources
```yaml
redis:
  master:
    persistence:
      size: 5Gi
    resources:
      limits:
        cpu: 250m
        memory: 256Mi
```

## Ingress Configuration

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: rails-tls
      hosts:
        - app.example.com
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n <namespace>
```

### View Logs
```bash
# App logs
kubectl logs -n <namespace> -l app.kubernetes.io/name=rails

# Worker logs
kubectl logs -n <namespace> -l app.kubernetes.io/component=worker

# Migration logs
kubectl logs -n <namespace> <pod-name> -c migrate
```

### Debug Pod
```bash
kubectl describe pod -n <namespace> <pod-name>
```

### Test Database Connection
```bash
kubectl exec -n <namespace> <pod-name> -- rails runner "puts ActiveRecord::Base.connection.active?"
```

### Port Forward
```bash
kubectl port-forward -n <namespace> <pod-name> 3000:3000
```

## Common Issues

### CrashLoopBackOff
- Check logs for Ruby/Rails errors
- Verify DATABASE_URL is set correctly
- Ensure SECRET_KEY_BASE is configured
- Check health check endpoint responds

### Migration Failures
- Check migration logs in init container
- Verify database connectivity
- Ensure database schema is compatible

### Worker Not Starting
- Verify `worker.enabled=true`
- Check worker logs for errors
- Ensure Redis is enabled if required
- Verify DATABASE_URL is accessible

### Image Pull Errors
- Verify image repository and tag exist
- Check imagePullSecrets if using private registry
- Ensure cluster has network access to registry

## Integration with Catalyst

The chart is designed to work with Catalyst Environment CRs:

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: rails-app-prod
spec:
  projectRef:
    name: my-rails-project
  type: deployment
  deploymentMode: production
  sources:
    - name: app
      commitSha: abc123
      branch: main
```

The operator handles:
- Namespace creation and isolation
- Image building (if needed)
- Helm chart deployment
- Service exposure
- Resource management

## Next Steps

1. Build your Rails Docker image
2. Push to container registry
3. Deploy using helm install
4. Verify deployment with `kubectl get pods`
5. Check logs with `kubectl logs`
6. Run helm test: `helm test <release-name>`
7. Access application via ingress or port-forward

For more details, see:
- [README.md](README.md) - Full documentation
- [TESTING.md](TESTING.md) - Testing guide
- [examples/](examples/) - Example configurations
