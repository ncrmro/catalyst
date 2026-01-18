# Research: Private Repository Access via Git-Sync Sidecar

**Date**: 2026-01-10
**Status**: Adopted
**Related**: FR-ENV-019, FR-ENV-023

## Context

We need a secure and reliable way for user applications (running in Preview Environments) to access private repositories, particularly for "pull later" scenarios or hot-reloading where the code needs to be kept in sync with the remote repository.

## Adopted Approach: Init Container with PVC

For **FR-ENV-023**, we adopt a simpler init container approach (not a continuous sidecar) for the initial implementation:

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Web App (createPreviewDeployment)                       │
│ 1. Generate fresh 1-hour GitHub token via installation │
│ 2. Create K8s Secret in project namespace              │
│    - Type: kubernetes.io/basic-auth                    │
│    - Data: username=x-access-token, password=<token>   │
│ 3. Create Environment CR                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Operator (ReconcileDevelopmentMode)                     │
│ 1. Create PVC for code volume (web-code, 1Gi)          │
│ 2. Copy git credentials Secret to env namespace        │
│ 3. Add git-clone init container                        │
│ 4. Mount PVC as code volume (not HostPath)             │
└─────────────────────────────────────────────────────────┘
```

### Token Lifecycle

| Component             | Token Type              | TTL                     | Refresh? | Mechanism             |
| --------------------- | ----------------------- | ----------------------- | -------- | --------------------- |
| User tokens (web app) | GitHub App + Refresh    | 8h access / 6mo refresh | Yes      | `token-refresh.ts`    |
| Environment tokens    | GitHub App Installation | 1 hour                  | No       | Fresh per environment |

**Key insight**: 1-hour tokens are sufficient because:

- Git clone completes in seconds/minutes
- No refresh needed during deployment lifecycle
- Fresh token generated for each new environment

### Git-Clone Init Container

```yaml
initContainers:
  - name: git-clone
    image: alpine/git:latest
    command:
      - /bin/sh
      - -c
      - |
        # Setup .netrc for authentication
        cat > ~/.netrc <<EOF
        machine github.com
        login x-access-token
        password $(cat /etc/git-credentials/password)
        EOF
        chmod 600 ~/.netrc

        # Clone and checkout specific commit
        git clone $GIT_REPO_URL /code
        git -C /code checkout $GIT_COMMIT_SHA
    env:
      - name: GIT_REPO_URL
        value: "https://github.com/owner/repo.git"
      - name: GIT_COMMIT_SHA
        value: "abc123..."
    volumeMounts:
      - name: code
        mountPath: /code
      - name: git-credentials
        mountPath: /etc/git-credentials
        readOnly: true
```

### Secret Format

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-credentials
  namespace: <project-namespace>
type: kubernetes.io/basic-auth
stringData:
  username: x-access-token
  password: <github-installation-token> # 1-hour TTL
```

### Security Considerations

1. **Token TTL**: 1-hour GitHub App tokens (no refresh needed during deployment)
2. **Secret scope**: Secret only readable in its own namespace
3. **Token scope**: Minimal GitHub permissions (`contents:read`, `contents:write` for push)
4. **Cleanup**: Secret deleted when namespace deleted (K8s garbage collection)
5. **Always auth**: Required even for public repos (to support push to feature branches)

---

## Future Enhancement: Git-Sync Sidecar (The Decoupled Model)

For continuous sync scenarios (hot-reloading from remote changes), a sidecar approach may be added later.

### Workflow

1.  **Injection**: The Operator injects a sidecar container into the Pod definition of the Environment.
2.  **Credentials**: The Operator passes the GitHub App credentials specifically to the sidecar, **NOT** the main app.
3.  **Sync Loop**: The Sidecar runs a loop: it authenticates, pulls the repo, and keeps it updated in a PVC volume.
4.  **Shared Volume**: The Main Container mounts the same volume. It simply sees files on the disk.

### Pros

- **Separation of Concerns**: The main app doesn't need git binaries, tokens, or network access to GitHub.
- **Automatic "Pull Later"**: Keeps the local disk in sync with the remote repo.
- **Resilience**: If the token expires, the sidecar refreshes it and tries again.

### Cons

- **Resource Overhead**: Running an extra container in every Pod increases CPU/Memory usage.
- **Token Refresh Complexity**: Requires mechanism to update Secret when token refreshes.
- **Not needed for initial implementation**: Init container is sufficient for preview environments.

## Implementation Strategy (Current)

The Operator will:

1.  Create PVC for code storage (`web-code`, 1Gi).
2.  Copy git credentials Secret from project namespace to environment namespace.
3.  Add git-clone init container with repository URL and commit SHA from Environment CR.
4.  Mount PVC to init container and main container as `/code`.
