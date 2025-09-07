#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status $GREEN "🧹 GitHub App Test Runner Cleanup Script"
print_status $GREEN "========================================="

NAMESPACE="arc-runners"
SECRET_NAME="github-app-auth"
RUNNER_NAME="github-app-test-runner"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_status $RED "❌ Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check kubectl connectivity
if ! kubectl cluster-info &> /dev/null; then
    print_status $RED "❌ Error: kubectl cannot connect to cluster"
    exit 1
fi

print_status $GREEN "✅ kubectl is available and connected to cluster"

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    print_status $YELLOW "⚠️  Namespace $NAMESPACE does not exist, nothing to clean up"
    exit 0
fi

print_status $GREEN "📦 Found namespace: $NAMESPACE"

# Delete runner scale set
if kubectl get runnerscaleset $RUNNER_NAME -n $NAMESPACE &> /dev/null; then
    print_status $YELLOW "🗑️  Deleting runner scale set: $RUNNER_NAME"
    kubectl delete runnerscaleset $RUNNER_NAME -n $NAMESPACE
    print_status $GREEN "✅ Runner scale set deleted"
else
    print_status $YELLOW "⚠️  Runner scale set $RUNNER_NAME not found"
fi

# Delete secret
if kubectl get secret $SECRET_NAME -n $NAMESPACE &> /dev/null; then
    print_status $YELLOW "🔐 Deleting secret: $SECRET_NAME"
    kubectl delete secret $SECRET_NAME -n $NAMESPACE
    print_status $GREEN "✅ Secret deleted"
else
    print_status $YELLOW "⚠️  Secret $SECRET_NAME not found"
fi

# Delete RBAC resources
print_status $YELLOW "🔒 Cleaning up RBAC resources..."

if kubectl get rolebinding github-runner -n $NAMESPACE &> /dev/null; then
    kubectl delete rolebinding github-runner -n $NAMESPACE
    print_status $GREEN "✅ RoleBinding deleted"
fi

if kubectl get role github-runner -n $NAMESPACE &> /dev/null; then
    kubectl delete role github-runner -n $NAMESPACE
    print_status $GREEN "✅ Role deleted"
fi

if kubectl get serviceaccount github-runner -n $NAMESPACE &> /dev/null; then
    kubectl delete serviceaccount github-runner -n $NAMESPACE
    print_status $GREEN "✅ ServiceAccount deleted"
fi

# Check if namespace is empty and offer to delete it
remaining_resources=$(kubectl get all -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
if [[ $remaining_resources -eq 0 ]]; then
    print_status $YELLOW "🗑️  Namespace $NAMESPACE appears to be empty"
    read -p "Do you want to delete the namespace? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace $NAMESPACE
        print_status $GREEN "✅ Namespace deleted"
    else
        print_status $YELLOW "⚠️  Keeping namespace $NAMESPACE"
    fi
else
    print_status $YELLOW "⚠️  Namespace $NAMESPACE contains other resources, keeping it"
fi

print_status $GREEN "🎉 Cleanup completed successfully!"