# Operator Integration Guide for Secret Management

## Overview

This document outlines the work needed in the Kubernetes operator to integrate with the web application's secret management system. The web side is complete and ready for operator integration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Web Application (Complete)                                  │
├─────────────────────────────────────────────────────────────┤
│ • Database: secrets table with encryption                   │
│ • Models: resolveSecretsForEnvironment()                    │
│ • API: GET /api/internal/secrets/{environmentId}            │
│ • Auth: Kubernetes TokenReview validation                   │
│ • Returns: { "secrets": { "KEY": "value", ... } }           │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ HTTP GET with Bearer token
                              │
┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Operator (Needs Implementation)                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Fetch secrets from web API during reconciliation         │
│ 2. Create K8s Secret "catalyst-secrets" in namespace        │
│ 3. Inject env vars via secretKeyRef in pod specs            │
│ 4. Handle errors and log operations                         │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoint Specification

### Endpoint
```
GET /api/internal/secrets/{environmentId}
```

### Authentication
- **Method**: Kubernetes TokenReview API
- **Header**: `Authorization: Bearer {serviceAccountToken}`
- The operator should use its ServiceAccount token for authentication

### Request Example
```bash
curl -H "Authorization: Bearer ${SA_TOKEN}" \
     https://web-app-url/api/internal/secrets/env-abc-123
```

### Response Format
```json
{
  "secrets": {
    "GITHUB_APP_ID": "123456",
    "GITHUB_APP_PRIVATE_KEY": "-----BEGIN RSA PRIVATE KEY-----\n...",
    "DATABASE_URL": "postgresql://...",
    "API_KEY": "sk-..."
  }
}
```

### Error Responses
- **401 Unauthorized**: Invalid or missing ServiceAccount token
- **404 Not Found**: Environment ID not found in database
- **500 Internal Server Error**: Secret resolution or decryption failed

## Implementation Tasks

### Task 1: Add HTTP Client Configuration
**File**: `operator/internal/controller/environment_controller.go` or new file `operator/internal/secrets/client.go`

Add configuration for the web API URL:
```go
type SecretsFetcher struct {
    WebAPIURL      string
    HTTPClient     *http.Client
    ServiceAccount string // Path to SA token
}

func NewSecretsFetcher(webAPIURL string) *SecretsFetcher {
    return &SecretsFetcher{
        WebAPIURL:      webAPIURL,
        HTTPClient:     &http.Client{Timeout: 10 * time.Second},
        ServiceAccount: "/var/run/secrets/kubernetes.io/serviceaccount/token",
    }
}
```

### Task 2: Implement Secret Fetching Function
**Function**: `fetchEnvironmentSecrets(ctx, environmentId)`

