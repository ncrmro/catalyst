#!/bin/bash

# Script to deploy PR pod that builds images, pushes to in-cluster registry, and deploys Helm chart

set -e

# Check for flags
RESET_MODE=false
HELM_RESET=false

for arg in "$@"; do
    case $arg in
        --reset|-r)
            RESET_MODE=true
            echo "=== Reset mode enabled - will clean up all resources ==="
            ;;
        --helm-reset)
            HELM_RESET=true
            echo "=== Helm reset enabled - will uninstall helm release ==="
            ;;
        *)
            ;;
    esac
done

if [ "$RESET_MODE" = false ] && [ "$HELM_RESET" = false ]; then
    echo "=== Normal mode - preserving buildx driver and helm release ==="
    echo "Use --reset or -r flag to clean up all resources including buildx driver"
    echo "Use --helm-reset flag to uninstall helm release (will regenerate secrets)"
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

echo "1. Creating namespace..."

# Create namespace if it doesn't exist
NAMESPACE="catalyst-web-pr-000"
echo "Creating namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
echo "   ✓ Namespace created/verified"

echo "2. Creating PVCs, service account, and GitHub PAT secrets..."

# Create PVCs in the target namespace
echo "Creating PVCs in namespace: $NAMESPACE"
kubectl apply -f "$SCRIPT_DIR/git-cache-pvc.yaml" --namespace="$NAMESPACE"
kubectl apply -f "$SCRIPT_DIR/helm-cache-pvc.yaml" --namespace="$NAMESPACE"
echo "   ✓ PVCs created/verified"

# Create service account and RBAC resources in the target namespace
echo "Creating service account and RBAC in namespace: $NAMESPACE"
kubectl apply -f "$SCRIPT_DIR/rbac.yaml" -n "$NAMESPACE"
echo "   ✓ Service account and RBAC created"

# Create secrets in the specific namespace
kubectl delete secret github-pat-secret --namespace="$NAMESPACE" --ignore-not-found=true
kubectl create secret generic github-pat-secret --namespace="$NAMESPACE" --from-literal=token="$GITHUB_PAT" --from-literal=ghcr_token="$GITHUB_GHCR_PAT"

kubectl delete secret ghcr-registry-secret --namespace="$NAMESPACE" --ignore-not-found=true
kubectl create secret docker-registry ghcr-registry-secret \
  --namespace="$NAMESPACE" \
  --docker-server=ghcr.io \
  --docker-username=ncrmro \
  --docker-password="$GITHUB_GHCR_PAT" \
  --docker-email=ncrmro@users.noreply.github.com
echo "   ✓ Secrets created (generic PAT secret + docker registry secret)"

echo "3. Cleaning up existing resources..."
kubectl delete job pr-pod-registry-deploy --namespace="$NAMESPACE" --ignore-not-found=true

if [ "$HELM_RESET" = "true" ]; then
    echo "   Helm reset mode: Uninstalling helm release (will regenerate secrets)..."
    kubectl delete deployment web-app --namespace="$NAMESPACE" --ignore-not-found=true
    kubectl delete replicaset -l app=web-app --namespace="$NAMESPACE" --ignore-not-found=true
    kubectl delete service web-app --namespace="$NAMESPACE" --ignore-not-found=true
    helm uninstall web-app --namespace="$NAMESPACE" --ignore-not-found || true
    echo "   Cleaning up PostgreSQL persistent volume claims for web-app instance..."
    kubectl delete pvc -l app.kubernetes.io/name=postgresql,app.kubernetes.io/instance=web-app --namespace="$NAMESPACE" --ignore-not-found=true
    echo "   ✓ Helm release uninstalled and PostgreSQL data cleared"
else
    echo "   Normal mode: Preserving helm release and secrets"
fi

if [ "$RESET_MODE" = true ]; then
    echo "   Reset mode: Cleaning up buildx driver..."
    kubectl delete deployment -l app=k8s-builder0 --ignore-not-found=true
    echo "   ✓ Full cleanup complete"
else
    echo "   Normal mode: Preserving buildx driver"
    echo "   ✓ Cleanup complete (buildx driver preserved)"
fi

echo "4. Creating PR pod job with GHCR push and Helm deployment..."
# Apply the pr-pod job to the specific namespace
kubectl apply -f "$SCRIPT_DIR/pr-pod-with-registry.yaml" --namespace="$NAMESPACE"
echo "   ✓ Job created"

echo "5. Waiting for pod to start..."
sleep 5

# Get pod name
POD_NAME=$(kubectl get pods -l job-name=pr-pod-registry-deploy --namespace="$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
    echo "ERROR: Pod not found. Checking job status..."
    kubectl describe job pr-pod-registry-deploy --namespace="$NAMESPACE"
    exit 1
fi

echo "   ✓ Pod found: $POD_NAME"

echo "6. Monitoring pod status..."
kubectl wait --for=condition=Ready pod/$POD_NAME --namespace="$NAMESPACE" --timeout=120s || true

echo "7. Streaming pod logs..."
echo "----------------------------------------"
kubectl logs -f $POD_NAME --namespace="$NAMESPACE" || kubectl logs $POD_NAME --namespace="$NAMESPACE"
echo "----------------------------------------"

echo "8. Checking final job status..."
kubectl get job pr-pod-registry-deploy --namespace="$NAMESPACE"

echo "9. Checking deployed resources..."
echo "Application deployments:"
kubectl get deployments --namespace="$NAMESPACE"
echo ""
echo "Services:"
kubectl get services --namespace="$NAMESPACE"
echo ""
echo "Pods:"
kubectl get pods -l app=web-app --namespace="$NAMESPACE"

echo ""
echo "=== Test Complete ==="
echo ""
echo "Images pushed to GHCR:"
echo "  ghcr.io/ncrmro/catalyst/web:pr-000"
echo "  ghcr.io/ncrmro/catalyst/web:pr-000-cache"
echo ""
echo "To clean up resources, run:"
echo "  kubectl delete job pr-pod-registry-deploy --namespace=$NAMESPACE"
echo "  kubectl delete secret github-pat-secret --namespace=$NAMESPACE"
echo "  kubectl delete secret ghcr-registry-secret --namespace=$NAMESPACE"
echo "  helm uninstall web-app --namespace=$NAMESPACE"
echo ""
echo "To delete PVCs (will remove caches):"
echo "  kubectl delete pvc git-cache-pvc helm-cache-pvc --namespace=$NAMESPACE"