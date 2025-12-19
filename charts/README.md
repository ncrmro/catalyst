# Catalyst Helm Charts

This directory contains Helm charts for deploying Catalyst and related applications to Kubernetes.

## Available Charts

### catalyst

**Complete Catalyst platform deployment** - Deploys the entire Catalyst platform including web application, PostgreSQL database, and Kubernetes operator.

- **Location**: `charts/catalyst/`
- **Description**: Production-ready Helm chart with all platform components
- **Components**:
  - Web application (Next.js)
  - PostgreSQL database (via Bitnami subchart)
  - Kubernetes operator with CRDs
  - Complete RBAC and security policies

**Quick Start:**
```bash
helm install catalyst ./catalyst \
  --create-namespace \
  --namespace catalyst \
  --values catalyst/values-kind.yaml
```

**Documentation:**
- [Full README](./catalyst/README.md)
- [Quick Reference](./catalyst/QUICKREF.md)
- [Deployment Experience](../spikes/1766166235_operator_kind_deployment/README.md)
- [Verification Checklist](../spikes/1766166235_operator_kind_deployment/VERIFICATION.md)

---

### nextjs

**NextJS application deployment** - Helm chart for deploying Next.js applications with optional PostgreSQL database.

- **Location**: `charts/nextjs/`
- **Description**: Reusable chart for Next.js applications
- **Components**:
  - Next.js deployment
  - Optional PostgreSQL subchart
  - Service and Ingress
  - ConfigMaps and Secrets

**Documentation:** [README](./nextjs/README.md)

---

### singleton

**Cluster infrastructure components** - Installs cluster-wide singleton services.

- **Location**: `charts/singleton/`
- **Description**: Infrastructure dependencies for the cluster
- **Components**:
  - cert-manager (v1.18.2)
  - GitHub Actions Runner Controller (v0.12.1)

**Documentation:** [README](./singleton/README.md)

---

### example

**Example Helm chart** - Basic template for creating new charts.

- **Location**: `charts/example/`
- **Description**: Starter template for Kubernetes deployments

---

## Chart Comparison

| Chart | Use Case | Components | Complexity |
|-------|----------|------------|------------|
| **catalyst** | Full platform deployment | Web + DB + Operator + CRDs | High |
| **nextjs** | Application deployment | Next.js + Optional DB | Medium |
| **singleton** | Cluster infrastructure | cert-manager + GHA Runner | Medium |
| **example** | Template/Reference | Basic deployment | Low |

## Installation Guide

### Prerequisites

- Kubernetes 1.21+
- Helm 3.8+
- kubectl configured

### Basic Installation Flow

1. **Install infrastructure (optional)**:
   ```bash
   helm install singleton ./singleton --create-namespace --namespace singleton
   ```

2. **Install Catalyst platform**:
   ```bash
   # Add required repositories
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm repo update
   
   # Build dependencies
   cd catalyst
   helm dependency build
   
   # Install
   helm install catalyst . \
     --create-namespace \
     --namespace catalyst \
     --wait
   ```

3. **Deploy applications with nextjs chart**:
   ```bash
   helm install myapp ./nextjs \
     --set image.repository=myregistry/myapp \
     --set image.tag=v1.0.0 \
     --namespace apps
   ```

### Testing with Kind

For local testing with kind, use the automated installation script:

```bash
cd ../spikes/1766166235_operator_kind_deployment
./install-to-kind.sh
```

This will:
- Create a kind cluster
- Install the catalyst chart with kind-optimized values
- Verify the installation
- Provide next steps

## Development

### Creating a New Chart

```bash
helm create mychart
cd mychart
helm lint .
helm template . --debug
```

### Testing Charts

```bash
# Lint
helm lint ./chartname

# Dry-run
helm install test ./chartname --dry-run --debug

# Template output
helm template test ./chartname > output.yaml
```

### Building Dependencies

For charts with dependencies (like catalyst with PostgreSQL):

```bash
cd chartname
helm dependency build
```

## Chart Versioning

Charts follow semantic versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

Update version in `Chart.yaml` when making changes.

## Contributing

When adding or modifying charts:

1. Update `Chart.yaml` with new version
2. Update README with usage examples
3. Test with `helm lint` and `helm template`
4. Document any breaking changes
5. Update this index if adding new charts

## Support

For issues or questions:
- Chart documentation: See individual chart READMEs
- Platform issues: See main [Catalyst README](../README.md)
- Deployment help: See [deployment documentation](../spikes/1766166235_operator_kind_deployment/)
