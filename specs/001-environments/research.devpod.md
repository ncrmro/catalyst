# DevPod Research

**Source**: https://devpod.sh/docs/tutorials/minikube-vscode-browser

DevPod is a development environment manager that can deploy workspaces directly into Kubernetes clusters. This aligns with our Development Environments concept—interactive workspaces for humans and agents with real-world access.

## What is DevPod?

DevPod creates containerized development environments that hold source code and all dependencies (compiler, debugger, tools). Key characteristics:

- **Provider-based architecture**: Environments can run locally, on cloud VMs, or in Kubernetes
- **devcontainer.json compatible**: Uses the industry-standard devcontainer specification
- **Persistent state**: Workspaces maintain state through stop/restart cycles
- **IDE integration**: Supports VS Code (desktop and browser), JetBrains, and others

## Kubernetes Provider

The Kubernetes provider (`devpod-provider-kubernetes`) deploys dev workspaces as pods in a Kubernetes cluster.

**Installation:**

```bash
devpod provider add kubernetes
devpod provider use kubernetes
devpod up .  # Creates workspace from current directory
```

**Configuration:**

- **Namespace**: Target namespace for workspace pods
- **Kubeconfig**: Path to kubectl configuration
- **Disk Size**: Storage allocation for persistent volumes (e.g., 1Gi)

**How it works:**

1. Creates a Persistent Volume for workspace storage
2. Deploys a pod running the devcontainer image
3. Mounts source code and persistent storage
4. Establishes connection for IDE access

## VS Code Browser Integration

DevPod can launch VS Code directly in a browser connected to the development container. This enables:

- Web-based development without local IDE installation
- Consistent environment access from any machine
- Agent access to full IDE capabilities

## Relevance to Catalyst

DevPod's Kubernetes provider is a strong candidate for implementing Development Environments:

| Catalyst Requirement           | DevPod Capability                   |
| ------------------------------ | ----------------------------------- |
| Shell access to containers     | Native SSH/exec support             |
| devcontainer.json support      | Full compatibility                  |
| Kubernetes namespace isolation | Per-workspace namespaces            |
| Persistent storage             | PV/PVC management                   |
| IDE integration                | VS Code browser, desktop, JetBrains |

## Integration Considerations

**For PR-triggered environments:**

- DevPod CLI can be invoked programmatically
- Workspace creation: `devpod up <repo-url> --provider kubernetes`
- Workspace deletion: `devpod delete <workspace-name>`

**For agent access:**

- Agents could use DevPod CLI or direct kubectl exec
- VS Code browser provides UI for human debugging
- Persistent workspaces allow long-running agent sessions

**Networking:**

- DevPod handles port forwarding for IDE access
- For public URL proxying (Cloudflare), additional ingress configuration needed
- Catalyst would manage the ingress/proxy layer separately

## Creating Dev Environments with DevPod

### Workspace Creation

DevPod creates workspaces from multiple sources:

```bash
# From Git repository
devpod up github.com/org/repo --provider kubernetes

# From specific branch/PR
devpod up "github.com/org/repo@feature-branch"
devpod up "github.com/org/repo@pull/123/head"  # GitHub PR

# From local path (for testing)
devpod up ./my-project --provider kubernetes

# With custom workspace ID (allows multiple from same repo)
devpod up github.com/org/repo --id "pr-123" --provider kubernetes
```

### Kubernetes Provider Configuration

The provider supports extensive configuration for cluster deployment:

```bash
devpod provider add kubernetes \
  -o KUBERNETES_NAMESPACE=dev-environments \
  -o DISK_SIZE=10Gi \
  -o CREATE_NAMESPACE=true \
  -o STORAGE_CLASS=standard \
  -o POD_TIMEOUT=600
```

**Key Options:**
| Option | Description |
|--------|-------------|
| `KUBERNETES_NAMESPACE` | Target namespace for workspace pods |
| `KUBERNETES_CONTEXT` | Kubectl context to use |
| `DISK_SIZE` | PVC size for workspace storage |
| `CREATE_NAMESPACE` | Auto-create namespace if missing |
| `STORAGE_CLASS` | Storage class for PVCs |
| `NODE_SELECTOR` | Node selection constraints |
| `SERVICE_ACCOUNT` | Service account for pods |
| `CLUSTER_ROLE` | RBAC cluster role |
| `STRICT_SECURITY` | Enable strict security mode |
| `INACTIVITY_TIMEOUT` | Auto-stop after inactivity |

## Access Methods for Users and Agents

DevPod provides multiple access paths to workspaces, all built on SSH tunneling.

### 1. SSH Access (Universal)

DevPod automatically configures `~/.ssh/config` during workspace creation:

```bash
# Direct SSH connection
ssh pr-123.devpod

# Execute command remotely
devpod ssh pr-123 --command "npm test"

# Interactive shell (without SSH client)
devpod ssh pr-123
```

**For Catalyst:** This is the primary access method for agents. Agents can:

- Execute commands via `devpod ssh <workspace> --command "..."`
- Stream output for logging
- Run interactive sessions for complex workflows

### 2. VS Code Desktop

Requires VS Code with Remote SSH extension:

```bash
devpod up github.com/org/repo --ide vscode
```

DevPod configures SSH and launches VS Code connected to the workspace.

### 3. VS Code Browser (OpenVSCode Server)

Runs VS Code in the browser without local installation:

```bash
devpod up github.com/org/repo --ide openvscode
```

**For Catalyst:** Expose via ingress for web-based access:

- Users can access from any browser
- No local tooling required
- Good for quick debugging of agent work

### 4. JetBrains IDEs

