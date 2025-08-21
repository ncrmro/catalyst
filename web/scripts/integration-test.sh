#!/bin/bash

# Integration test script for Kubernetes deployment endpoint
# This script should be run in an environment with kubectl access to a Kubernetes cluster

set -e

echo "🔄 Starting Kubernetes Integration Test..."

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT="$BASE_URL/api/kubernetes/deploy-nginx"
TIMEOUT=30

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl and configure it to access your cluster."
    exit 1
fi

# Check if kubectl can access the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot access Kubernetes cluster. Please configure kubectl properly."
    exit 1
fi

echo "✅ kubectl is available and can access the cluster"

# Function to clean up deployments
cleanup() {
    if [ ! -z "$DEPLOYMENT_NAME" ]; then
        echo "🧹 Cleaning up deployment: $DEPLOYMENT_NAME"
        kubectl delete deployment "$DEPLOYMENT_NAME" -n default --ignore-not-found=true
    fi
}

# Set up cleanup trap
trap cleanup EXIT

echo "🚀 Calling deployment endpoint..."

# Call the API endpoint
RESPONSE=$(curl -s "$ENDPOINT")
echo "📦 API Response: $RESPONSE"

# Parse the response
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
    ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
    echo "❌ API call failed: $ERROR"
    exit 1
fi

# Extract deployment name
DEPLOYMENT_NAME=$(echo "$RESPONSE" | jq -r '.deployment.name')
NAMESPACE=$(echo "$RESPONSE" | jq -r '.deployment.namespace')

echo "✅ Deployment request successful"
echo "📝 Deployment name: $DEPLOYMENT_NAME"
echo "📝 Namespace: $NAMESPACE"

# Wait a moment for the deployment to be created
echo "⏳ Waiting for deployment to be created..."
sleep 5

# Verify deployment exists
echo "🔍 Verifying deployment exists..."
if kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo "✅ Deployment exists in Kubernetes"
else
    echo "❌ Deployment not found in Kubernetes"
    exit 1
fi

# Check deployment status
echo "📊 Checking deployment status..."
kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE"

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
if kubectl wait --for=condition=available deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
    echo "✅ Deployment is ready"
else
    echo "❌ Deployment failed to become ready within ${TIMEOUT} seconds"
    kubectl describe deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE"
    exit 1
fi

# Verify pod is running
echo "🔍 Checking pods..."
PODS=$(kubectl get pods -l app=nginx -l deployment="$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
if [ -z "$PODS" ]; then
    echo "❌ No pods found for deployment"
    exit 1
fi

echo "✅ Found pods: $PODS"

# Check pod status
for POD in $PODS; do
    echo "📊 Checking pod status: $POD"
    kubectl get pod "$POD" -n "$NAMESPACE"
    
    # Wait for pod to be ready
    if kubectl wait --for=condition=ready pod/"$POD" -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
        echo "✅ Pod $POD is ready"
    else
        echo "❌ Pod $POD failed to become ready"
        kubectl describe pod "$POD" -n "$NAMESPACE"
        exit 1
    fi
done

# Verify deployment labels
echo "🔍 Verifying deployment labels..."
LABELS=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.labels}')
echo "📝 Deployment labels: $LABELS"

# Check for expected labels
if kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.labels.app}' | grep -q "nginx"; then
    echo "✅ App label is correct"
else
    echo "❌ App label is missing or incorrect"
    exit 1
fi

if kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.labels.created-by}' | grep -q "catalyst-web-app"; then
    echo "✅ Created-by label is correct"
else
    echo "❌ Created-by label is missing or incorrect"
    exit 1
fi

# Verify container image
echo "🔍 Verifying container image..."
IMAGE=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
if [ "$IMAGE" = "nginx:1.25" ]; then
    echo "✅ Container image is correct: $IMAGE"
else
    echo "❌ Container image is incorrect. Expected: nginx:1.25, Got: $IMAGE"
    exit 1
fi

# Verify resource limits
echo "🔍 Verifying resource limits..."
CPU_LIMIT=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
MEMORY_LIMIT=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')
CPU_REQUEST=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}')
MEMORY_REQUEST=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers.requests.memory}')

echo "📝 Resource limits - CPU: $CPU_LIMIT, Memory: $MEMORY_LIMIT"
echo "📝 Resource requests - CPU: $CPU_REQUEST, Memory: $MEMORY_REQUEST"

if [ "$CPU_LIMIT" = "100m" ] && [ "$MEMORY_LIMIT" = "128Mi" ] && [ "$CPU_REQUEST" = "50m" ] && [ "$MEMORY_REQUEST" = "64Mi" ]; then
    echo "✅ Resource limits and requests are correct"
else
    echo "❌ Resource limits or requests are incorrect"
    exit 1
fi

echo "🎉 All tests passed! Kubernetes integration is working correctly."
echo "🧹 Cleaning up deployment..."

# Cleanup will happen automatically due to trap