# Quickstart: Local Environment URLs

How to access and test development environments locally using hostname-based routing via `*.localhost`.

## Prerequisites

- Local K3s VM running (`bin/k3s-vm`)
- Catalyst Operator running (deployed via `bin/dev` or similar)

## Usage

### 1. Create a Development Environment

Triggers automatically on PR open, or manually:

```bash
# Example: Create an environment via kubectl (if not using web UI)
kubectl apply -f examples/environment.yaml
```

### 2. Access the Environment

Once the environment is `Ready`, you can access it via `*.localhost:8080`.

**Format**: `http://{namespace}.localhost:8080/`

**Example**:
If your environment namespace is `catalyst-catalyst-dev`:

> [http://catalyst-catalyst-dev.localhost:8080/](http://catalyst-catalyst-dev.localhost:8080/)

Modern browsers automatically resolve `*.localhost` to `127.0.0.1`, so no DNS or hosts file configuration is needed.

### 3. Verify with Playwright

Agents and tests can verify the deployment using the local URL:

```typescript
// tests/e2e/preview.spec.ts
test("preview environment loads", async ({ page }) => {
  const url =
    process.env.PREVIEW_URL || "http://catalyst-catalyst-dev.localhost:8080/";
  await page.goto(url);
  await expect(page.getByText("Welcome")).toBeVisible();
});
```

## Troubleshooting

- **404 Not Found**: Ensure the namespace in the URL matches the actual environment namespace.
- **Connection Refused**: Ensure the K3s VM is running and port 8080 is forwarded.
- **503 Service Unavailable**: The application pod might still be starting. Check `kubectl get pods -n {namespace}`.
- **DNS not resolving**: Most modern browsers support `*.localhost`. If yours doesn't, add an entry to `/etc/hosts`: `127.0.0.1 namespace.localhost`.
