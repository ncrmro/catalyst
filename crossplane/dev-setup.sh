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

echo "Installing provider-aws family providers..."

# Family providers are smaller and faster than the monolithic provider-aws.
# Installing provider-aws-ec2 also auto-installs provider-family-aws
# which provides the ProviderConfig CRD.
cat <<EOF | "$PROJECT_ROOT/bin/kubectl" apply -f -
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.16.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-iam
spec:
  package: xpkg.upbound.io/upbound/provider-aws-iam:v1.16.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-autoscaling
spec:
  package: xpkg.upbound.io/upbound/provider-aws-autoscaling:v1.16.0
EOF

echo "Waiting for provider-aws-ec2 to be healthy (this may take a few minutes)..."
"$PROJECT_ROOT/bin/kubectl" wait provider.pkg.crossplane.io/provider-aws-ec2 --for=condition=Healthy --timeout=600s || {
  echo "Warning: provider-aws-ec2 took too long to become healthy, but setup will continue."
}

echo "Waiting for provider-aws-iam to be healthy..."
"$PROJECT_ROOT/bin/kubectl" wait provider.pkg.crossplane.io/provider-aws-iam --for=condition=Healthy --timeout=600s || {
  echo "Warning: provider-aws-iam took too long to become healthy."
}

echo "Waiting for provider-aws-autoscaling to be healthy..."
"$PROJECT_ROOT/bin/kubectl" wait provider.pkg.crossplane.io/provider-aws-autoscaling --for=condition=Healthy --timeout=600s || {
  echo "Warning: provider-aws-autoscaling took too long to become healthy."
}

echo "Waiting for provider-family-aws..."
"$PROJECT_ROOT/bin/kubectl" wait provider.pkg.crossplane.io/provider-family-aws --for=condition=Healthy --timeout=120s || {
  echo "Warning: provider-family-aws took too long to become healthy."
}

echo "Crossplane setup complete!"
echo "Installed providers:"
"$PROJECT_ROOT/bin/kubectl" get providers
