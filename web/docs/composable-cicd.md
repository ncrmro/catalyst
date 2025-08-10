# Composable CI/CD with Catalyst Actions

This document explains how to use Catalyst's reusable action workflows as an opinionated approach to handle CI/CD for modern applications. Catalyst provides pre-built GitHub Actions, Docker images, and Helm charts that can be composed together to create efficient, secure, and scalable deployment pipelines.

## Overview

Catalyst offers a complete CI/CD ecosystem that includes:

- **Build Container Action**: Optimized Docker container builds with registry caching, image cleanup, and attestations
- **Pre-built Dockerfiles**: Production-ready Dockerfiles for Rails and NextJS applications
- **Helm Charts**: Kubernetes deployment charts for common application stacks
- **Deployment Workflows**: Automated preview and production environment deployments
- **Testing Integration**: Helm tests for comprehensive CI validation

## Core Components

### 1. Build Container Action

The `build-container` action provides enterprise-grade container building with:

- **Registry Caching**: Automatic layer caching using GitHub Actions cache
- **Multi-platform Builds**: Support for multiple architectures (linux/amd64, linux/arm64)
- **Security Attestations**: Automatic build provenance attestation
- **Metadata Extraction**: Smart tagging based on branches, PRs, and releases
- **Image Cleanup**: Efficient layer management and size optimization

#### Usage Example

```yaml
name: Build Application
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and Push Container
        uses: ncrmro/catalyst/.github/actions/build-container@main
        with:
          registry: ghcr.io
          image: ${{ github.repository }}
          platforms: linux/amd64,linux/arm64
          context: .
          dockerfile: ./Dockerfile
```

### 2. Pre-built Dockerfiles

Catalyst provides optimized Dockerfiles that can be referenced directly from GitHub:

#### Rails Applications

```bash
docker build -t app https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile
```

**Features:**
- Multi-stage builds for optimized image size
- Ruby 3.2.3 with Rails 7.2+ support
- PostgreSQL client included
- Security-first approach with non-root user
- Asset precompilation and bootsnap optimization
- Production-ready entrypoint handling

#### NextJS Applications

```bash
docker build -t app https://github.com/ncrmro/catalyst.git#main:Dockerfiles/NextJS.Dockerfile
```

**Features:**
- Node.js 20 Alpine-based for minimal size
- Multi-stage builds with dependency optimization
- Next.js output file tracing support
- BullMQ and background job support
- Built-in health checks
- Security-hardened with non-root user

### 3. Helm Charts

Catalyst provides production-ready Helm charts for rapid deployment:

#### Rails Chart (`charts/rails`)

```yaml
# values.yaml
image:
  repository: ghcr.io/myorg/my-rails-app
  tag: main

rails:
  database:
    enabled: true
    name: myapp_production
  env:
    - name: RAILS_ENV
      value: production
    - name: SECRET_KEY_BASE
      valueFrom:
        secretKeyRef:
          name: rails-secrets
          key: secret_key_base

redis:
  enabled: true

sidekiq:
  enabled: true
  replicaCount: 2

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
```

**Features:**
- PostgreSQL integration with CloudNativePG operator
- Redis support for caching and background jobs
- Sidekiq configuration for background processing
- Database migration jobs
- Health check endpoints
- Horizontal pod autoscaling

#### NextJS Chart (`charts/nextjs`)

```yaml
# values.yaml
image:
  repository: ghcr.io/myorg/my-nextjs-app
  tag: main

nextjs:
  env:
    - name: NODE_ENV
      value: production
    - name: NEXT_PUBLIC_API_URL
      value: https://api.example.com

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
```

**Features:**
- Optimized for Next.js applications
- Environment variable management
- Built-in autoscaling configuration
- Health check integration
- Static asset serving

## Deployment Patterns

### Preview Environments

Create dynamic preview environments for every pull request:

```yaml
name: Deploy Preview
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Container
        id: build
        uses: ncrmro/catalyst/.github/actions/build-container@main
        with:
          registry: ghcr.io
          image: ${{ github.repository }}
          dockerfile: https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Preview
        run: |
          helm upgrade --install \
            pr-${{ github.event.number }} \
            ./charts/rails \
            --set image.repository=ghcr.io/${{ github.repository }} \
            --set image.tag=pr-${{ github.event.number }} \
            --set ingress.enabled=true \
            --set ingress.hosts[0].host=pr-${{ github.event.number }}.preview.example.com \
            --namespace previews \
            --create-namespace
```

### Production Environments

Deploy to production with proper staging and validation:

