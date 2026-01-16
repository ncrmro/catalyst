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
  # Required hierarchy labels (FR-ENV-020)
  labels:
    catalyst.dev/team: "my-team"
    catalyst.dev/project: "my-project"
    catalyst.dev/environment: "staging"
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
  # Local: http://my-project-staging.localhost:8080/
  # Production: https://my-project-staging.preview.catalyst.dev/
  url: http://my-project-staging.localhost:8080/

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
      message: Ingress configured with hostname-based routing
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
Create Ingress (hostname-based routing via *.localhost)
    ↓
Wait for Deployment Ready
    ↓
Update Status: phase=Ready, url=http://{namespace}.localhost:8080/
```

## Ingress Configuration

Hostname-based routing for local development (via `*.localhost`) and production:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
  namespace: my-project-staging
spec:
  ingressClassName: nginx
  rules:
    - host: my-project-staging.localhost # Local dev
      # host: my-project-staging.preview.catalyst.dev  # Production
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

Modern browsers automatically resolve `*.localhost` to `127.0.0.1`, providing production-parity routing without DNS configuration.

## URL Generation

| Context    | URL Pattern                                 |
| ---------- | ------------------------------------------- |
| Local      | `http://{namespace}.localhost:8080/`        |
| CI (Kind)  | `http://{namespace}.localhost:8080/`        |
| Production | `https://{namespace}.preview.catalyst.dev/` |

Environment variable `LOCAL_PREVIEW_ROUTING=true` enables `*.localhost` hostname routing instead of production TLS routing.

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

## Automated Deployment Workflow

To automate the deployment of the operator to a Kubernetes cluster (e.g., a production or staging cluster) via GitHub Actions, we need to securely provide the kubeconfig and execute the deployment commands.

### 1. Kubeconfig Secret Management

The kubeconfig file, which grants access to the target cluster, should be stored as an **Environment Secret** in GitHub. This ensures it is protected and only accessible to workflows running in that specific environment.

1.  **Create an Environment in GitHub**: Go to the repository settings -> Environments -> New Environment (e.g., `production`).
2.  **Add Secret**: Add a secret named `KUBE_CONFIG` containing the base64-encoded or plain text kubeconfig content.
    *   *Recommendation*: Use a service account with scoped permissions (RBAC) rather than a cluster-admin config if possible.

### 2. Deployment Steps

The GitHub Action workflow (e.g., `release.yml`) should include a job that runs after the image build and push steps.

**Prerequisites:**
- The Docker image must be built and pushed to a registry accessible by the cluster.
- `kubectl` and `kustomize` tools must be available in the runner.

**Workflow Logic:**
1.  **Checkout Code**: To access the `operator/config` (CRDs and manifests) and `Makefile`.
2.  **Authenticate**: Log in to the container registry if needed (though the cluster pulls the image, the workflow just pushes it).
3.  **Setup Kubeconfig**:
    - Retrieve the `KUBE_CONFIG` secret.
    - Write it to a temporary file or set `KUBECONFIG` environment variable.
4.  **Install CRDs**:
    - Run `make install`. This applies the CRDs located in `config/crd`.
5.  **Deploy Operator**:
    - Run `make deploy IMG=<image-ref>`.
    - This command uses `kustomize` to:
        - Set the new image tag in the deployment manifest.
        - Generate the final YAML.
        - Apply it to the cluster (`kubectl apply -f -`).

**Example Workflow Snippet:**

```yaml
  deploy-operator:
    name: Deploy Operator
    needs: release-operator
    runs-on: ubuntu-latest
    environment: production
    defaults:
      run:
        working-directory: ./operator
    steps:
      - uses: actions/checkout@v4
      
      - name: Install kubectl & kustomize
        run: |
           # ... installation steps or use an action ...
           
      - name: Set Kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG }}" > ~/.kube/config
          chmod 600 ~/.kube/config

      - name: Deploy
        env:
          IMG: ghcr.io/${{ github.repository }}/operator:latest # Update tag logic as needed
        run: |
          make install
          make deploy
```

## References

- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [NGINX Ingress Annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [Local URL Testing Research](./research.local-url-testing.md)
