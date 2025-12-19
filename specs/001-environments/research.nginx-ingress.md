# NGINX Ingress Controller

**Source**: https://kubernetes.github.io/ingress-nginx/

The NGINX Ingress Controller routes external HTTP/HTTPS traffic to services within the Kubernetes cluster. Catalyst uses it to expose preview environments and development workspaces via public URLs.

## Overview

The ingress controller:

- Watches Ingress resources across namespaces
- Dynamically configures NGINX based on Ingress specs
- Handles TLS termination
- Supports path-based and host-based routing

## Installation

### Helm

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Bare Metal

For non-cloud environments, use NodePort or hostNetwork:

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.type=NodePort \
  --set controller.hostNetwork=true
```

## Ingress Resource

### Basic Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: dev-pr-123
spec:
  ingressClassName: nginx
  rules:
    - host: pr-123.preview.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 3000
```

### TLS Termination

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: dev-pr-123
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - pr-123.preview.example.com
      secretName: pr-123-tls
  rules:
    - host: pr-123.preview.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 3000
```

## Annotations

Common annotations for customizing behavior:

| Annotation                                       | Description       |
| ------------------------------------------------ | ----------------- |
| `nginx.ingress.kubernetes.io/rewrite-target`     | URL rewriting     |
| `nginx.ingress.kubernetes.io/ssl-redirect`       | Force HTTPS       |
| `nginx.ingress.kubernetes.io/proxy-body-size`    | Max request body  |
| `nginx.ingress.kubernetes.io/proxy-read-timeout` | Backend timeout   |
| `nginx.ingress.kubernetes.io/websocket-services` | WebSocket support |
| `nginx.ingress.kubernetes.io/affinity`           | Session affinity  |

### WebSocket Support

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

### Large File Uploads

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
```

## Wildcard DNS

For dynamic preview environments, use wildcard DNS:

1. Configure DNS: `*.preview.example.com -> ingress-nginx IP`
2. Each PR gets unique hostname: `pr-123.preview.example.com`
3. Ingress controller routes based on Host header

### Wildcard TLS Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-preview
  namespace: ingress-nginx
spec:
  secretName: wildcard-preview-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.preview.example.com"
```

Reference in Ingress:

```yaml
spec:
  tls:
    - hosts:
        - "*.preview.example.com"
      secretName: wildcard-preview-tls
```

## ConfigMap Settings

Global NGINX configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  proxy-body-size: "50m"
  proxy-read-timeout: "300"
  proxy-send-timeout: "300"
  use-forwarded-headers: "true"
  compute-full-forwarded-for: "true"
```

## Relevance to Catalyst

### Preview Environment Routing

Each preview environment gets:

1. Unique namespace: `dev-pr-123`
2. Service exposing the app
3. Ingress with PR-specific hostname

```yaml
# Created by kube-operator when PR is opened
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: preview
  namespace: dev-pr-123
  labels:
    catalyst.dev/pr: "123"
    catalyst.dev/repo: "org-repo"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - pr-123-org-repo.preview.catalyst.dev
      secretName: wildcard-preview-tls
  rules:
    - host: pr-123-org-repo.preview.catalyst.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 3000
```

### Development Environment (DevPod)

For VS Code browser access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devpod-ide
  namespace: dev-pr-123
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  rules:
    - host: ide-pr-123.preview.catalyst.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: openvscode-server
                port:
                  number: 3000
```

### Network Policy Integration

Ingress controller needs access to all preview namespaces:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-nginx
  namespace: dev-pr-123
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
```

## References

- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [ConfigMap](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
- [TLS/HTTPS](https://kubernetes.github.io/ingress-nginx/user-guide/tls/)
