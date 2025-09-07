#!/bin/bash

# Script to deploy PR pod that builds images, pushes to in-cluster registry, and deploys Helm chart

set -e

echo "=== PR Pod Helm Deployment with In-Cluster Registry ==="
echo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Try to load GITHUB_PAT from web/.env if not already set
if [ -z "$GITHUB_PAT" ]; then
    if [ -f "$ROOT_DIR/web/.env" ]; then
        export GITHUB_PAT=$(grep "^GITHUB_PAT=" "$ROOT_DIR/web/.env" | cut -d'=' -f2)
        echo "Loaded GITHUB_PAT from web/.env"
    fi
fi

# Check if GITHUB_PAT is set
if [ -z "$GITHUB_PAT" ]; then
    echo "ERROR: Could not find GITHUB_PAT"
    echo "Please ensure web/.env contains GITHUB_PAT or set it manually:"
    echo "  export GITHUB_PAT=your_personal_access_token"
    exit 1
fi

# Set kubeconfig if needed
if [ -f "$ROOT_DIR/kubeconfig.devbox.yml" ]; then
    export KUBECONFIG="$ROOT_DIR/kubeconfig.devbox.yml"
    echo "Using kubeconfig: $KUBECONFIG"
fi

echo "1. Setting up in-cluster Docker registry..."
# Deploy in-cluster registry from manifest
kubectl apply -f "$SCRIPT_DIR/registry.yaml"
echo "   ✓ In-cluster registry deployed"

# Wait for registry to be ready
echo "   Waiting for registry to be ready..."
kubectl wait --for=condition=available deployment/registry -n registry --timeout=60s

echo "2. Creating RBAC resources..."
kubectl apply -f "$SCRIPT_DIR/rbac.yaml"
echo "   ✓ RBAC resources applied"

echo "3. Creating/verifying PVCs..."
kubectl apply -f "$ROOT_DIR/spikes/1756920599_local_pr_pod_testing/git-cache-pvc.yaml"
kubectl apply -f "$ROOT_DIR/spikes/1756920599_local_pr_pod_testing/helm-cache-pvc.yaml"
echo "   ✓ PVCs created/verified"

echo "4. Creating GitHub PAT secret..."
kubectl delete secret github-pat-secret --ignore-not-found=true
kubectl create secret generic github-pat-secret --from-literal=token="$GITHUB_PAT"
echo "   ✓ Secret created"

echo "5. Cleaning up any existing job..."
kubectl delete job pr-pod-registry-deploy --ignore-not-found=true
echo "   ✓ Cleanup complete"

echo "6. Creating PR pod job with registry push and Helm deployment..."
kubectl apply -f "$SCRIPT_DIR/pr-pod-with-registry.yaml"
echo "   ✓ Job created"

echo "7. Waiting for pod to start..."
sleep 5

# Get pod name
POD_NAME=$(kubectl get pods -l job-name=pr-pod-registry-deploy -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
    echo "ERROR: Pod not found. Checking job status..."
    kubectl describe job pr-pod-registry-deploy
    exit 1
fi

echo "   ✓ Pod found: $POD_NAME"

echo "8. Monitoring pod status..."
kubectl wait --for=condition=Ready pod/$POD_NAME --timeout=120s || true

echo "9. Streaming pod logs..."
echo "----------------------------------------"
kubectl logs -f $POD_NAME || kubectl logs $POD_NAME
echo "----------------------------------------"

echo "10. Checking final job status..."
kubectl get job pr-pod-registry-deploy

echo "11. Checking deployed resources..."
echo "Registry pods:"
kubectl get pods -n registry
echo ""
echo "Application deployments:"
kubectl get deployments
echo ""
echo "Services:"
kubectl get services

echo ""
echo "=== Test Complete ==="
echo ""
echo "To clean up resources, run:"
echo "  kubectl delete job pr-pod-registry-deploy"
echo "  kubectl delete secret github-pat-secret"
echo "  kubectl delete namespace registry"
echo ""
echo "To delete PVCs (will remove caches):"
echo "  kubectl delete pvc git-cache-pvc helm-cache-pvc"