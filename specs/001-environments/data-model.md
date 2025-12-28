# Data Model: Environments

## Kubernetes Custom Resources (CRDs)

### Environment (`environments.catalyst.catalyst.dev`)

Represents a deployment or development environment.

**Status Updates**:
The `status` field will be updated to include the local URL when applicable.

```go
type EnvironmentStatus struct {
    // Existing fields...
    
    // Public URL for the environment (e.g., https://env-123.preview.catalyst.dev)
    URL string `json:"url,omitempty"`
    
    // Local URL for development (e.g., http://localhost:8080/env-123/)
    // This is populated when the operator detects it's running in local/dev mode
    // or when the Ingress is configured for path-based routing.
    LocalURL string `json:"localUrl,omitempty"`
}
```

## Database Schema (Drizzle)

No changes anticipated for the core database schema, as this is primarily a runtime Kubernetes state reflected in the CRD status. The web app reads this from the Kubernetes API.

## Entities

### Environment

- **localUrl**: (String, Optional) The path-based URL for accessing the environment in local development.