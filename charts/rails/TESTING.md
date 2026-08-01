# Testing the Rails Helm Chart

This document provides instructions for testing the Rails Helm chart locally.

## Prerequisites

- Kubernetes cluster (kind, k3s, or similar)
- Helm 3.2.0+
- A containerized Rails application

## Quick Test (Structure Validation)

Verify the chart structure is valid:

```bash
# Lint the chart
helm lint charts/rails

# Render templates without deploying
helm template test-release charts/rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0
```

## Test with PostgreSQL Only

```bash
# Create test namespace
kubectl create namespace test-rails

# Install with PostgreSQL
helm install test-rails-app charts/rails \
  --namespace test-rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0 \
  --wait --timeout=5m

# Check deployment status
kubectl get pods -n test-rails

# View logs
kubectl logs -n test-rails -l app.kubernetes.io/name=rails

# Run helm test
helm test test-rails-app -n test-rails

# Clean up
helm uninstall test-rails-app -n test-rails
kubectl delete namespace test-rails
```

## Test with Redis and Workers

```bash
kubectl create namespace test-rails

helm install test-rails-app charts/rails \
  --namespace test-rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0 \
  --set redis.enabled=true \
  --set worker.enabled=true \
  --set worker.replicaCount=2 \
  --wait --timeout=5m

# Check all pods are running
kubectl get pods -n test-rails

# View worker logs
kubectl logs -n test-rails -l app.kubernetes.io/component=worker

# Clean up
helm uninstall test-rails-app -n test-rails
kubectl delete namespace test-rails
```

## Test Preview Environment Configuration

```bash
kubectl create namespace preview-pr-123

helm install rails-pr-123 charts/rails \
  --namespace preview-pr-123 \
  --values charts/rails/examples/values-preview.yaml \
  --set image.repository=my-rails-app \
  --set image.tag=pr-123 \
  --wait --timeout=5m

kubectl get pods -n preview-pr-123

helm uninstall rails-pr-123 -n preview-pr-123
kubectl delete namespace preview-pr-123
```

## Test Production Configuration

```bash
kubectl create namespace production

helm install rails-production charts/rails \
  --namespace production \
  --values charts/rails/examples/values-production.yaml \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0 \
  --wait --timeout=5m

kubectl get pods -n production

helm uninstall rails-production -n production
kubectl delete namespace production
```

## Troubleshooting

### Pod is CrashLooping

Check the pod logs:
```bash
kubectl logs -n <namespace> <pod-name>
```

### PostgreSQL Image Pull Error

The PostgreSQL subchart version may need updating. Check:
```bash
helm show values charts/rails/charts/postgresql
```

### Database Migrations Failing

Check init container logs:
```bash
kubectl logs -n <namespace> <pod-name> -c migrate
```

### Health Check Failing

Verify your Rails app responds to `/up`:
```bash
kubectl port-forward -n <namespace> <pod-name> 3000:3000
curl http://localhost:3000/up
```

## Building a Test Rails Application

If you need a simple Rails app to test with:

```bash
# Create a new Rails app
rails new test-app --database=postgresql --skip-test

cd test-app

# Add Dockerfile
cat > Dockerfile <<'EOF'
FROM ruby:3.3-alpine

RUN apk add --no-cache \
  build-base \
  postgresql-dev \
  nodejs \
  npm

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

RUN rails assets:precompile

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
EOF

# Build and push image
docker build -t your-registry/test-rails-app:latest .
docker push your-registry/test-rails-app:latest

# Deploy with Helm
helm install test-app charts/rails \
  --set image.repository=your-registry/test-rails-app \
  --set image.tag=latest
```

## Integration with Catalyst Operator

The Rails chart is designed to work with Catalyst's Environment CRs:

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: rails-preview-pr-123
  namespace: my-project
spec:
  projectRef:
    name: my-rails-project
  type: development
  deploymentMode: production
  sources:
    - name: app
      commitSha: abc123def
      branch: feature-branch
      prNumber: 123
  config:
    # Rails-specific configuration would go here
```

The operator will:
1. Deploy using the rails chart
2. Create isolated namespace
3. Set up PostgreSQL and Redis if configured
4. Run database migrations
5. Deploy worker pods if enabled
