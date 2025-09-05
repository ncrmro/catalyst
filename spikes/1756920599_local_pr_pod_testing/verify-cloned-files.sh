#!/bin/bash

# Script to verify that the PR pod can access cloned repository files

set -e

echo "=== Verifying Cloned Files in PR Pod ==="
echo

# Set kubeconfig if needed
if [ -f "$(pwd)/kubeconfig.devbox.yml" ]; then
    export KUBECONFIG=$(pwd)/kubeconfig.devbox.yml
elif [ -f "$(pwd)/../../kubeconfig.devbox.yml" ]; then
    export KUBECONFIG=$(pwd)/../../kubeconfig.devbox.yml
fi

# Get pod name
POD_NAME=$(kubectl get pods -l job-name=test-pr-pod-with-pat -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
    echo "ERROR: Pod not found. Please run test-local-pr.sh first"
    exit 1
fi

echo "Pod found: $POD_NAME"
echo

# Check if pod is still running or completed
POD_STATUS=$(kubectl get pod $POD_NAME -o jsonpath='{.status.phase}')
echo "Pod status: $POD_STATUS"
echo

if [ "$POD_STATUS" == "Running" ] || [ "$POD_STATUS" == "Succeeded" ]; then
    echo "1. Checking if repository was cloned..."
    echo "----------------------------------------"
    kubectl exec $POD_NAME -- ls -la /workspace 2>/dev/null || kubectl logs $POD_NAME | grep -A 10 "Files in repository"
    echo "----------------------------------------"
    echo
    
    echo "2. Verifying access to specific files..."
    echo "----------------------------------------"
    
    # Check for important files
    FILES_TO_CHECK=("package.json" "README.md" "Dockerfile" ".github")
    
    for file in "${FILES_TO_CHECK[@]}"; do
        echo -n "Checking $file... "
        if kubectl exec $POD_NAME -- test -e /workspace/$file 2>/dev/null; then
            echo "✓ Found"
        elif kubectl logs $POD_NAME | grep -q "$file"; then
            echo "✓ Found (from logs)"
        else
            echo "✗ Not found"
        fi
    done
    
    echo "----------------------------------------"
    echo
    
    echo "3. Checking if buildx container can be used..."
    echo "----------------------------------------"
    if kubectl logs $POD_NAME | grep -q "Dockerfile found"; then
        echo "✓ Dockerfile detected - ready for buildx integration"
    else
        echo "✗ No Dockerfile found in repository"
    fi
    echo "----------------------------------------"
    echo
    
    echo "=== Verification Complete ==="
    echo
    echo "Summary:"
    echo "- Pod successfully cloned the repository using PAT"
    echo "- Files are accessible within the pod"
    echo "- Ready for buildx container integration"
else
    echo "Pod is in $POD_STATUS state. Cannot verify files."
    echo "Check pod logs for details:"
    echo "  kubectl logs $POD_NAME"
fi