```go
func (sf *SecretsFetcher) FetchSecrets(ctx context.Context, environmentId string) (map[string]string, error) {
    // 1. Read ServiceAccount token
    tokenBytes, err := os.ReadFile(sf.ServiceAccount)
    if err != nil {
        return nil, fmt.Errorf("failed to read SA token: %w", err)
    }
    token := string(tokenBytes)

    // 2. Make HTTP request
    url := fmt.Sprintf("%s/api/internal/secrets/%s", sf.WebAPIURL, environmentId)
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := sf.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch secrets: %w", err)
    }
    defer resp.Body.Close()

    // 3. Handle errors
    if resp.StatusCode == 401 {
        return nil, fmt.Errorf("unauthorized: invalid ServiceAccount token")
    }
    if resp.StatusCode == 404 {
        return nil, fmt.Errorf("environment not found: %s", environmentId)
    }
    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
    }

    // 4. Parse response
    var result struct {
        Secrets map[string]string `json:"secrets"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }

    return result.Secrets, nil
}
```

### Task 3: Implement Kubernetes Secret Synchronization
**Function**: `syncCatalystSecrets(ctx, namespace, secrets)`

```go
func (r *EnvironmentReconciler) SyncCatalystSecrets(
    ctx context.Context,
    namespace string,
    secrets map[string]string,
) error {
    secretName := "catalyst-secrets"
    
    // Convert secrets to base64-encoded data
    data := make(map[string][]byte)
    for key, value := range secrets {
        data[key] = []byte(value)
    }

    secret := &corev1.Secret{
        ObjectMeta: metav1.ObjectMeta{
            Name:      secretName,
            Namespace: namespace,
            Labels: map[string]string{
                "app.kubernetes.io/managed-by": "catalyst-operator",
            },
        },
        Data: data,
    }

    // Create or update the secret
    existing := &corev1.Secret{}
    err := r.Get(ctx, client.ObjectKey{
        Name:      secretName,
        Namespace: namespace,
    }, existing)

    if err != nil {
        if errors.IsNotFound(err) {
            // Create new secret
            if err := r.Create(ctx, secret); err != nil {
                return fmt.Errorf("failed to create secret: %w", err)
            }
            log.Info("Created catalyst-secrets", "namespace", namespace)
        } else {
            return fmt.Errorf("failed to get secret: %w", err)
        }
    } else {
        // Update existing secret
        existing.Data = data
        if err := r.Update(ctx, existing); err != nil {
            return fmt.Errorf("failed to update secret: %w", err)
        }
        log.Info("Updated catalyst-secrets", "namespace", namespace)
    }

    return nil
}
```

### Task 4: Update Pod Spec Generation
**Function**: Modify `desiredDeployment()` or similar

Inject environment variables from the secret:
```go
func (r *EnvironmentReconciler) injectSecretEnvVars(podSpec *corev1.PodSpec) {
    secretName := "catalyst-secrets"
    
    // Get the main container (typically first one)
    if len(podSpec.Containers) == 0 {
        return
    }
    
    container := &podSpec.Containers[0]
    
    // Option 1: Inject all secrets as env vars (recommended)
    container.EnvFrom = append(container.EnvFrom, corev1.EnvFromSource{
        SecretRef: &corev1.SecretEnvSource{
            LocalObjectReference: corev1.LocalObjectReference{
                Name: secretName,
            },
        },
    })
    
    // Option 2: Inject specific secrets (if needed)
    // container.Env = append(container.Env, corev1.EnvVar{
    //     Name: "GITHUB_APP_ID",
    //     ValueFrom: &corev1.EnvVarSource{
    //         SecretKeyRef: &corev1.SecretKeySelector{
    //             LocalObjectReference: corev1.LocalObjectReference{
    //                 Name: secretName,
    //             },
    //             Key: "GITHUB_APP_ID",
    //         },
    //     },
    // })
}
```

### Task 5: Integrate into Reconciliation Loop
**File**: `operator/internal/controller/environment_controller.go`

Add secret fetching and sync to the reconciliation flow:
```go
func (r *EnvironmentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)
    
    // ... existing reconciliation logic ...
    
    // After Environment CR is created and before Deployment creation:
    
    // 1. Fetch secrets from web API
    if env.Spec.EnvironmentID != "" {
        secretsFetcher := NewSecretsFetcher(os.Getenv("WEB_API_URL"))
        secrets, err := secretsFetcher.FetchSecrets(ctx, env.Spec.EnvironmentID)
        if err != nil {
            log.Error(err, "Failed to fetch secrets", "environmentId", env.Spec.EnvironmentID)
            // Don't block deployment, just log warning
            log.Info("Continuing deployment without secrets")
        } else {
            // 2. Sync secrets to Kubernetes Secret
            if err := r.SyncCatalystSecrets(ctx, env.Namespace, secrets); err != nil {
                log.Error(err, "Failed to sync secrets")
                // Don't block deployment
            } else {
                log.Info("Successfully synced secrets", "count", len(secrets))
            }
        }
    }
    
    // 3. Create/update Deployment with secret injection
    deployment := r.desiredDeployment(env)
    r.injectSecretEnvVars(&deployment.Spec.Template.Spec)
    
    // ... continue with deployment creation ...
}
```

### Task 6: Add Configuration
**File**: `operator/config/manager/manager.yaml` or environment variables

Add the web API URL configuration (use https:// for production):
```yaml
env:
  - name: WEB_API_URL
    value: "https://web-service.catalyst-system.svc.cluster.local:3000"
