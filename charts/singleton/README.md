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

## License

See the parent project license for more information.