Supported via JetBrains Gateway (requires subscription):

```bash
devpod up github.com/org/repo --ide goland
devpod up github.com/org/repo --ide pycharm
devpod up github.com/org/repo --ide webstorm
```

### 5. kubectl / k9s Access

Since workspaces are Kubernetes pods, direct cluster access works:

```bash
# Find the workspace pod
kubectl get pods -n dev-environments -l devpod.sh/workspace=pr-123

# Exec into container
kubectl exec -it <pod-name> -n dev-environments -- /bin/bash

# Use k9s for interactive browsing
k9s -n dev-environments
```

**For Catalyst:** Users with cluster access can use familiar Kubernetes tools. This requires:

- OIDC authentication for kubectl (per 001-environments spec)
- RBAC policies limiting access to user's own namespaces
- k9s/TUI access through the same auth flow

### 6. Custom TUI Access

For a Catalyst-specific TUI:

```bash
# Option A: Wrap devpod CLI
catalyst env connect pr-123  # Internally calls devpod ssh

# Option B: Direct kubectl exec with OIDC auth
catalyst env shell pr-123    # Uses kubectl exec with user's OIDC token
```

## Architecture for Catalyst Integration

### Agent Access Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                      Catalyst Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  PR Webhook  │───▶│  Orchestrator │───▶│  DevPod CLI  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                              │                    │              │
│                              │                    ▼              │
│                              │           ┌──────────────┐       │
│                              │           │  Kubernetes  │       │
│                              │           │    Cluster   │       │
│                              │           └──────────────┘       │
│                              │                    │              │
│                              ▼                    ▼              │
│                     ┌──────────────┐    ┌──────────────┐       │
│                     │ Agent Runner │───▶│ Workspace Pod │       │
│                     │ (Claude Code)│    │  (devcontainer)│      │
│                     └──────────────┘    └──────────────┘       │
│                              │                    │              │
│                              │   devpod ssh       │              │
│                              └────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Flow:**

1. PR webhook triggers environment creation
2. Orchestrator calls `devpod up github.com/org/repo@pull/123/head --id pr-123`
3. DevPod creates pod in Kubernetes with devcontainer
4. Agent runner connects via `devpod ssh pr-123`
5. Agent (Claude Code, etc.) works inside the environment

### User Access Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Access                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   VS Code    │────────▶│   SSH/DevPod │─────┐                │
│  │   Desktop    │         │    Tunnel    │     │                │
│  └──────────────┘         └──────────────┘     │                │
│                                                 │                │
│  ┌──────────────┐         ┌──────────────┐     │                │
│  │   VS Code    │────────▶│   Ingress    │─────┤                │
│  │   Browser    │         │  (OpenVSCode)│     │                │
│  └──────────────┘         └──────────────┘     │                │
│                                                 ▼                │
│  ┌──────────────┐         ┌──────────────┐  ┌──────────────┐   │
│  │   kubectl    │────────▶│  OIDC Auth   │─▶│ Workspace Pod │   │
│  │   k9s/TUI    │         │              │  │              │   │
│  └──────────────┘         └──────────────┘  └──────────────┘   │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐         │            │
│  │  Cloudflare  │────────▶│   Ingress    │─────────┘            │
│  │  Proxy URL   │         │  (App Port)  │                      │
│  └──────────────┘         └──────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

**Access Methods:**

1. **VS Code Desktop**: User's local VS Code connects via DevPod SSH tunnel
2. **VS Code Browser**: Ingress exposes OpenVSCode server on workspace URL
3. **kubectl/k9s**: OIDC authentication grants access to user's namespaces
4. **Public URL**: Cloudflare tunnel proxies app port for browser testing

### Catalyst CLI/TUI Commands

```bash
# List environments
catalyst env list

# Create environment for PR
catalyst env create --pr 123 --repo org/repo

# Connect via SSH
catalyst env ssh pr-123

# Open VS Code Browser
catalyst env code pr-123 --browser

# Open VS Code Desktop
catalyst env code pr-123

# View logs
catalyst env logs pr-123

# Get public URL
catalyst env url pr-123

# Delete environment
catalyst env delete pr-123
```

Internally, these wrap DevPod CLI or direct Kubernetes API calls.

### Workspace Lifecycle Management

```bash
# Automatic creation on PR
# (handled by webhook → orchestrator → devpod up)

# Stop workspace (preserves state)
devpod stop pr-123

# Start stopped workspace
devpod up pr-123  # Resumes existing

# Recreate (apply devcontainer.json changes)
devpod up pr-123 --recreate

# Full reset (clean slate)
devpod up pr-123 --reset

# Delete workspace
devpod delete pr-123
```

### Open Questions

1. **Multi-tenancy**: How to isolate DevPod workspaces between users/teams?
   - Use separate namespaces per team
   - Configure RBAC via `SERVICE_ACCOUNT` and `CLUSTER_ROLE` options

2. **Resource limits**: Integration with Kubernetes resource quotas
   - Use `RESOURCES` option for pod limits
   - Apply ResourceQuota to namespace

3. **Agent automation**: Best approach for programmatic workspace management
   - DevPod CLI with `--command` for one-off execution
   - Long-running SSH session for interactive agents

4. **URL proxying**: DevPod focuses on IDE access; public URL exposure is separate
   - Catalyst manages ingress/Cloudflare layer
   - DevPod handles SSH/IDE tunneling

## References

- DevPod Documentation: https://devpod.sh/docs
- Kubernetes Provider: https://github.com/loft-sh/devpod-provider-kubernetes
- devcontainer.json Spec: https://containers.dev/implementors/json_reference/
