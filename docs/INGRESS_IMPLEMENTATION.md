# Domain and Ingress Management System - Implementation Guide

## Overview

This implementation adds a comprehensive domain and ingress management system to Catalyst, allowing projects to specify custom domains for preview environments and configure ingress/TLS settings.

## Problem Solved

Before this implementation:
- Preview URLs used hardcoded domains
- No way to customize domains per project
- No support for custom TLS/cert-manager configuration
- Ingress configuration was hardcoded in operator

After this implementation:
- Default domain configurable via environment variable
- Projects can specify custom domains (e.g., `previews.myapp.com`)
- Ingress can be enabled/disabled per project
- TLS configuration with cert-manager support
- Proper DNS setup documentation for users

## Architecture

### Components Modified

1. **Database Schema** (`web/src/db/schema.ts`)
   - Added fields to `projects` table:
     - `customDomain` (text, nullable) - Custom domain for project previews
     - `ingressEnabled` (boolean, default true) - Enable/disable ingress
     - `tlsEnabled` (boolean, default false) - Enable TLS with cert-manager

2. **Models Layer** (`web/src/models/preview-environments.ts`)
   - `createPreviewDeployment()` - Fetches project config from database
   - `generatePublicUrl()` - Uses custom domain if configured, falls back to `DEFAULT_PREVIEW_DOMAIN`
   - Passes ingress config to Environment CRD spec

3. **Actions Layer** (`web/src/actions/project-settings.ts`)
   - `updateProjectDomainSettings()` - Update project domain configuration
   - `getProjectDomainSettings()` - Fetch current settings
   - Domain validation

4. **Webhook Handler** (`web/src/app/api/github/webhook/route.ts`)
   - Passes `repoId` to `createPreviewDeployment()` for project config lookup

5. **CRD Types** (`web/src/types/crd.ts`)
   - Added `IngressConfig` to `EnvironmentCRSpec`
   - Fields: `enabled`, `host`, `tls` (enabled, issuer)

6. **Operator CRD** (`operator/api/v1alpha1/environment_types.go`)
   - Added `IngressConfig` and `IngressTLSConfig` types
   - Integrated into `EnvironmentSpec`

7. **Operator Controller** (`operator/internal/controller/deploy.go`)
   - `desiredIngress()` - Creates ingress based on Environment spec
   - Conditionally creates ingress (nil if disabled)
   - Uses custom hostname from spec
   - Configures TLS with cert-manager annotations

8. **Helm Deployment** (`web/src/lib/helm-deployment.ts`)
   - Added `ingressClassName`, `tlsEnabled`, `tlsIssuer` parameters
   - Generates cert-manager annotations
   - Creates TLS secrets configuration

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Default domain for preview environments
DEFAULT_PREVIEW_DOMAIN=preview.example.com

# Kubernetes ingress class (nginx, traefik, etc.)
INGRESS_CLASS_NAME=nginx

# TLS/HTTPS via cert-manager
ENABLE_TLS=true
TLS_ISSUER=letsencrypt-prod
```

### DNS Configuration

**For default domain:**
```
*.preview.example.com  CNAME  <your-ingress-loadbalancer>
```

**For custom project domains:**
```
*.previews.acme-corp.com  CNAME  <your-ingress-loadbalancer>
```

### Database Migration

Run migration to add new fields:
```bash
cd web
npm run db:migrate
```

This applies `drizzle/0015_add_project_domain_config.sql`:
```sql
ALTER TABLE "project" ADD COLUMN "custom_domain" text;
ALTER TABLE "project" ADD COLUMN "ingress_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "project" ADD COLUMN "tls_enabled" boolean DEFAULT false NOT NULL;
```

### Operator Updates

Regenerate CRDs after Go type changes:
```bash
cd operator
make generate  # Regenerates zz_generated.deepcopy.go
make manifests # Updates CRD YAML files
make install   # Applies CRDs to cluster
```

## Usage

### 1. Default Domain (All Projects)

Set environment variables:
```bash
DEFAULT_PREVIEW_DOMAIN=preview.example.com
INGRESS_CLASS_NAME=nginx
ENABLE_TLS=true
TLS_ISSUER=letsencrypt-prod
```

Configure DNS:
```
*.preview.example.com  CNAME  a1b2c3d4.us-east-1.elb.amazonaws.com
```

Result: PRs get URLs like `https://env-preview-123.preview.example.com`

### 2. Custom Project Domain

Update project via database or future UI:
```sql
UPDATE project 
SET custom_domain = 'previews.acme-corp.com',
    ingress_enabled = true,
    tls_enabled = true
WHERE slug = 'acme-app';
```

Configure DNS:
```
*.previews.acme-corp.com  CNAME  a1b2c3d4.us-east-1.elb.amazonaws.com
```

Result: PRs for this project get `https://env-preview-42.previews.acme-corp.com`

### 3. Disable Ingress (Internal Projects)

For projects that don't need public URLs:
```sql
UPDATE project 
SET ingress_enabled = false
WHERE slug = 'internal-tool';
```

Access via port-forward or NodePort only.

## Flow

### Preview Environment Creation

1. **GitHub PR opened/updated**
2. **Webhook** (`/api/github/webhook`) receives event
3. **Repo lookup** - Finds repo in database, gets repo ID
4. **Project config fetch** - Queries `projects_repos` → `projects` for settings
5. **URL generation** - `generatePublicUrl()` uses custom domain or default
6. **Environment CR creation** - Web app creates Environment CR with:
   ```yaml
   spec:
     ingress:
       enabled: true
       host: "env-preview-123.previews.acme-corp.com"
       tls:
         enabled: true
         issuer: "letsencrypt-prod"
   ```
