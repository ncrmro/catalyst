#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory and web directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "${SCRIPT_DIR}/../../web" && pwd)"
ENV_FILE="${WEB_DIR}/.env"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status $GREEN "🚀 GitHub App Test Runner Deployment Script"
print_status $GREEN "============================================"

# Check if .env file exists
if [[ ! -f "$ENV_FILE" ]]; then
    print_status $RED "❌ Error: .env file not found at $ENV_FILE"
    print_status $YELLOW "Please create web/.env with the required GitHub App variables"
    exit 1
fi

print_status $GREEN "✅ Found .env file at $ENV_FILE"

# Source the .env file
set -a
source "$ENV_FILE"
set +a

# Required environment variables
REQUIRED_VARS=(
    "GITHUB_APP_ID"
    "GITHUB_PRIVATE_KEY"
)

# Optional variables (with defaults)
GITHUB_APP_INSTALLATION_ID=${GITHUB_APP_INSTALLATION_ID:-""}

# Validate required environment variables
print_status $GREEN "🔍 Validating required environment variables..."

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -ne 0 ]]; then
    print_status $RED "❌ Error: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        print_status $RED "   - $var"
    done
    print_status $YELLOW "Please add these variables to your web/.env file"
    exit 1
fi

print_status $GREEN "✅ All required environment variables are present"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_status $RED "❌ Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check kubectl connectivity
if ! kubectl cluster-info &> /dev/null; then
    print_status $RED "❌ Error: kubectl cannot connect to cluster"
    print_status $YELLOW "Please ensure kubectl is configured and you have access to a Kubernetes cluster"
    exit 1
fi

print_status $GREEN "✅ kubectl is available and connected to cluster"

# Create namespace if it doesn't exist
NAMESPACE="arc-runners"
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    print_status $YELLOW "📦 Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE
else
    print_status $GREEN "✅ Namespace $NAMESPACE already exists"
fi

# Check if Actions Runner Controller is installed
if ! kubectl get deployment -n arc-systems controller-manager &> /dev/null 2>&1; then
    print_status $RED "❌ Error: Actions Runner Controller not found in arc-systems namespace"
    print_status $YELLOW "Please install Actions Runner Controller first:"
    print_status $YELLOW "   helm install arc oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller"
    exit 1
fi

print_status $GREEN "✅ Actions Runner Controller is installed"

# Create GitHub App authentication secret
print_status $GREEN "🔐 Creating GitHub App authentication secret..."

# Create secret data
SECRET_NAME="github-app-auth"

# Delete existing secret if it exists
if kubectl get secret $SECRET_NAME -n $NAMESPACE &> /dev/null; then
    print_status $YELLOW "⚠️  Existing secret found, deleting and recreating..."
    kubectl delete secret $SECRET_NAME -n $NAMESPACE
fi

# Create the secret
kubectl create secret generic $SECRET_NAME \
    -n $NAMESPACE \
    --from-literal=github_app_id="$GITHUB_APP_ID" \
    --from-literal=github_app_private_key="$GITHUB_PRIVATE_KEY"

# Add installation ID if provided
if [[ -n "$GITHUB_APP_INSTALLATION_ID" ]]; then
    print_status $GREEN "📝 Adding GitHub App installation ID to secret"
    kubectl patch secret $SECRET_NAME -n $NAMESPACE \
        --patch="{\"data\":{\"github_app_installation_id\":\"$(echo -n "$GITHUB_APP_INSTALLATION_ID" | base64)\"}}"
fi

print_status $GREEN "✅ GitHub App authentication secret created"

# Apply the runner scale set manifest
print_status $GREEN "🏃 Deploying GitHub App test runner scale set..."

kubectl apply -f "$SCRIPT_DIR/runner-scale-set.yaml"

print_status $GREEN "✅ Runner scale set deployed"

# Wait for the runner scale set to be ready
print_status $YELLOW "⏳ Waiting for runner scale set to be ready..."

timeout=300
counter=0
while [[ $counter -lt $timeout ]]; do
    if kubectl get runnerscaleset github-app-test-runner -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null | grep -q "True"; then
        break
    fi
    sleep 5
    counter=$((counter + 5))
    echo -n "."
done
echo

if [[ $counter -ge $timeout ]]; then
    print_status $RED "❌ Timeout waiting for runner scale set to be ready"
    print_status $YELLOW "Check the status with: kubectl get runnerscaleset -n $NAMESPACE"
    exit 1
fi

print_status $GREEN "✅ Runner scale set is ready!"

# Display status information
print_status $GREEN "📊 Deployment Summary:"
print_status $GREEN "====================="
echo "Namespace: $NAMESPACE"
echo "Secret: $SECRET_NAME"
echo "Runner Scale Set: github-app-test-runner"
echo

print_status $GREEN "🔍 To check the status:"
echo "kubectl get runnerscaleset -n $NAMESPACE"
echo "kubectl describe runnerscaleset github-app-test-runner -n $NAMESPACE"
echo

print_status $GREEN "🧪 To test the runner:"
echo "Create a workflow that uses the 'test-runner' label"
echo

print_status $GREEN "🧹 To cleanup:"
echo "./cleanup-test-runner.sh"

print_status $GREEN "🎉 GitHub App test runner deployment completed successfully!"