```yaml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Container
        id: build
        uses: ncrmro/catalyst/.github/actions/build-container@main
        with:
          registry: ghcr.io
          image: ${{ github.repository }}
          dockerfile: https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          helm upgrade --install \
            myapp-staging \
            ./charts/rails \
            --set image.repository=ghcr.io/${{ github.repository }} \
            --set image.tag=main \
            --namespace staging

  test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Run Helm Tests
        run: |
          helm test myapp-staging --namespace staging

  deploy-production:
    needs: [build, test]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          helm upgrade --install \
            myapp \
            ./charts/rails \
            --set image.repository=ghcr.io/${{ github.repository }} \
            --set image.tag=main \
            --namespace production
```

## Testing with Helm

Catalyst charts include comprehensive testing capabilities using Helm tests:

### Rails Application Tests

```yaml
# charts/rails/templates/tests/test-health.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "rails.fullname" . }}-test-health"
  labels:
    {{- include "rails.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['--quiet', '--tries=1', '--spider', '{{ include "rails.fullname" . }}:{{ .Values.service.port }}/health']
```

### NextJS Application Tests

```yaml
# charts/nextjs/templates/tests/test-app.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "nextjs.fullname" . }}-test"
  labels:
    {{- include "nextjs.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['--quiet', '--tries=1', '--spider', '{{ include "nextjs.fullname" . }}:{{ .Values.service.port }}/']
```

## Application Examples

### Rails Application

A complete Rails application setup using Catalyst components:

#### 1. Directory Structure
```
my-rails-app/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-preview.yml
│       └── deploy-production.yml
├── charts/
│   └── myapp/  # Custom values for rails chart
├── docker-compose.yml
├── Dockerfile  # Optional: custom overrides
└── ... (Rails app files)
```

#### 2. Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: https://github.com/ncrmro/catalyst.git#main:Dockerfiles
      dockerfile: Rails.Dockerfile
    ports:
      - "3000:80"
    environment:
      - RAILS_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp_development
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp_development

  redis:
    image: redis:7-alpine
```

#### 3. CI/CD Workflow
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Container
        uses: ncrmro/catalyst/.github/actions/build-container@main
        with:
          registry: ghcr.io
          image: ${{ github.repository }}
          dockerfile: https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile
          push: ${{ github.event_name != 'pull_request' }}
```

### NextJS + BullMQ Application

A complete NextJS application with background job processing:

#### 1. Directory Structure
```
my-nextjs-app/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── charts/
│   └── myapp/  # Custom values for nextjs chart
├── pages/
│   └── api/
│       ├── health.js  # Health check endpoint
│       └── jobs/      # BullMQ job handlers
├── workers/           # BullMQ worker processes
└── docker-compose.yml
```

#### 2. Health Check Endpoint
```javascript
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

#### 3. Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build:
      context: https://github.com/ncrmro/catalyst.git#main:Dockerfiles
      dockerfile: NextJS.Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  worker:
    build:
      context: https://github.com/ncrmro/catalyst.git#main:Dockerfiles
      dockerfile: NextJS.Dockerfile
    command: ["node", "workers/index.js"]
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
```

#### 4. Helm Values for Production
```yaml
# charts/myapp/values.yaml
image:
  repository: ghcr.io/myorg/my-nextjs-app

nextjs:
  env:
    - name: NODE_ENV
      value: production
    - name: REDIS_URL
      value: redis://myapp-redis:6379
    - name: NEXT_PUBLIC_API_URL
      value: https://api.myapp.com

# Deploy worker pods separately
workers:
  enabled: true
  replicaCount: 2
  image:
    repository: ghcr.io/myorg/my-nextjs-app
  command: ["node", "workers/index.js"]

redis:
  enabled: true

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.com
      paths:
        - path: /
          pathType: ImplementationSpecific
```

## Composition Patterns

### Template-based Development

Applications can start with Catalyst templates and customize as needed:

#### 1. Start with Template
```bash
# Copy boilerplate Rails application
cp -r catalyst/boilerplate/rails my-new-app
cd my-new-app

# Use default Catalyst Dockerfile
echo 'FROM https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile' > Dockerfile

# Reference Catalyst chart
helm dependency add catalyst-rails https://github.com/ncrmro/catalyst/charts/rails
```

#### 2. Customize as Needed
```yaml
# charts/myapp/Chart.yaml
dependencies:
  - name: rails
    version: "0.1.0"
    repository: "https://github.com/ncrmro/catalyst/charts"

# charts/myapp/values.yaml
rails:
  image:
    repository: ghcr.io/myorg/my-app
  
  # Override default values
  rails:
    env:
      - name: CUSTOM_ENV_VAR
        value: "custom-value"
```

#### 3. Copy and Customize (when needed)
```bash
# Copy Catalyst chart for heavy customization
cp -r catalyst/charts/rails charts/myapp

# Copy Dockerfile for custom modifications
cp catalyst/Dockerfiles/Rails.Dockerfile Dockerfile
# ... make custom modifications ...
```

### Multi-Environment Configuration

