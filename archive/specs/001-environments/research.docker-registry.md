# Docker Distribution Registry

**Source**: https://distribution.github.io/distribution/about/deploying/

Docker Distribution (formerly Docker Registry) is an open-source container image registry that stores and distributes container images. Catalyst uses it to store images built from PR branches for preview environments.

## Overview

The registry runs as a container and provides:

- OCI-compliant image storage
- Pull/push API for container runtimes
- Multiple storage backends (local, S3, GCS, Azure)
- Authentication and TLS support

## Deployment

### Basic Deployment

```bash
docker run -d -p 5000:5000 --restart=always --name registry registry:3
```

### Production Deployment

Production registries require TLS and authentication:

```yaml
# docker-compose.yml
version: "3"
services:
  registry:
    image: registry:3
    ports:
      - "5000:5000"
    environment:
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
    volumes:
      - ./certs:/certs
      - ./auth:/auth
      - registry-data:/var/lib/registry

volumes:
  registry-data:
```

## Storage Backends

### Local Storage (Default)

Data persists via Docker volumes:

```bash
docker run -d \
  -p 5000:5000 \
  -v /mnt/registry:/var/lib/registry \
  registry:3
```

### S3 Storage

For distributed/HA deployments:

```yaml
storage:
  s3:
    accesskey: AKIAIOSFODNN7EXAMPLE
    secretkey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    region: us-east-1
    bucket: my-registry-bucket
```

### Garbage Collection

Clean up unreferenced blobs:

```bash
docker exec registry bin/registry garbage-collect /etc/docker/registry/config.yml
```

## Authentication

### Basic Auth (htpasswd)

```bash
# Create htpasswd file
htpasswd -Bbn admin password > auth/htpasswd

# Configure registry
REGISTRY_AUTH=htpasswd
REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd
```

### Token-Based Auth

For integration with external identity providers:

```yaml
auth:
  token:
    realm: https://auth.example.com/token
    service: registry.example.com
    issuer: auth.example.com
    rootcertbundle: /etc/registry/auth.pem
```

## Kubernetes Deployment

### Helm Chart

```bash
helm repo add twuni https://helm.twun.io
helm install registry twuni/docker-registry \
  --set persistence.enabled=true \
  --set persistence.size=50Gi
```

### Example Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry
  namespace: registry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry
  template:
    metadata:
      labels:
        app: registry
    spec:
      containers:
        - name: registry
          image: registry:3
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: registry-data
              mountPath: /var/lib/registry
          env:
            - name: REGISTRY_HTTP_SECRET
              valueFrom:
                secretKeyRef:
                  name: registry-secret
                  key: http-secret
      volumes:
        - name: registry-data
          persistentVolumeClaim:
            claimName: registry-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: registry
  namespace: registry
spec:
  ports:
    - port: 5000
      targetPort: 5000
  selector:
    app: registry
```

## Relevance to Catalyst

### PR Image Storage

When a PR is opened:

1. Build job creates image from PR branch
2. Image pushed to internal registry: `registry.cluster.local:5000/project/app:pr-123`
3. Preview environment pulls from this registry
4. On PR close, image can be garbage collected

### Configuration

```yaml
# Catalyst registry config
registry:
  host: registry.cluster.local:5000
  insecure: true # Internal cluster, TLS terminated at ingress
```

### Network Policy

Registry needs to be accessible from:

- Build job pods (push)
- Preview environment pods (pull)
- Node kubelet (pull for scheduling)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: registry-access
  namespace: registry
spec:
  podSelector:
    matchLabels:
      app: registry
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector: {} # All namespaces can pull
      ports:
        - protocol: TCP
          port: 5000
```

## References

- [Docker Distribution](https://distribution.github.io/distribution/)
- [Deploying a Registry](https://distribution.github.io/distribution/about/deploying/)
- [Registry Configuration](https://distribution.github.io/distribution/about/configuration/)
- [Garbage Collection](https://distribution.github.io/distribution/about/garbage-collection/)
