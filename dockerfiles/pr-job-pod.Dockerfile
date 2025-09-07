FROM docker:24-git

# Install APK packages for kubectl and helm
RUN apk add --no-cache \
    kubectl \
    helm \
    curl \
    bash \
    jq

# Verify installations
RUN kubectl version --client --short && \
    helm version --short && \
    git --version && \
    docker --version

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/sh"]