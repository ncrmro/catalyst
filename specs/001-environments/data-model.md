# Data Model: Environments

## Kubernetes Custom Resources (CRDs)

### Environment (`environments.catalyst.catalyst.dev`)

Represents a deployment or development environment.

**Status Updates**:
The `status` field will be updated to include the local URL when applicable.

```go
type EnvironmentStatus struct {
    // Existing fields...

    // Public URL for the environment
    // Production: https://env-123.preview.catalyst.dev
    // Local dev: http://env-123.localhost:8080/
    URL string `json:"url,omitempty"`
}
```

Note: The same `URL` field is used for both production (hostname-based with TLS) and local development (hostname-based via `*.localhost`). The operator generates the appropriate URL format based on the `isLocal` configuration.

## Database Schema (Drizzle)

No changes anticipated for the core database schema, as this is primarily a runtime Kubernetes state reflected in the CRD status. The web app reads this from the Kubernetes API.

## Entities

### Environment

- **url**: (String, Optional) The URL for accessing the environment. In local development, uses hostname-based routing via `*.localhost` (e.g., `http://namespace.localhost:8080/`). In production, uses TLS hostname routing (e.g., `https://namespace.preview.catalyst.dev/`).