```yaml
# .github/workflows/deploy.yml
strategy:
  matrix:
    environment: [development, staging, production]
    include:
      - environment: development
        namespace: dev
        replicas: 1
        resources_requests_cpu: 100m
      - environment: staging
        namespace: staging
        replicas: 2
        resources_requests_cpu: 250m
      - environment: production
        namespace: production
        replicas: 5
        resources_requests_cpu: 500m

steps:
  - name: Deploy to ${{ matrix.environment }}
    run: |
      helm upgrade --install \
        myapp-${{ matrix.environment }} \
        ./charts/rails \
        --set replicaCount=${{ matrix.replicas }} \
        --set resources.requests.cpu=${{ matrix.resources_requests_cpu }} \
        --namespace ${{ matrix.namespace }}
```

## Kubernetes Operators Integration

Catalyst charts integrate with popular Kubernetes operators for managed services:

### PostgreSQL with CloudNativePG
```yaml
# Enable managed PostgreSQL
rails:
  database:
    enabled: true
    name: myapp_production
    # CloudNativePG cluster will be created automatically
```

### Redis with Redis Operator
```yaml
# Enable managed Redis
redis:
  enabled: true
  # Redis instance will be created with optimal settings
```

### MinIO for Object Storage
```yaml
# Enable managed object storage
storage:
  enabled: true
  type: minio
  buckets:
    - name: uploads
    - name: backups
```

## Security and Best Practices

### Container Security
- **Non-root users**: All Catalyst Dockerfiles use non-root users
- **Minimal base images**: Alpine Linux for smaller attack surface
- **Multi-stage builds**: Reduce final image size and attack vectors
- **Security scanning**: Automatic vulnerability scanning with attestations

### Secrets Management
```yaml
# Use Kubernetes secrets for sensitive data
rails:
  envFrom:
    - secretRef:
        name: rails-secrets
    - configMapRef:
        name: rails-config
```

### Network Policies
```yaml
# Restrict network access between pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rails-network-policy
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: rails
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: nginx
```

## Migration Guide

### From Existing CI/CD

#### 1. Replace Docker Build Steps
```yaml
# Before
- name: Build Docker Image
  run: |
    docker build -t myapp .
    docker push myapp

# After
- name: Build Container
  uses: ncrmro/catalyst/.github/actions/build-container@main
  with:
    registry: ghcr.io
    image: ${{ github.repository }}
```

#### 2. Adopt Catalyst Dockerfiles
```yaml
# Gradually migrate to Catalyst Dockerfiles
- name: Build with Catalyst Rails Dockerfile
  uses: ncrmro/catalyst/.github/actions/build-container@main
  with:
    registry: ghcr.io
    image: ${{ github.repository }}
    dockerfile: https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile
```

#### 3. Migrate to Helm Charts
```bash
# Start with Catalyst chart as dependency
helm dependency add catalyst-rails https://github.com/ncrmro/catalyst/charts/rails

# Gradually customize and eventually copy if needed
```

## Monitoring and Observability

### Built-in Health Checks
All Catalyst charts include health check endpoints:
- **Rails**: `/health` endpoint
- **NextJS**: `/api/health` endpoint

### Metrics Integration
```yaml
# Enable Prometheus metrics
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

### Logging
```yaml
# Structured logging configuration
rails:
  env:
    - name: RAILS_LOG_TO_STDOUT
      value: "true"
    - name: LOG_LEVEL
      value: "info"
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
docker build --progress=plain -t test https://github.com/ncrmro/catalyst.git#main:Dockerfiles/Rails.Dockerfile

# Use cache debugging
docker build --progress=plain --no-cache -t test .
```

#### Deployment Issues
```bash
# Check Helm deployment status
helm status myapp -n production

# Debug pod issues
kubectl describe pod -l app.kubernetes.io/name=rails -n production

# Check logs
kubectl logs -l app.kubernetes.io/name=rails -n production
```

#### Testing Failures
```bash
# Run Helm tests with verbose output
helm test myapp -n staging --logs

# Check test pod logs
kubectl logs myapp-test-health -n staging
```

## Support and Resources

- **Documentation**: [Catalyst Documentation](https://github.com/ncrmro/catalyst)
- **Examples**: Check the `boilerplate/` directory for complete examples
- **Issues**: Report issues on [GitHub Issues](https://github.com/ncrmro/catalyst/issues)
- **Community**: Join discussions in [GitHub Discussions](https://github.com/ncrmro/catalyst/discussions)

## Conclusion

Catalyst provides a complete, opinionated CI/CD solution that scales from simple applications to complex multi-service architectures. By using Catalyst's pre-built components, teams can:

- **Reduce Time to Market**: Skip infrastructure setup and focus on application logic
- **Improve Security**: Benefit from security best practices built into every component
- **Scale Efficiently**: Use proven patterns that scale from development to production
- **Maintain Flexibility**: Customize or replace any component as requirements evolve

Start with Catalyst templates, use the pre-built components, and customize only when necessary to build robust, scalable applications quickly.