7. **Operator reconciliation** - Operator creates:
   - Namespace
   - Deployment
   - Service
   - **Ingress** (if enabled) with TLS annotations
8. **cert-manager** - Automatically provisions TLS certificate
9. **GitHub comment** - Posts URL to PR

## Testing

### Unit Tests

Run domain generation tests:
```bash
cd web
npm run test:unit -- __tests__/unit/domain-generation.test.ts
```

Tests cover:
- DNS-safe namespace generation
- Special character sanitization
- 63-character limit enforcement
- Custom domain prioritization
- Environment variable fallbacks

### Integration Testing

1. **Start local K3s VM:**
   ```bash
   bin/k3s-vm
   ```

2. **Set test environment variables:**
   ```bash
   DEFAULT_PREVIEW_DOMAIN=preview.local
   INGRESS_CLASS_NAME=traefik  # K3s default
   ENABLE_TLS=false
   ```

3. **Create test PR** - Open PR in configured repo

4. **Verify ingress created:**
   ```bash
   bin/kubectl get ingress -A
   bin/kubectl describe ingress -n env-preview-<number>
   ```

5. **Test custom domain:**
   ```bash
   # Update project
   npm run db:studio  # Open Drizzle Studio
   # Edit project, set custom_domain = "test.preview.local"
   
   # Open new PR, verify URL uses custom domain
   ```

## Documentation

See [`web/docs/DOMAIN_CONFIGURATION.md`](../web/docs/DOMAIN_CONFIGURATION.md) for:
- Detailed DNS setup instructions
- cert-manager installation guide
- Troubleshooting common issues
- Production deployment examples
- Security considerations

## Future Enhancements

### Short Term
- [ ] Settings UI page for managing project domains
- [ ] API endpoint for domain validation
- [ ] Automatic DNS verification

### Medium Term
- [ ] Support multiple domains per project
- [ ] Custom ingress annotations per project
- [ ] Domain ownership verification
- [ ] Metrics for certificate expiry

### Long Term
- [ ] Integration with external-dns for automatic DNS management
- [ ] Support for custom TLS certificates (bring your own cert)
- [ ] Advanced routing rules (path-based routing, canary deployments)
- [ ] Multi-region ingress support

## Troubleshooting

### Preview environment not accessible

1. **Check DNS propagation:**
   ```bash
   dig env-preview-123.preview.example.com
   ```

2. **Verify ingress exists:**
   ```bash
   kubectl get ingress -n env-preview-123
   kubectl describe ingress -n env-preview-123
   ```

3. **Check ingress controller:**
   ```bash
   kubectl get pods -n ingress-nginx
   kubectl logs -n ingress-nginx <ingress-controller-pod>
   ```

### TLS certificate not provisioned

1. **Check cert-manager:**
   ```bash
   kubectl get certificate -n env-preview-123
   kubectl describe certificate -n env-preview-123
   ```

2. **Check certificate request:**
   ```bash
   kubectl get certificaterequest -n env-preview-123
   kubectl describe certificaterequest -n env-preview-123
   ```

3. **Check ClusterIssuer:**
   ```bash
   kubectl get clusterissuer
   kubectl describe clusterissuer letsencrypt-prod
   ```

4. **Check cert-manager logs:**
   ```bash
   kubectl logs -n cert-manager deployment/cert-manager
   ```

### Custom domain not working

1. **Verify project configuration:**
   ```sql
   SELECT id, slug, custom_domain, ingress_enabled, tls_enabled 
   FROM project 
   WHERE slug = 'your-project';
   ```

2. **Check Environment CR:**
   ```bash
   kubectl get environment -n default preview-<number> -o yaml
   ```

3. **Verify ingress host:**
   ```bash
   kubectl get ingress -n env-preview-<number> -o yaml | grep host
   ```

## Security Considerations

1. **Wildcard DNS** - Be aware wildcard DNS records are public
2. **TLS Certificates** - Always use TLS in production
3. **Domain Validation** - Validate domain ownership before enabling custom domains
4. **Rate Limiting** - Let's Encrypt has rate limits (50 certs per registered domain per week)
5. **Network Policies** - Preview environments are isolated by default
6. **Access Control** - Preview environments inherit project team permissions

## Deployment Checklist

Before deploying to production:

- [ ] Set `DEFAULT_PREVIEW_DOMAIN` environment variable
- [ ] Configure wildcard DNS CNAME record
- [ ] Install cert-manager if using TLS
- [ ] Create ClusterIssuer for Let's Encrypt
- [ ] Run database migrations
- [ ] Regenerate and apply operator CRDs
- [ ] Test with a sample PR
- [ ] Verify TLS certificate provisioning
- [ ] Document internal DNS setup for team
- [ ] Set up monitoring for certificate expiry
- [ ] Configure alerts for failed ingress creation

## Support

For issues or questions:
1. Check [`web/docs/DOMAIN_CONFIGURATION.md`](../web/docs/DOMAIN_CONFIGURATION.md)
2. Review unit tests in `web/__tests__/unit/domain-generation.test.ts`
3. Check operator logs: `kubectl logs -n catalyst-system deployment/catalyst-operator`
4. Review Environment CR status: `kubectl get environment -A`
