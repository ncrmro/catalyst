# Local Preview URL Testing

**Context**: Testing preview environment URLs in local K3s development

Preview environments generate public URLs for browser testing. In production, these use hostname-based routing (e.g., `https://env-preview-123.preview.catalyst.dev`). In local development, URLs require special handling since wildcard DNS doesn't resolve by default.

## Local vs Production Architecture

```
Production (hostname-based routing):
┌─────────────────────────────────────────────────────────────┐
│  https://env-preview-123.preview.catalyst.dev               │
│                            │                                │
│                   DNS resolves hostname                     │
│                            │                                │
│                            ▼                                │
│  Ingress Controller → routes by Host header → Service       │
└─────────────────────────────────────────────────────────────┘

Local Development (path-based routing):
┌─────────────────────────────────────────────────────────────┐
│  http://localhost:8080/env-preview-123/                       │
│                            │                                │
│              No DNS needed (localhost)                      │
│                            │                                │
│                            ▼                                │
│  Ingress Controller → routes by path prefix → Service       │
└─────────────────────────────────────────────────────────────┘
```

**Key difference**: Local development uses path-based routing to avoid DNS configuration requirements while still using the same NGINX ingress controller as production.

## Overview

The challenge:

- Preview environments use dynamically generated identifiers
- Production uses hostname-based routing requiring DNS
- Local development needs a rootless, offline-capable solution
- Solutions must work for both manual browser testing and Playwright automation

## Approach 1: Path-Based Routing (Recommended for Local Dev)

**Rootless, offline, uses real NGINX ingress** - the recommended approach for local development.

### How It Works

Instead of routing by hostname, the local K3s VM uses path prefixes:

| Environment | Production URL                                  | Local URL                                |
| ----------- | ----------------------------------------------- | ---------------------------------------- |
| PR #123     | `https://env-preview-123.preview.catalyst.dev/` | `http://localhost:8080/env-preview-123/` |
| PR #456     | `https://env-preview-456.preview.catalyst.dev/` | `http://localhost:8080/env-preview-456/` |

NGINX ingress rewrites the path prefix before forwarding to the service, so the application sees requests at `/` regardless of environment.

### Setup

Path-based routing is the default for local development. No configuration needed.

```bash
# Start K3s VM (ingress is pre-configured)
bin/k3s-vm

# Preview environments are accessible at:
# http://localhost:8080/env-preview-{namespace}/
```

### Ingress Configuration

