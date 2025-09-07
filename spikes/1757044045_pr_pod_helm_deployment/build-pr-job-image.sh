#!/bin/bash

# Script to build and push the PR job pod image to GHCR

set -e

echo "=== Building PR Job Pod Image ==="
echo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration
GITHUB_USER="ncrmro"
IMAGE_NAME="ghcr.io/ncrmro/catalyst/pr-job-pod"
IMAGE_TAG="latest"

# Try to load GHCR PAT from web/.env if not already set
if [ -z "$GITHUB_GHCR_PAT" ]; then
    if [ -f "$ROOT_DIR/web/.env" ]; then
        export GITHUB_GHCR_PAT=$(grep "^GITHUB_GHCR_PAT=" "$ROOT_DIR/web/.env" | cut -d'=' -f2)
        echo "Loaded GITHUB_GHCR_PAT from web/.env"
    fi
fi

# Check if required token is set
if [ -z "$GITHUB_GHCR_PAT" ]; then
    echo "ERROR: Could not find GITHUB_GHCR_PAT"
    echo "Please ensure web/.env contains GITHUB_GHCR_PAT (classic token) or set it manually:"
    echo "  export GITHUB_GHCR_PAT=your_classic_personal_access_token"
    exit 1
fi

echo "1. Logging into GHCR..."
echo "$GITHUB_GHCR_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
echo "   ✓ Successfully logged into GHCR"

echo "2. Building image..."
docker build -t "$IMAGE_NAME:$IMAGE_TAG" -f "$SCRIPT_DIR/dockerfiles/pr-job-pod.Dockerfile" "$SCRIPT_DIR/dockerfiles"
echo "   ✓ Image built: $IMAGE_NAME:$IMAGE_TAG"

echo "3. Pushing image to GHCR..."
docker push "$IMAGE_NAME:$IMAGE_TAG"
echo "   ✓ Image pushed to GHCR"

echo ""
echo "=== Build Complete ==="
echo ""
echo "Image available at: $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "To use this image in your PR pod, update the job spec to:"
echo "  image: $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "Note: The image is public if the repository is public, or private if the repository is private."
echo "For private images, ensure you have the imagePullSecrets configured in your deployment."