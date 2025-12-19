# Kubernetes API OIDC Authentication

Users can authenticate to the Kubernetes API using OpenID Connect (OIDC) tokens. This enables centralized identity management through an OIDC provider (Catalyst, cloud provider, or third-party).

## API Server Configuration

**Legacy Flags Approach:**

```bash
kube-apiserver \
  --oidc-issuer-url=https://auth.catalyst.example.com \
  --oidc-client-id=kubernetes \
  --oidc-username-claim=email \
  --oidc-groups-claim=groups \
  --oidc-username-prefix="oidc:" \
  --oidc-groups-prefix="oidc:"
```

| Flag                     | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `--oidc-issuer-url`      | OIDC provider's issuer endpoint (must be HTTPS)       |
| `--oidc-client-id`       | Application/client ID from the OIDC provider          |
| `--oidc-username-claim`  | Token claim for username (typically `email` or `sub`) |
| `--oidc-groups-claim`    | Token claim containing group memberships              |
| `--oidc-username-prefix` | Prefix added to usernames (prevents collisions)       |
| `--oidc-groups-prefix`   | Prefix added to groups (prevents collisions)          |

**Structured Authentication (Kubernetes 1.30+):**

The new file-based configuration replaces legacy flags and supports multiple OIDC providers:

```yaml
# /etc/kubernetes/auth-config.yaml
apiVersion: apiserver.config.k8s.io/v1beta1
kind: AuthenticationConfiguration
jwt:
  - issuer:
      url: https://auth.catalyst.example.com
      audiences:
        - kubernetes
    claimMappings:
      username:
        expression: "claims.email"
      groups:
        expression: "claims.groups"
      uid:
        expression: "claims.sub"
```

Start API server with:

```bash
kube-apiserver --authentication-config=/etc/kubernetes/auth-config.yaml
```

**Benefits of Structured Authentication:**

- Multiple JWT authenticators simultaneously (multiple identity providers)
- Dynamic configuration updates without API server restart
- CEL expressions for complex claim validation
- More flexible claim mappings

## kubectl and kubelogin Setup

Users authenticate via the `kubelogin` plugin which handles the OIDC flow:

**Install kubelogin:**

```bash
# Homebrew
brew install int128/kubelogin/kubelogin

# Krew
kubectl krew install oidc-login
```

**Configure kubectl credentials:**

```bash
kubectl config set-credentials oidc-user \
  --exec-api-version=client.authentication.k8s.io/v1beta1 \
  --exec-command=kubectl \
  --exec-arg=oidc-login \
  --exec-arg=get-token \
  --exec-arg=--oidc-issuer-url=https://auth.catalyst.example.com \
  --exec-arg=--oidc-client-id=kubernetes
```

**Usage flow:**

1. User runs `kubectl get pods`
2. kubelogin opens browser for OIDC login
3. User authenticates with identity provider
4. Token is cached and used for subsequent requests
5. Token is automatically refreshed when expired

## RBAC Integration with OIDC Groups

Map OIDC groups to Kubernetes roles using ClusterRoleBinding or RoleBinding:

**Observer Role (read-only access):**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: catalyst-observer
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: catalyst-observers
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: catalyst-observer
subjects:
  - kind: Group
    name: "oidc:catalyst-observers" # matches OIDC group with prefix
    apiGroup: rbac.authorization.k8s.io
```

**Admin Role (full access to namespace):**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: namespace-admin
  namespace: project-production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin # built-in admin role
subjects:
  - kind: Group
    name: "oidc:project-admins"
    apiGroup: rbac.authorization.k8s.io
```

**Development Environment Owner (full namespace access):**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-env-owner
  namespace: dev-pr-123
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin # full access within namespace
subjects:
  - kind: User
    name: "oidc:user@example.com"
    apiGroup: rbac.authorization.k8s.io
```

## Cloud Provider OIDC Options

**AWS EKS:**

- Native OIDC provider integration with IAM
- Map IAM roles to Kubernetes RBAC
- Use `aws eks get-token` or kubelogin with EKS OIDC

**GCP GKE:**

- Workload Identity for service accounts
- Google Groups for GKE for RBAC
- Native Google OAuth integration

**Azure AKS:**

- Azure AD integration (AAD)
- Azure RBAC for Kubernetes
- Use `kubelogin` with Azure AD

## Catalyst Integration Options

**Option A: Catalyst as OIDC Provider**

Catalyst runs its own OIDC provider (e.g., Dex, Ory Hydra, or custom):

```
User → Catalyst Login → OIDC Token → kubectl → Kubernetes API
```

Benefits:

- Full control over claims and group mappings
- Integrate with VCS provider authentication (GitHub, GitLab)
- Map teams/projects to Kubernetes groups automatically

**Option B: Passthrough to Cloud Provider**

Catalyst configures but doesn't run the OIDC provider:

```
User → Cloud Provider Login → OIDC Token → kubectl → Kubernetes API
       (EKS/GKE/AKS)
```

Benefits:

- Simpler infrastructure (no OIDC server to maintain)
- Leverage existing cloud IAM
- Works well for single-cloud deployments

**Group Mapping Convention:**

| Catalyst Role | OIDC Group                            | Kubernetes Access              |
| ------------- | ------------------------------------- | ------------------------------ |
| Team Member   | `catalyst:team:{team-id}:member`      | Observer on team namespaces    |
| Team Admin    | `catalyst:team:{team-id}:admin`       | Admin on team namespaces       |
| Project Owner | `catalyst:project:{project-id}:owner` | Admin on project namespaces    |
| Dev Env Owner | `catalyst:env:{env-id}:owner`         | Full access to dev environment |

## References

- [Kubernetes OIDC Authentication](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens)
- [Structured Authentication (K8s 1.30+)](https://kubernetes.io/blog/2024/04/25/structured-authentication-moves-to-beta/)
- [kubelogin Plugin](https://github.com/int128/kubelogin)
- [Okta K8s OIDC Guide](https://developer.okta.com/blog/2021/11/08/k8s-api-server-oidc)
