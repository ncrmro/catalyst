# Catalyst Documentation

Welcome to Catalyst - a development platform designed to help you ship faster. Provides opinionated deployments, CI/CD pipelines, and boilerplates.

## Installation

### Prerequisites

- Kubernetes cluster (1.24+)
- Helm 3.x
- kubectl configured with cluster access

### Install Catalyst with Helm

```bash
# Add the Catalyst Helm repository
helm repo add catalyst https://ncrmro.github.io/catalyst

# Update your Helm repositories
helm repo update

# Install Catalyst
helm install catalyst catalyst/nextjs \
  --namespace catalyst \
  --create-namespace \
  --set image.repository=ghcr.io/ncrmro/catalyst \
  --set image.tag=latest
```

### Configuration

For production deployments, you'll need to configure the following values:

```bash
helm install catalyst catalyst/nextjs \
  --namespace catalyst \
  --create-namespace \
  --set image.repository=ghcr.io/ncrmro/catalyst \
  --set image.tag=latest \
  --set nextjs.env[0].name=NEXTAUTH_URL \
  --set nextjs.env[0].value=https://your-domain.com \
  --set nextjs.env[1].name=NEXTAUTH_SECRET \
  --set nextjs.env[1].value=your-secret-here \
  --set nextjs.env[2].name=GITHUB_CLIENT_ID \
  --set nextjs.env[2].value=your-github-client-id \
  --set nextjs.env[3].name=GITHUB_CLIENT_SECRET \
  --set nextjs.env[3].value=your-github-client-secret \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=your-domain.com
```

### Using a values.yaml file

For easier management, create a `values.yaml` file:

```yaml
image:
  repository: ghcr.io/ncrmro/catalyst
  tag: latest

nextjs:
  env:
    - name: NEXTAUTH_URL
      value: "https://your-domain.com"
    - name: NEXTAUTH_SECRET
      value: "your-secret-here"
    - name: GITHUB_CLIENT_ID
      value: "your-github-client-id"
    - name: GITHUB_CLIENT_SECRET
      value: "your-github-client-secret"

postgresql:
  enabled: true
  auth:
    username: catalyst
    database: catalyst

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
```

Then install with:

```bash
helm install catalyst catalyst/nextjs \
  --namespace catalyst \
  --create-namespace \
  --values values.yaml
```

### Verify Installation

Check the deployment status:

```bash
# Check pods
kubectl get pods -n catalyst

# Check services
kubectl get svc -n catalyst

# Check ingress (if enabled)
kubectl get ingress -n catalyst
```

## Features

- **Preview Environments**: Automatically create preview environments for pull requests
- **GitHub Integration**: Seamless integration with GitHub repositories
- **Kubernetes Native**: Built for Kubernetes with Helm chart support
- **Agent-Friendly**: Designed for agentic workflows with MCP server integration
- **PostgreSQL Included**: Optional PostgreSQL database deployment

## Platform Guides

- [Developer Workflow](./platform/developer-workflow.spec.md) - Local development options (Docker Compose vs K3s-VM)
- [Yazi File Picker Setup](./platform/yazi-file-picker.md) - Configure Yazi as your default file picker on Linux

## Next Steps

- [Local Development Guide](../web/README.md)
- [Architecture Overview](../CLAUDE.md)
- [GitHub Integration Setup](#) (Coming soon)
- [Kubernetes Configuration](#) (Coming soon)

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/ncrmro/catalyst).

## License

See [LICENSE](../LICENSE) for more information.
