#!/bin/bash

# Script to test PR pod with GitHub PAT locally

set -e

echo "=== PR Pod Local Testing with PAT ==="
echo

# Try to load GITHUB_PAT from web/.env if not already set
if [ -z "$GITHUB_PAT" ]; then
    # Try different paths to find the .env file
    if [ -f "../../web/.env" ]; then
        export GITHUB_PAT=$(grep "^GITHUB_PAT=" ../../web/.env | cut -d'=' -f2)
        echo "Loaded GITHUB_PAT from ../../web/.env"
    elif [ -f "../../../web/.env" ]; then
        export GITHUB_PAT=$(grep "^GITHUB_PAT=" ../../../web/.env | cut -d'=' -f2)
        echo "Loaded GITHUB_PAT from ../../../web/.env"
    elif [ -f "web/.env" ]; then
        export GITHUB_PAT=$(grep "^GITHUB_PAT=" web/.env | cut -d'=' -f2)
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
if [ -f "$(pwd)/kubeconfig.devbox.yml" ]; then
    export KUBECONFIG=$(pwd)/kubeconfig.devbox.yml
    echo "Using kubeconfig: $KUBECONFIG"
elif [ -f "$(pwd)/../../kubeconfig.devbox.yml" ]; then
    export KUBECONFIG=$(pwd)/../../kubeconfig.devbox.yml
    echo "Using kubeconfig: $KUBECONFIG"
fi

echo "1. Creating/verifying RBAC resources..."
# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Always apply RBAC resources to ensure they're up to date
echo "   Applying RBAC resources..."
kubectl apply -f "$SCRIPT_DIR/rbac.yaml"
echo "   ✓ RBAC resources applied"
echo

echo "2. Creating/verifying Git cache PVC..."
# Check if PVC exists
if kubectl get pvc git-cache-pvc &>/dev/null; then
    echo "   ✓ PVC 'git-cache-pvc' already exists"
else
    echo "   Creating PVC for Git cache..."
    kubectl apply -f "$SCRIPT_DIR/git-cache-pvc.yaml"
    echo "   ✓ Git cache PVC created"
fi
echo

echo "3. Creating/verifying Helm cache PVC..."
# Check if Helm cache PVC exists
if kubectl get pvc helm-cache-pvc &>/dev/null; then
    echo "   ✓ PVC 'helm-cache-pvc' already exists"
else
    echo "   Creating PVC for Helm cache..."
    kubectl apply -f "$SCRIPT_DIR/helm-cache-pvc.yaml"
    echo "   ✓ Helm cache PVC created"
fi
echo

echo "4. Creating GitHub PAT secret in Kubernetes..."
kubectl delete secret github-pat-secret --ignore-not-found=true
kubectl create secret generic github-pat-secret --from-literal=token="$GITHUB_PAT"
echo "   ✓ Secret created"
echo

echo "5. Cleaning up any existing test jobs..."
kubectl delete job test-pr-pod-with-pat --ignore-not-found=true
echo "   ✓ Cleanup complete"
echo

echo "6. Creating PR pod job..."
kubectl apply -f "$SCRIPT_DIR/test-pr-pod.yaml"
echo "   ✓ Job created"
echo

echo "7. Waiting for pod to start..."
sleep 5

# Get pod name
POD_NAME=$(kubectl get pods -l job-name=test-pr-pod-with-pat -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
    echo "ERROR: Pod not found. Checking job status..."
    kubectl describe job test-pr-pod-with-pat
    exit 1
fi

echo "   ✓ Pod found: $POD_NAME"
echo

echo "8. Monitoring pod status..."
kubectl wait --for=condition=Ready pod/$POD_NAME --timeout=60s || true
echo

echo "9. Streaming pod logs..."
echo "----------------------------------------"
kubectl logs -f $POD_NAME || kubectl logs $POD_NAME
echo "----------------------------------------"
echo

echo "10. Checking final job status..."
kubectl get job test-pr-pod-with-pat
echo

echo "11. Pod status:"
kubectl get pod $POD_NAME
echo

echo "=== Test Complete ==="
echo
echo "To clean up resources, run:"
echo "  kubectl delete job test-pr-pod-with-pat"
echo "  kubectl delete secret github-pat-secret"
echo ""
echo "To delete the Git cache PVC (will remove cached repository):"
echo "  kubectl delete pvc git-cache-pvc"
echo ""
echo "To delete the Helm cache PVC (will remove cached Helm binary):"
echo "  kubectl delete pvc helm-cache-pvc"
echo ""
echo "To delete RBAC resources:"
echo "  kubectl delete -f rbac.yaml"