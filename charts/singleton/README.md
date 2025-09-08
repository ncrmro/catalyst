# Singleton Helm Chart

This is a simple Helm chart that serves as a wrapper for cert-manager and GitHub Actions Runner Controller charts. This chart does not include any templates of its own.

## Dependencies

- cert-manager: v1.18.2 (from OCI repository: quay.io/jetstack/charts)
- GitHub Actions Runner Controller (from OCI repository: ghcr.io/actions/actions-runner-controller-charts)

## Usage

### Installation

```bash
# Update dependencies before installing
helm dependency update ./charts/singleton

# Install the chart
helm install singleton ./charts/singleton
```

### Configuration

The chart can be configured via the `values.yaml` file. All configurations are passed through to the respective subcharts.

Example:

```yaml
# cert-manager configuration
cert-manager:
  installCRDs: true
  namespace: cert-manager
  createNamespace: true
  # Additional cert-manager configurations

# GitHub Actions Runner Controller configuration
gha-runner-scale-set-controller:
  namespace: arc-systems
  createNamespace: true
```

## Cluster Issuer Configuration

This chart includes a ClusterIssuer for Let's Encrypt certificates using Cloudflare DNS challenge. The issuer requires a secret containing the Cloudflare API token.

### Prerequisites

Before installing the singleton chart, you must create a secret with your Cloudflare API token:

```bash
kubectl create secret generic cloudflare-api-token-secret \
  --namespace=cert-manager \
  --from-literal=api-token=your-cloudflare-api-token
```

### ClusterIssuer Configuration

The chart includes a production ClusterIssuer that uses:
- Let's Encrypt production server
- Cloudflare DNS01 challenge solver
- References the `cloudflare-api-token-secret` secret

Example usage in your ingress:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: your-domain-tls
```

## License

See the parent project license for more information.
