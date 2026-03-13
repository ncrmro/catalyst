#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Setting up Crossplane in K3s..."

# Add Helm repo
"$PROJECT_ROOT/bin/helm" repo add crossplane-stable https://charts.crossplane.io/stable
"$PROJECT_ROOT/bin/helm" repo update

# Install or upgrade Crossplane
"$PROJECT_ROOT/bin/helm" upgrade --install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait

echo "Installing provider-aws..."

# Apply the provider manifest
cat <<EOF | "$PROJECT_ROOT/bin/kubectl" apply -f -
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws:v1.14.0
EOF

echo "Waiting for provider-aws to be healthy (this may take a few minutes as it downloads a large image)..."
"$PROJECT_ROOT/bin/kubectl" wait provider.pkg.crossplane.io/provider-aws --for=condition=Healthy --timeout=600s || {
  echo "Warning: provider-aws took too long to become healthy, but setup will continue."
}

echo "Crossplane setup complete!"
