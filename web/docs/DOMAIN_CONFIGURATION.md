# Domain Configuration for Preview Environments

This guide explains how to configure custom domains for your Catalyst preview environments.

## Overview

Catalyst creates isolated preview environments for each pull request. These environments can be accessed via:

1. **Default Domain** - Automatic subdomains on your configured base domain
2. **Custom Project Domains** - Project-specific custom domains

## Default Domain Setup

### 1. Configure DNS (CNAME Records)

To enable preview environments on your domain, you need to create a wildcard CNAME record pointing to your Kubernetes ingress controller.

**Example DNS Configuration:**

```
*.preview.example.com  CNAME  ingress.your-cluster.example.com
```

This allows preview environments to be accessible at URLs like:
- `https://env-preview-123.preview.example.com`
- `https://env-preview-456.preview.example.com`

### 2. Set Environment Variables

Configure the following environment variables in your deployment:

```bash
# Base domain for preview environments
DEFAULT_PREVIEW_DOMAIN=preview.example.com

# Kubernetes ingress class
INGRESS_CLASS_NAME=nginx

# Enable TLS/HTTPS (requires cert-manager)
ENABLE_TLS=true
TLS_ISSUER=letsencrypt-prod
```

### 3. TLS Certificate Automation (Optional)

If you enable TLS, ensure cert-manager is installed in your cluster:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Custom Project Domains

Projects can specify custom domains instead of using the default preview domain.

### Setting a Custom Domain

1. Navigate to your project settings in the Catalyst UI
2. Enter your custom domain (e.g., `previews.myapp.com`)
3. Configure DNS:
   ```
   *.previews.myapp.com  CNAME  ingress.your-cluster.example.com
   ```

### Custom Domain Behavior

When a project has a custom domain configured:
- Preview URLs use the custom domain: `https://env-preview-123.previews.myapp.com`
- TLS certificates are automatically provisioned (if `ENABLE_TLS=true`)
- The default domain is not used for this project

## Ingress Controller Setup

Catalyst requires a Kubernetes ingress controller to route traffic. We recommend nginx-ingress:

### Install nginx-ingress

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

### Get Ingress LoadBalancer IP

```bash
kubectl get service -n ingress-nginx ingress-nginx-controller
```

Use this IP address as the target for your CNAME records.

## Troubleshooting

### Preview Environment Not Accessible

1. **Check DNS propagation:**
   ```bash
   dig env-preview-123.preview.example.com
   ```

2. **Verify ingress resource:**
   ```bash
   kubectl get ingress -n env-preview-123
   kubectl describe ingress -n env-preview-123
   ```

3. **Check TLS certificate:**
   ```bash
   kubectl get certificate -n env-preview-123
   kubectl describe certificate -n env-preview-123
   ```

### Certificate Issues

If using Let's Encrypt, check cert-manager logs:

```bash
kubectl logs -n cert-manager deployment/cert-manager
```

Common issues:
- DNS not properly configured
- Rate limiting (use staging issuer for testing)
- Firewall blocking HTTP-01 challenge

## Security Considerations

1. **Wildcard DNS**: Be aware that wildcard DNS records are public
2. **TLS Termination**: Always use TLS in production
3. **Network Policies**: Preview environments are isolated with NetworkPolicy
4. **Access Control**: Preview environments inherit project team permissions

## Examples

### Local Development (K3s)

```bash
# .env
DEFAULT_PREVIEW_DOMAIN=preview.localhost
INGRESS_CLASS_NAME=traefik  # K3s uses Traefik by default
ENABLE_TLS=false
```

### Production (AWS EKS)

```bash
# .env
DEFAULT_PREVIEW_DOMAIN=preview.prod.example.com
INGRESS_CLASS_NAME=nginx
ENABLE_TLS=true
TLS_ISSUER=letsencrypt-prod
```

### Custom Domain Example

```bash
# Project settings
Custom Domain: previews.acme-corp.com

# DNS Configuration
*.previews.acme-corp.com  CNAME  a1b2c3d4.us-east-1.elb.amazonaws.com

# Result
Preview URL: https://env-preview-42.previews.acme-corp.com
```

## Reference

- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [nginx-ingress Documentation](https://kubernetes.github.io/ingress-nginx/)
