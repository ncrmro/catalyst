#!/usr/bin/env bash
#
# Local E2E Test Script
# Replicates the GitHub Actions CI e2e workflow locally using k3s-vm
#
# Usage: ./scripts/ci-e2e-local.sh [--skip-build] [--skip-infra]
#
# This script mirrors: .github/workflows/web.test.yml (e2e job)
# but uses k3s-vm instead of Kind for better local compatibility.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$WEB_DIR")"

SKIP_BUILD=false
SKIP_INFRA=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-infra) SKIP_INFRA=true ;;
  esac
done

cd "$WEB_DIR"

echo "========================================"
echo "Local E2E Test - Mirrors CI workflow"
echo "Using k3s-vm for local Kubernetes"
echo "========================================"

# ============================================================================
# CI Step: Create Kind cluster with ingress port mapping
# Mirrors: .github/workflows/web.test.yml lines 144-164
# Local: Uses k3s-vm instead of Kind
# ============================================================================
if [ "$SKIP_INFRA" = false ]; then
  echo ""
  echo "=== Starting k3s-vm (mirrors Kind cluster creation in CI) ==="
  rm -f kubeconfig.yaml
  "$ROOT_DIR/bin/k3s-vm"
  echo "k3s-vm started"
else
  echo ""
  echo "=== Skipping infra setup (--skip-infra) ==="
fi

# Wait for kubeconfig to be available
echo "Waiting for kubeconfig..."
until [ -f kubeconfig.yaml ]; do sleep 1; done
export KUBECONFIG="$WEB_DIR/kubeconfig.yaml"
KUBECTL="$ROOT_DIR/bin/kubectl"

# ============================================================================
# CI Step: Export kubeconfig
# Mirrors: .github/workflows/web.test.yml lines 166-171
# ============================================================================
echo ""
echo "=== Exporting kubeconfig ==="
export KUBECONFIG_PRIMARY=$($KUBECTL config view --raw -o json | base64 -w 0)
echo "Kubeconfig exported for E2E tests"

# ============================================================================
# CI Step: Build operator and web images
# Mirrors: .github/workflows/web.test.yml lines 173-187
# Local: Images are built and loaded into k3s-vm's containerd
# ============================================================================
if [ "$SKIP_BUILD" = false ]; then
  echo ""
  echo "=== Building operator and web images ==="
  cd "$ROOT_DIR"
  docker buildx bake --load --file docker-compose.build.yml operator-production web-production

  echo "Verifying images were built..."
  docker images | grep -E '(ghcr.io/ncrmro/catalyst)'
  cd "$WEB_DIR"
fi

# Always load images into k3s-vm (even with --skip-build, images need to be in VM)
echo ""
echo "=== Loading images into k3s-vm containerd ==="
# Export images from Docker and import to k3s-vm's containerd via SSH
IMAGES="ghcr.io/ncrmro/catalyst/operator:latest ghcr.io/ncrmro/catalyst/web:latest"
for img in $IMAGES; do
  echo "Loading $img..."
  docker save "$img" | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2666 root@localhost \
    "ctr --address /run/k3s/containerd/containerd.sock -n k8s.io images import -"
done
echo "Images loaded into k3s-vm"

# ============================================================================
# CI Step: Build Helm chart dependencies
# Mirrors: .github/workflows/web.test.yml lines 189-199
# ============================================================================
echo ""
echo "=== Building Helm chart dependencies ==="
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts 2>/dev/null || true
helm repo update
helm dependency build "$ROOT_DIR/charts/catalyst"
echo "Helm chart dependencies built successfully"

# ============================================================================
# CI Step: Deploy Catalyst using Helm
# Mirrors: .github/workflows/web.test.yml lines 201-259
# Local: Clean up k3s-vm pre-installed CRDs that conflict with Helm
# ============================================================================
echo ""
echo "=== Deploying Catalyst using Helm ==="

# Uninstall previous release if exists
helm uninstall catalyst -n catalyst-system 2>/dev/null || true
$KUBECTL delete namespace catalyst-system --wait=false 2>/dev/null || true

# Clean up k3s-vm pre-installed resources that conflict with Helm
# CI uses Kind which starts fresh, but k3s-vm has pre-installed components
echo "Cleaning up pre-installed k3s-vm resources..."

# Remove cert-manager CRDs
$KUBECTL delete crd certificaterequests.cert-manager.io certificates.cert-manager.io \
  challenges.acme.cert-manager.io clusterissuers.cert-manager.io issuers.cert-manager.io \
  orders.acme.cert-manager.io 2>/dev/null || true

# Remove pre-installed ingress-nginx (helm release and namespace)
helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || true
$KUBECTL delete namespace ingress-nginx --wait=false 2>/dev/null || true
$KUBECTL delete ingressclass nginx 2>/dev/null || true

sleep 5

cat > /tmp/e2e-values.yaml <<EOF
# Operator configuration
operator:
  enabled: true
  image:
    repository: ghcr.io/ncrmro/catalyst/operator
    tag: latest
    pullPolicy: Never

# Web application configuration
web:
  enabled: true
  image:
    repository: ghcr.io/ncrmro/catalyst/web
    tag: latest
    pullPolicy: Never
  env:
    - name: NEXTAUTH_SECRET
      value: "test-secret-for-e2e"
    - name: NEXTAUTH_URL
      value: "http://catalyst-web.catalyst-system.svc.cluster.local:3000"

