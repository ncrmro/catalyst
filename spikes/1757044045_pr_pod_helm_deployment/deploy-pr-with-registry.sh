#!/bin/bash

# Script to deploy PR pod that builds images, pushes to in-cluster registry, and deploys Helm chart

set -e

# Check for reset flag
RESET_MODE=false
if [ "$1" = "--reset" ] || [ "$1" = "-r" ]; then
    RESET_MODE=true
    echo "=== Reset mode enabled - will clean up all resources ==="
else
    echo "=== Normal mode - preserving buildx driver ==="
    echo "Use --reset or -r flag to clean up all resources including buildx driver"
fi

echo "=== PR Pod Helm Deployment with GHCR ==="
echo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Try to load tokens from web/.env if not already set
if [ -z "$GITHUB_PAT" ]; then
    if [ -f "$ROOT_DIR/web/.env" ]; then
        export GITHUB_PAT=$(grep "^GITHUB_PAT=" "$ROOT_DIR/web/.env" | cut -d'=' -f2)
        echo "Loaded GITHUB_PAT from web/.env"
    fi
fi

if [ -z "$GITHUB_GHCR_PAT" ]; then
    if [ -f "$ROOT_DIR/web/.env" ]; then
        export GITHUB_GHCR_PAT=$(grep "^GITHUB_GHCR_PAT=" "$ROOT_DIR/web/.env" | cut -d'=' -f2)
        echo "Loaded GITHUB_GHCR_PAT from web/.env"
    fi
fi

# Check if required tokens are set
if [ -z "$GITHUB_PAT" ]; then
    echo "ERROR: Could not find GITHUB_PAT"
    echo "Please ensure web/.env contains GITHUB_PAT or set it manually:"
    echo "  export GITHUB_PAT=your_personal_access_token"
    exit 1
fi

if [ -z "$GITHUB_GHCR_PAT" ]; then
    echo "ERROR: Could not find GITHUB_GHCR_PAT"
    echo "Please ensure web/.env contains GITHUB_GHCR_PAT (classic token) or set it manually:"
    echo "  export GITHUB_GHCR_PAT=your_classic_personal_access_token"
    exit 1
fi

# Set kubeconfig if needed
if [ -f "$ROOT_DIR/kubeconfig.devbox.yml" ]; then
    export KUBECONFIG="$ROOT_DIR/kubeconfig.devbox.yml"
    echo "Using kubeconfig: $KUBECONFIG"
fi

echo "1. Creating RBAC resources..."
kubectl apply -f "$SCRIPT_DIR/rbac.yaml"
echo "   ✓ RBAC resources applied"

echo "2. Creating/verifying PVCs..."
kubectl apply -f "$ROOT_DIR/spikes/1756920599_local_pr_pod_testing/git-cache-pvc.yaml"
kubectl apply -f "$ROOT_DIR/spikes/1756920599_local_pr_pod_testing/helm-cache-pvc.yaml"
echo "   ✓ PVCs created/verified"

echo "3. Creating GitHub PAT secrets..."
kubectl delete secret github-pat-secret --ignore-not-found=true
kubectl create secret generic github-pat-secret --from-literal=token="$GITHUB_PAT" --from-literal=ghcr_token="$GITHUB_GHCR_PAT"

kubectl delete secret ghcr-registry-secret --ignore-not-found=true
kubectl create secret docker-registry ghcr-registry-secret \
  --docker-server=ghcr.io \
  --docker-username=ncrmro \
  --docker-password="$GITHUB_GHCR_PAT" \
  --docker-email=ncrmro@users.noreply.github.com
echo "   ✓ Secrets created (generic PAT secret + docker registry secret)"

echo "4. Cleaning up existing resources..."
kubectl delete job pr-pod-registry-deploy --ignore-not-found=true
kubectl delete deployment web-app --ignore-not-found=true
kubectl delete replicaset -l app=web-app --ignore-not-found=true
kubectl delete service web-app --ignore-not-found=true
helm uninstall web-app --ignore-not-found || true

if [ "$RESET_MODE" = true ]; then
    echo "   Reset mode: Cleaning up buildx driver..."
    kubectl delete deployment -l app=k8s-builder0 --ignore-not-found=true
    echo "   ✓ Full cleanup complete"
else
    echo "   Normal mode: Preserving buildx driver"
    echo "   ✓ Cleanup complete (buildx driver preserved)"
fi

echo "5. Creating PR pod job with GHCR push and Helm deployment..."
kubectl apply -f "$SCRIPT_DIR/pr-pod-with-registry.yaml"
echo "   ✓ Job created"

echo "6. Waiting for pod to start..."
sleep 5

# Get pod name
POD_NAME=$(kubectl get pods -l job-name=pr-pod-registry-deploy -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
    echo "ERROR: Pod not found. Checking job status..."
    kubectl describe job pr-pod-registry-deploy
    exit 1
fi

echo "   ✓ Pod found: $POD_NAME"

echo "7. Monitoring pod status..."
kubectl wait --for=condition=Ready pod/$POD_NAME --timeout=120s || true

echo "8. Streaming pod logs..."
echo "----------------------------------------"
kubectl logs -f $POD_NAME || kubectl logs $POD_NAME
echo "----------------------------------------"

echo "9. Checking final job status..."
kubectl get job pr-pod-registry-deploy

echo "10. Checking deployed resources..."
echo "Application deployments:"
kubectl get deployments
echo ""
echo "Services:"
kubectl get services
echo ""
echo "Pods:"
kubectl get pods -l app=web-app

echo ""
echo "=== Test Complete ==="
echo ""
echo "Images pushed to GHCR:"
echo "  ghcr.io/ncrmro/catalyst/web:pr-000"
echo "  ghcr.io/ncrmro/catalyst/web:pr-000-cache"
echo ""
echo "To clean up resources, run:"
echo "  kubectl delete job pr-pod-registry-deploy"
echo "  kubectl delete secret github-pat-secret"
echo "  kubectl delete secret ghcr-registry-secret"
echo "  helm uninstall web-app"
echo ""
echo "To delete PVCs (will remove caches):"
echo "  kubectl delete pvc git-cache-pvc helm-cache-pvc"