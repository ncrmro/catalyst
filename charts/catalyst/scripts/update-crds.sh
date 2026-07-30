#!/usr/bin/env bash
# Update CRDs in the catalyst Helm chart
# Run this after:
#   - Updating chart dependencies (helm dependency update)
#   - Modifying operator CRDs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_DIR="$(dirname "$SCRIPT_DIR")"
CRDS_DIR="$CHART_DIR/crds"
CHARTS_DIR="$CHART_DIR/charts"
OPERATOR_CRD_DIR="$(dirname "$(dirname "$CHART_DIR")")/operator/config/crd/bases"

echo "=== Updating CRDs for catalyst Helm chart ==="

# Extract CloudNativePG CRDs from subchart
echo "Extracting CloudNativePG CRDs..."
CNPG_TARBALL=$(ls "$CHARTS_DIR"/cloudnative-pg-*.tgz 2>/dev/null | head -1)
if [[ -z "$CNPG_TARBALL" ]]; then
  echo "Error: CloudNativePG tarball not found. Run 'helm dependency update' first."
  exit 1
fi
# Extract and strip Helm template conditionals from the CRD file
tar -xzf "$CNPG_TARBALL" cloudnative-pg/templates/crds/crds.yaml -O | \
  grep -v '^{{-' > "$CRDS_DIR/cloudnative-pg-crds.yaml"
echo "  -> $CRDS_DIR/cloudnative-pg-crds.yaml"

# Note: Istio CRDs are managed by the istio-base subchart, not in the crds/ directory.
# This allows Istio to properly manage CRD lifecycle and upgrades.

# Copy Catalyst operator CRDs
echo "Copying Catalyst operator CRDs..."
cp "$OPERATOR_CRD_DIR/catalyst.catalyst.dev_environments.yaml" "$CRDS_DIR/"
cp "$OPERATOR_CRD_DIR/catalyst.catalyst.dev_projects.yaml" "$CRDS_DIR/"
echo "  -> $CRDS_DIR/catalyst.catalyst.dev_environments.yaml"
echo "  -> $CRDS_DIR/catalyst.catalyst.dev_projects.yaml"

echo ""
echo "CRDs updated:"
ls -la "$CRDS_DIR"