The operator creates path-based ingress resources for local dev:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: preview-env-preview-123
  namespace: env-preview-123
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /env-preview-123(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: app
                port:
                  number: 3000
```

### Playwright Testing

```typescript
// Local development URL
const previewUrl = "http://localhost:8080/env-preview-123/";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(previewUrl);

await expect(page.locator("h1")).toContainText("Welcome");
await browser.close();
```

### Trade-offs

| Pros                                 | Cons                               |
| ------------------------------------ | ---------------------------------- |
| Rootless - no sudo/admin required    | URLs differ from production        |
| Works completely offline             | Path prefix visible in URL         |
| Uses real NGINX ingress              | Applications must handle base path |
| Multiple environments simultaneously |                                    |
| Zero configuration                   |                                    |

**Best for:** Default local development, CI pipelines, rootless environments.

### Why URLs Differ from Production

Production uses hostname-based routing because:

- Real DNS with wildcard certificates
- Clean URLs without path prefixes
- Standard web application behavior

Local development uses path-based routing because:

- No DNS configuration required (rootless)
- Works offline without external services
- Simple port forwarding from VM to host

The routing mechanism (NGINX ingress) is identical - only the routing key differs (hostname vs path).

---

## Alternative Approaches

The following approaches are available when path-based routing doesn't fit your needs (e.g., testing production-like hostname routing).

## Approach 2: nip.io Wildcard DNS

Free wildcard DNS services that resolve any subdomain containing an IP address to that IP.

### How It Works

- `pr-123.127.0.0.1.nip.io` resolves to `127.0.0.1`
- `pr-123.192.168.1.100.nip.io` resolves to `192.168.1.100`
- Works with any IP address embedded in the hostname
- No local configuration required

**Services:**

| Service  | URL              | Notes                      |
| -------- | ---------------- | -------------------------- |
| nip.io   | https://nip.io   | Original service           |
| sslip.io | https://sslip.io | Alternative with TLS focus |
| traefik  | `*.traefik.me`   | Resolves to 127.0.0.1 only |

### Setup

```bash
# In web/.env
PREVIEW_DOMAIN=127.0.0.1.nip.io
```

### Usage

With this configuration, preview environments generate URLs like:

```
http://env-preview-123.127.0.0.1.nip.io:30000
```

**Browser Access:**

Navigate directly to the URL. DNS resolution happens automatically.

**Playwright Testing:**

```typescript
// Agent can test the real URL
await page.goto("http://env-preview-123.127.0.0.1.nip.io:30000");
await expect(page.locator("h1")).toContainText("Welcome");
```

### Trade-offs

| Pros                                  | Cons                                 |
| ------------------------------------- | ------------------------------------ |
| Zero local configuration              | Requires internet for DNS resolution |
| Works on any machine immediately      | Adds external dependency             |
| Compatible with Playwright automation | Port must be included in URL         |
| No system-level changes needed        | HTTPS requires additional setup      |

## Approach 3: Hosts File Entries

Manual DNS resolution via system hosts file.

### Setup

**Linux/macOS:**

```bash
# Add to /etc/hosts
127.0.0.1 env-preview-123.preview.localhost
127.0.0.1 env-preview-456.preview.localhost
```

**Windows:**

```powershell
# Add to C:\Windows\System32\drivers\etc\hosts
127.0.0.1 env-preview-123.preview.localhost
```

### Trade-offs

| Pros                                 | Cons                               |
| ------------------------------------ | ---------------------------------- |
| No external dependencies             | Manual entry for each environment  |
| Works offline                        | Requires admin/sudo access         |
| Simple to understand                 | Doesn't scale with many PRs        |
| No port in URL needed (with ingress) | Must update when namespaces change |

**Best for:** Single PR testing, offline development, CI environments with known hostnames.

## Approach 4: Local DNS Server (dnsmasq)

Wildcard DNS resolution for `*.preview.localhost` domains.

### Setup

**Linux (systemd-resolved):**

```bash
# /etc/dnsmasq.d/preview.conf
address=/preview.localhost/127.0.0.1

# Restart dnsmasq
sudo systemctl restart dnsmasq
```

**macOS (Homebrew):**

```bash
brew install dnsmasq

# Configure wildcard
echo 'address=/preview.localhost/127.0.0.1' >> /opt/homebrew/etc/dnsmasq.conf

# Start service
sudo brew services start dnsmasq

# Point resolver to dnsmasq
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/preview.localhost
```

**NixOS:**

```nix
services.dnsmasq = {
  enable = true;
  extraConfig = ''
    address=/preview.localhost/127.0.0.1
  '';
};
```

### Trade-offs

| Pros                            | Cons                                 |
| ------------------------------- | ------------------------------------ |
| Automatic wildcard resolution   | System configuration required        |
| Works offline                   | Setup varies by OS                   |
| No external dependencies        | May conflict with VPNs/corporate DNS |
| Matches production URL patterns | Requires admin access                |

**Best for:** Frequent local development, teams with standardized dev environments.

## Approach 5: Cloudflare Tunnel

Real public URLs via Cloudflare's tunnel service.

### Setup

```bash
# Install cloudflared
brew install cloudflared  # macOS
# or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create catalyst-dev

# Run tunnel pointing to local ingress
cloudflared tunnel run --url http://localhost:30000 catalyst-dev
```

This provides a public URL like `https://catalyst-dev-abc123.cfargotunnel.com`.

### Integration with Catalyst

```bash
# In web/.env
PREVIEW_DOMAIN=catalyst-dev-abc123.cfargotunnel.com
```

### Trade-offs

| Pros                              | Cons                                  |
| --------------------------------- | ------------------------------------- |
| Real public URLs                  | Requires Cloudflare account           |
| Automatic TLS certificates        | External dependency                   |
| Accessible from anywhere          | Exposes local environment to internet |
| Enables external webhook testing  | May have latency                      |
| Perfect for demo/review scenarios | Free tier has limitations             |

**Best for:** Demo environments, external stakeholder review, webhook testing.

## Approach 6: NodePort Direct Access

Bypass hostname routing entirely.

### Setup

No DNS configuration needed. Access services directly:

```bash
# Access preview environment via NodePort
curl http://localhost:30000
```

### Limitations

- Only one service per port
- No hostname-based routing (can't distinguish between PRs)
- Must know the correct port for each service

### Trade-offs

| Pros                     | Cons                                |
| ------------------------ | ----------------------------------- |
| Works immediately        | Single service per port             |
| No configuration needed  | No multi-environment support        |
| Simple for quick testing | Doesn't test real URL routing       |
| Fastest to set up        | Port numbers change per environment |

**Best for:** Quick smoke tests, single environment development.

## Relevance to Catalyst

### Developer Workflow

1. **Default local development**: Use path-based routing (Approach 1) - rootless, offline, zero-config
2. **Testing hostname routing**: Use nip.io (Approach 2) when you need production-like URLs
3. **Stakeholder demos**: Use Cloudflare Tunnel (Approach 5) for shareable public URLs

### Agent Testing with Playwright

Agents running inside development environments can test preview URLs:

```typescript
// Local development URL (path-based)
const previewUrl = process.env.PREVIEW_URL; // e.g., http://localhost:8080/env-preview-123/

// Production URL (hostname-based)
// const previewUrl = process.env.PREVIEW_URL; // e.g., https://env-preview-123.preview.catalyst.dev/

// Agent tests the URL
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(previewUrl);

// Verify the deployment
await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible();
await browser.close();
```

### K3s VM Integration

The local K3s VM forwards ports to the host:

| Port  | Service                      |
| ----- | ---------------------------- |
| 8080  | NGINX Ingress (path routing) |
| 6443  | Kubernetes API               |
| 30000 | Web application (NodePort)   |
| 30432 | PostgreSQL (NodePort)        |

With NGINX ingress deployed in K3s:

- **Path-based routing** works out of the box via port 8080
- **Hostname-based routing** requires DNS configuration (nip.io, dnsmasq, etc.)

## Summary

| Approach          | Config Effort | Offline | Rootless | Multi-PR | Recommended For               |
| ----------------- | ------------- | ------- | -------- | -------- | ----------------------------- |
| **Path-based**    | None          | Yes     | Yes      | Yes      | **Default local development** |
| nip.io            | None          | No      | Yes      | Yes      | Online dev with hostname URLs |
| Hosts file        | Per-PR        | Yes     | No       | Manual   | Single PR, CI pipelines       |
| dnsmasq           | One-time      | Yes     | No       | Yes      | Power users, team standards   |
| Cloudflare Tunnel | One-time      | No      | Yes      | Yes      | Demos, external access        |
| NodePort direct   | None          | Yes     | Yes      | No       | Quick smoke tests             |

## GitHub Actions with Kind

The project uses Kind (Kubernetes in Docker) for CI testing. Path-based routing works with Kind using the same pattern as local K3s VM development.

### Kind Cluster Setup

The existing workflow (`.github/workflows/test.kind.yml`) uses:

```yaml
- name: Create Kind cluster
  uses: helm/kind-action@v1.10.0
  with:
    cluster_name: test-cluster
```

### Installing NGINX Ingress in Kind

Add ingress-nginx installation after cluster creation:

```yaml
- name: Install NGINX Ingress Controller
  run: |
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=90s
```

### Exposing Ingress for Path-Based Routing

Kind requires special configuration for ingress. Create a Kind config with port mappings:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
```

Use in workflow:

```yaml
- uses: helm/kind-action@v1.10.0
  with:
    config: kind-config.yaml
```

### Testing Preview URLs in Kind

```yaml
- name: Deploy preview environment
  run: |
    # Create namespace and deploy app
    kubectl create namespace env-preview-123
    kubectl apply -f preview-deployment.yaml -n env-preview-123

- name: Create path-based Ingress
  run: |
    kubectl apply -f - <<EOF
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: preview-ingress
      namespace: env-preview-123
      annotations:
        nginx.ingress.kubernetes.io/rewrite-target: /\$2
    spec:
      ingressClassName: nginx
      rules:
        - http:
            paths:
              - path: /env-preview-123(/|$)(.*)
                pathType: ImplementationSpecific
                backend:
                  service:
                    name: app
                    port:
                      number: 3000
    EOF

- name: Test with Playwright
  run: npx playwright test
  env:
    PREVIEW_URL: "http://localhost:8080/env-preview-123/"
    LOCAL_PREVIEW_ROUTING: "true"
    INGRESS_PORT: "8080"
```

### Key Differences: Kind vs K3s VM

| Aspect          | K3s VM (Local)   | Kind (CI)              |
| --------------- | ---------------- | ---------------------- |
| Ingress install | Helm (automatic) | kubectl apply          |
| Port exposure   | QEMU forwarding  | Kind extraPortMappings |
| Requirements    | Nix + KVM        | Docker only            |
| Best for        | Local dev        | GitHub Actions         |

See `web/docs/kind-cluster-testing.md` for more details on the existing Kind setup.

## References

- [nip.io](https://nip.io/) - Wildcard DNS for any IP address
- [sslip.io](https://sslip.io/) - Alternative wildcard DNS service
- [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html) - Lightweight DNS forwarder
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) - Secure tunnels to localhost
- [NGINX Ingress Controller](./research.nginx-ingress.md) - Kubernetes ingress for hostname routing
