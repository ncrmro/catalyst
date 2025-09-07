FROM docker:24-git

# Install APK packages and verify installations
RUN <<EOF
set -e
echo "=== Installing tools ==="
apk add --no-cache \
    kubectl \
    helm \
    curl \
    bash \
    jq

echo "=== Verifying installations ==="
kubectl version --client
helm version --short
git --version
docker --version
echo "=== All tools verified ==="
EOF

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/sh"]