```

Or use a config file/ConfigMap.

### Task 7: Error Handling and Logging
Add structured logging for all secret operations:
```go
// Success
log.Info("Secret operation completed", 
    "operation", "fetch",
    "environmentId", environmentId,
    "secretCount", len(secrets))

// Errors
log.Error(err, "Secret operation failed",
    "operation", "sync",
    "environmentId", environmentId,
    "namespace", namespace)
```

**Important**: Never log decrypted secret values!

## Testing Checklist

### Unit Tests
- [ ] Test `FetchSecrets()` with mock HTTP responses
- [ ] Test `SyncCatalystSecrets()` with mock Kubernetes client
- [ ] Test error handling for 401, 404, 500 responses

### Integration Tests
- [ ] Deploy operator in test cluster
- [ ] Create Environment CR with secrets configured
- [ ] Verify K8s Secret `catalyst-secrets` is created
- [ ] Verify pod spec has `envFrom` referencing the secret
- [ ] Verify environment variables are available in running pod

### E2E Tests
- [ ] Create project secrets via web UI
- [ ] Deploy preview environment
- [ ] Verify secrets are injected into environment
- [ ] Verify application can access secrets (e.g., GitHub credentials work)
- [ ] Test secret precedence (environment > project > team)

## Security Considerations

1. **ServiceAccount Token**: The operator's ServiceAccount must have permissions to create TokenReview requests
2. **Secret Storage**: Kubernetes Secrets are base64-encoded, not encrypted at rest (unless cluster encryption is enabled)
3. **RBAC**: The operator needs `create`, `get`, `update` permissions on Secrets in managed namespaces
4. **Logging**: Never log decrypted secret values
5. **Error Messages**: Don't include secret values in error messages

## Configuration Examples

### Environment Variables
```yaml
env:
  - name: WEB_API_URL
    value: "https://catalyst-web.catalyst-system.svc.cluster.local:3000"
  - name: WEB_API_TIMEOUT
    value: "30s"
  - name: SECRETS_SYNC_ENABLED
    value: "true"
```

### RBAC for Secrets
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: catalyst-operator-secrets
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "get", "update", "delete"]
  - apiGroups: ["authentication.k8s.io"]
    resources: ["tokenreviews"]
    verbs: ["create"]
```

## Troubleshooting

### Issue: 401 Unauthorized
- **Cause**: ServiceAccount token is invalid or missing
- **Fix**: Verify operator has valid SA token mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token`

### Issue: 404 Environment Not Found
- **Cause**: Environment ID doesn't exist in web database
- **Fix**: Verify Environment CR has correct `environmentId` in spec

### Issue: Secrets Not Appearing in Pod
- **Cause**: Pod spec not updated with secret injection
- **Fix**: Verify `injectSecretEnvVars()` is called before creating Deployment

### Issue: Empty Secrets Response
- **Cause**: No secrets configured for this environment
- **Fix**: This is normal - create secrets via web UI

## Next Steps

1. Implement HTTP client and secret fetching
2. Implement K8s Secret synchronization
3. Update pod spec generation
4. Integrate into reconciliation loop
5. Add unit tests
6. Test in development cluster
7. Run E2E tests
8. Update documentation

## References

- Web API Endpoint: `web/src/app/api/internal/secrets/[environmentId]/route.ts`
- Models Layer: `web/src/models/secrets.ts`
- Database Schema: `web/src/db/schema.ts` (secrets table)
- Spec Document: `specs/001-environments/spec.md` (FR-ENV-034 through FR-ENV-041)
- Implementation Plan: `specs/001-environments/plan.md` (Multi-Tier Secret Management section)
