# Quickstart: Local Environment URLs

How to access and test development environments locally using path-based routing.

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

Once the environment is `Ready`, you can access it via `localhost:8080`.

**Format**: `http://localhost:8080/{namespace}/`

**Example**:
If your environment namespace is `env-preview-123`:
> [http://localhost:8080/env-preview-123/](http://localhost:8080/env-preview-123/)

### 3. Verify with Playwright

Agents and tests can verify the deployment using the local URL:

```typescript
// tests/e2e/preview.spec.ts
test('preview environment loads', async ({ page }) => {
  const url = process.env.PREVIEW_URL || 'http://localhost:8080/env-preview-123/';
  await page.goto(url);
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

## Troubleshooting

- **404 Not Found**: Ensure the trailing slash is included: `/env-preview-123/`.
- **Connection Refused**: Ensure the K3s VM is running and port 8080 is forwarded.
- **503 Service Unavailable**: The application pod might still be starting. Check `kubectl get pods -n env-preview-123`.