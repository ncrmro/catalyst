#!/bin/bash

# Script to convert a kubeconfig YAML file to base64-encoded JSON
# Usage: ./kubeconfig-to-base64.sh <path-to-kubeconfig.yml>

set -e

# Check if input file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <path-to-kubeconfig.yml>"
    echo "Example: $0 ~/.kube/config"
    exit 1
fi

KUBECONFIG_FILE="$1"

# Check if file exists
if [ ! -f "$KUBECONFIG_FILE" ]; then
    echo "Error: File '$KUBECONFIG_FILE' not found"
    exit 1
fi

echo "Converting kubeconfig to base64..."
echo "Input file: $KUBECONFIG_FILE"

# Convert YAML to JSON and base64 encode
BASE64_ENCODED=$(yq . "$KUBECONFIG_FILE" | base64 -w 0)

echo ""
echo "Base64-encoded kubeconfig (copy this value):"
echo "============================================="
echo "$BASE64_ENCODED"
echo "============================================="
echo ""
echo "To set as environment variable, run:"
echo "export KUBECONFIG_PRIMARY=\"$BASE64_ENCODED\""
echo ""
echo "Or add to your .env file:"
echo "KUBECONFIG_PRIMARY=\"$BASE64_ENCODED\""