# Enable ingress-nginx subchart for e2e
ingress-nginx:
  enabled: true
  controller:
    hostPort:
      enabled: true
    service:
      type: NodePort
    admissionWebhooks:
      enabled: false

# Disable cert-manager for e2e (not needed)
cert-manager:
  enabled: false

# Enable CloudNativePG operator and PostgreSQL cluster
cloudnative-pg:
  enabled: true
postgresql:
  enabled: true
  instances: 1
  storage:
    size: 1Gi
EOF

helm install catalyst "$ROOT_DIR/charts/catalyst" \
  --namespace catalyst-system \
  --create-namespace \
  --values /tmp/e2e-values.yaml \
  --wait \
  --timeout 10m

echo "Catalyst deployed via Helm"

# ============================================================================
# CI Step: Wait for CloudNativePG and components
# Mirrors: .github/workflows/web.test.yml lines 246-259
# ============================================================================
echo ""
echo "=== Waiting for CloudNativePG operator ==="
$KUBECTL wait --for=condition=available deployment/catalyst-cloudnative-pg -n catalyst-system --timeout=120s
echo "CloudNativePG operator is ready"

echo ""
echo "=== Waiting for PostgreSQL cluster ==="
$KUBECTL wait --for=condition=Ready cluster/catalyst-db -n catalyst-system --timeout=300s
echo "PostgreSQL cluster is ready"

echo ""
echo "=== Verifying deployments ==="
$KUBECTL get pods -A
$KUBECTL wait --for=condition=available deployment/catalyst-controller-manager -n catalyst-system --timeout=120s
$KUBECTL wait --for=condition=available deployment/catalyst-web -n catalyst-system --timeout=300s
$KUBECTL wait --for=condition=available deployment/ingress-nginx-controller -n ingress-nginx --timeout=120s || true
echo "All Catalyst components are ready"

# ============================================================================
# CI Step: Deploy test application
# Mirrors: .github/workflows/web.test.yml lines 261-277
# ============================================================================
echo ""
echo "=== Deploying test application ==="
$KUBECTL delete deployment ci-test-app -n default 2>/dev/null || true
$KUBECTL delete service ci-test-app -n default 2>/dev/null || true
$KUBECTL create deployment ci-test-app --image=nginx:alpine -n default
$KUBECTL expose deployment ci-test-app --port=80 --target-port=80 -n default
$KUBECTL wait --for=condition=available deployment/ci-test-app -n default --timeout=60s
echo "Test application deployed"

# ============================================================================
# CI Step: Create test ingress
# Mirrors: .github/workflows/web.test.yml lines 279-305
# ============================================================================
echo ""
echo "=== Creating test ingress ==="
$KUBECTL delete ingress ci-test-env-ingress -n default 2>/dev/null || true
cat <<EOF | $KUBECTL apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ci-test-env-ingress
  namespace: default
spec:
  ingressClassName: nginx
  rules:
    - host: test-project-ci-test-env.localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ci-test-app
                port:
                  number: 80
EOF
sleep 5
$KUBECTL get ingress -n default
echo "Test ingress created"

# ============================================================================
# CI Step: Create test Environment CR
# Mirrors: .github/workflows/web.test.yml lines 307-325
# ============================================================================
echo ""
echo "=== Creating test Environment CR ==="
$KUBECTL delete environment ci-test-env -n default 2>/dev/null || true
cat <<EOF | $KUBECTL apply -f -
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: ci-test-env
  namespace: default
spec:
  projectRef:
    name: test-project
  type: development
  deploymentMode: development
  sources:
    - name: main
      commitSha: abc123
      branch: main
EOF
echo "Test Environment CR created"

# ============================================================================
# CI Step: Patch Environment status to Ready
# Mirrors: .github/workflows/web.test.yml lines 317-322
# ============================================================================
echo ""
echo "=== Patching Environment status to Ready ==="
$KUBECTL patch environment ci-test-env -n default \
  --type=merge --subresource=status \
  -p '{"status":{"phase":"Ready","url":"http://test-project-ci-test-env.localhost:8080/"}}'
echo "Environment status patched to Ready"

# ============================================================================
# CI Step: Install dependencies
# Mirrors: .github/workflows/web.test.yml lines 324-325
# ============================================================================
echo ""
echo "=== Installing dependencies ==="
npm ci

# ============================================================================
# CI Step: Seed database
# Mirrors: .github/workflows/web.test.yml lines 327-329
# Local: Uses bundled seed.cjs (no tsx required in production image)
# ============================================================================
echo ""
echo "=== Seeding database ==="
$KUBECTL exec deployment/catalyst-web -n catalyst-system -- node seed.cjs

# ============================================================================
# CI Step: Run Playwright tests
# Mirrors: .github/workflows/web.test.yml lines 331-337
# ============================================================================
echo ""
echo "=== Running Playwright tests ==="
KUBECONFIG_PRIMARY="$KUBECONFIG_PRIMARY" \
LOCAL_PREVIEW_ROUTING="true" \
INGRESS_PORT="8080" \
npm run test:e2e

echo ""
echo "========================================"
echo "E2E tests completed successfully!"
echo "========================================"
