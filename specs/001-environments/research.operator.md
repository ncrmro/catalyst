# Operator Environment CRD Research

**Context**: Extending the Environment CRD to support deployment environments with web-accessible endpoints.

## Current State

The Environment CRD currently supports:

- Development environments with workspace pods (alpine + sleep infinity)
- Namespace creation with ResourceQuota and NetworkPolicy
- Basic status tracking (phase, URL, conditions)

## Proposed Changes

### Environment Types

| Type        | Purpose                          | Resources Created                                                     |
| ----------- | -------------------------------- | --------------------------------------------------------------------- |
| development | Interactive workspace for coding | Namespace, ResourceQuota, NetworkPolicy, Workspace Pod                |
| deployment  | Web-accessible application       | Namespace, ResourceQuota, NetworkPolicy, Deployment, Service, Ingress |

## Proposed CRD Schema

```yaml
apiVersion: catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: staging
  namespace: catalyst-system
spec:
  # Reference to parent project
  projectRef:
    name: my-project

  # Environment type: "development" or "deployment"
  type: deployment

  # Source configuration
  source:
    commitSha: abc123def456
    branch: main
    prNumber: 0 # Optional, for PR environments

  # Deployment-specific configuration (NEW)
  deployment:
    # Container image to deploy
    image: nginx:alpine
    # Container port
    port: 80
    # Number of replicas
    replicas: 1
    # Resource limits
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 128Mi

  # Environment variables
  config:
    envVars:
      - name: NODE_ENV
        value: production

status:
  # Lifecycle phase: Pending, Building, Deploying, Ready, Failed
  phase: Ready

  # Public URL for accessing the environment
  url: http://localhost:8080/my-project-staging/

  # Kubernetes conditions for detailed status
  conditions:
    - type: NamespaceReady
      status: "True"
      reason: Created
      message: Namespace created successfully
    - type: DeploymentReady
      status: "True"
      reason: Available
      message: Deployment has minimum availability
    - type: IngressReady
      status: "True"
      reason: Configured
      message: Ingress configured with path-based routing
```

## Go Type Definitions

```go
// DeploymentConfig defines configuration for deployment environments
type DeploymentConfig struct {
    // Image is the container image to deploy
    Image string `json:"image"`

    // Port is the container port to expose
    // +kubebuilder:default=80
    Port int32 `json:"port,omitempty"`

    // Replicas is the number of pod replicas
    // +kubebuilder:default=1
    Replicas int32 `json:"replicas,omitempty"`

    // Resources defines CPU/memory limits and requests
    // +optional
    Resources corev1.ResourceRequirements `json:"resources,omitempty"`
}

// EnvironmentSpec defines the desired state of Environment
type EnvironmentSpec struct {
    // ProjectRef references the parent Project
    ProjectRef ProjectReference `json:"projectRef"`

    // Type of environment (development, deployment)
    Type string `json:"type"`

    // Source configuration for this specific environment
    Source EnvironmentSource `json:"source"`

    // Deployment configuration (required for type=deployment)
    // +optional
    Deployment *DeploymentConfig `json:"deployment,omitempty"`

    // Config overrides
    Config EnvironmentConfig `json:"config,omitempty"`
}
```

## Reconciliation Flow

### Development Environment (existing)

```
Environment CR (type=development)
    ↓
Create Namespace: {project}-{env-name}
    ↓
Create ResourceQuota
    ↓
Create NetworkPolicy
    ↓
Create Workspace Pod (alpine:latest, sleep infinity)
    ↓
Update Status: phase=Ready
```

### Deployment Environment (new)

```
Environment CR (type=deployment)
    ↓
Create Namespace: {project}-{env-name}
    ↓
Create ResourceQuota
    ↓
Create NetworkPolicy
    ↓
Create Deployment (spec.deployment.image)
    ↓
Create Service (ClusterIP, port 80)
    ↓
Create Ingress (path-based routing)
    ↓
Wait for Deployment Ready
    ↓
Update Status: phase=Ready, url=http://localhost:8080/{namespace}/
```

## Ingress Configuration

Path-based routing for local development and CI:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: my-project-staging
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /my-project-staging(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: app
                port:
                  number: 80
```

## URL Generation

| Context    | URL Pattern                                 |
| ---------- | ------------------------------------------- |
| Local      | `http://localhost:8080/{namespace}/`        |
| CI (Kind)  | `http://localhost:8080/{namespace}/`        |
| Production | `https://{namespace}.preview.catalyst.dev/` |

Environment variable `LOCAL_PREVIEW_ROUTING=true` enables path-based routing.

## Status Conditions

| Condition Type  | Description                               |
| --------------- | ----------------------------------------- |
| NamespaceReady  | Namespace exists and is active            |
| ResourcesReady  | ResourceQuota and NetworkPolicy applied   |
| DeploymentReady | Deployment has minimum available replicas |
| ServiceReady    | Service created and has endpoints         |
| IngressReady    | Ingress configured and routing traffic    |

## Implementation Files

| File                                                     | Action | Purpose                             |
| -------------------------------------------------------- | ------ | ----------------------------------- |
| `operator/api/v1alpha1/environment_types.go`             | Modify | Add DeploymentConfig struct         |
| `operator/internal/controller/environment_controller.go` | Modify | Branch logic for deployment type    |
| `operator/internal/controller/deployment.go`             | Create | Deployment/Service/Ingress creation |

## References

- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [NGINX Ingress Annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [Local URL Testing Research](./research.local-url-testing.md)
