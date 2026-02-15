# Catalyst Helm Charts

This directory contains Helm charts for deploying applications on the Catalyst platform.

## Available Charts

### Framework Charts

#### nextjs
A Helm chart for deploying Next.js applications with optional PostgreSQL database support.

- **Location**: `charts/nextjs/`
- **Documentation**: [nextjs/README.md](nextjs/README.md)
- **Features**:
  - Next.js application deployment
  - PostgreSQL database integration
  - Database migrations
  - Health checks
  - E2E testing support

#### rails
A Helm chart for deploying Ruby on Rails applications with PostgreSQL and Redis support.

- **Location**: `charts/rails/`
- **Documentation**: [rails/README.md](rails/README.md)
- **Features**:
  - Rails application deployment
  - PostgreSQL database integration
  - Redis integration (optional)
  - Database migrations (rails db:migrate)
  - SolidQueue worker support (optional)
  - Health checks (/up endpoint)

### Platform Charts

#### catalyst
The main Catalyst platform chart that deploys the operator and web application.

- **Location**: `charts/catalyst/`
- **Features**:
  - Catalyst operator deployment
  - Web application deployment
  - Custom Resource Definitions (Environment, Project)
  - RBAC configuration

#### example
Example/template Helm chart for reference.

- **Location**: `charts/example/`

## Usage

### Installing a Chart

```bash
# Install Next.js application
helm install my-nextjs-app charts/nextjs \
  --set image.repository=my-nextjs-app \
  --set image.tag=v1.0.0

# Install Rails application
helm install my-rails-app charts/rails \
  --set image.repository=my-rails-app \
  --set image.tag=v1.0.0
```

### Using with Catalyst Operator

The framework charts (nextjs, rails) are designed to work with Catalyst's Environment Custom Resources:

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: my-app-production
spec:
  projectRef:
    name: my-project
  type: deployment
  deploymentMode: production
  config:
    # Configuration goes here
```

## Chart Development

When creating a new framework chart:

1. **Create standalone chart**: Each framework gets its own chart directory (e.g., `charts/rails/`)
2. **Use Bitnami subcharts**: For managed services (PostgreSQL, Redis, etc.)
3. **Follow structure**: Use the nextjs or rails chart as a template
4. **Include examples**: Add example values files in `examples/` directory
5. **Document thoroughly**: Include comprehensive README.md
6. **Test**: Create TESTING.md with testing instructions

### Chart Structure

```
charts/[framework]/
├── Chart.yaml              # Chart metadata and dependencies
├── values.yaml             # Default configuration values
├── README.md               # User documentation
├── TESTING.md             # Testing instructions
├── .helmignore            # Files to exclude from chart
├── examples/              # Example values files
│   ├── values-basic.yaml
│   ├── values-preview.yaml
│   └── values-production.yaml
└── templates/             # Kubernetes manifest templates
    ├── NOTES.txt          # Post-install notes
    ├── _helpers.tpl       # Template helpers
    ├── deployment.yaml
    ├── service.yaml
    ├── serviceaccount.yaml
    ├── secret.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    └── tests/
        └── test-connection.yaml
```

## Testing Charts

### Lint Chart

```bash
helm lint charts/[chart-name]
```

### Render Templates

```bash
helm template test-release charts/[chart-name] \
  --set image.repository=test \
  --set image.tag=latest
```

### Deploy to Cluster

```bash
kubectl create namespace test

helm install test-app charts/[chart-name] \
  --namespace test \
  --set image.repository=test-app \
  --set image.tag=latest

helm test test-app -n test

helm uninstall test-app -n test
kubectl delete namespace test
```

## Dependencies

Charts use dependencies from OCI registries:

- **PostgreSQL**: `oci://registry-1.docker.io/bitnamicharts/postgresql`
- **Redis**: `oci://registry-1.docker.io/bitnamicharts/redis`

To update dependencies:

```bash
cd charts/[chart-name]
helm dependency build
```

## Contributing

When adding a new chart:

1. Follow the chart structure above
2. Include comprehensive documentation
3. Add example values files
4. Test thoroughly with `helm lint` and actual deployments
5. Update this README to list the new chart

## Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Bitnami Charts](https://github.com/bitnami/charts)
- [Catalyst Documentation](../README.md)
