#!/bin/bash

# Script to build E2E test image for Helm tests
# Usage: ./build-e2e-image.sh [IMAGE_NAME] [TAG]

set -e

IMAGE_NAME=${1:-"catalyst-web-e2e"}
TAG=${2:-"latest"}
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

echo "Building E2E test image: ${FULL_IMAGE}"

# Build the E2E test image
docker build -f Dockerfile.e2e -t "${FULL_IMAGE}" .

echo "✅ E2E test image built successfully: ${FULL_IMAGE}"
echo ""
echo "To use this image with Helm:"
echo "helm install my-nextjs-app ../charts/nextjs \\"
echo "  --set image.repository=my-nextjs-app \\"
echo "  --set image.tag=v1.0.0 \\"
echo "  --set e2eTests.image.repository=${IMAGE_NAME} \\"
echo "  --set e2eTests.image.tag=${TAG}"
echo ""
echo "To run Helm tests:"
echo "helm test my-nextjs-app"