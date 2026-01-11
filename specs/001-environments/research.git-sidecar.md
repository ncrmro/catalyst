# Research: Private Repository Access via Git-Sync Sidecar

**Date**: 2026-01-10
**Status**: Adopted
**Related**: US-6 (Operator Implementation)

## Context

We need a secure and reliable way for user applications (running in Preview Environments) to access private repositories, particularly for "pull later" scenarios or hot-reloading where the code needs to be kept in sync with the remote repository.

## Architecture 3: The Git-Sync Sidecar (The Decoupled Model)

Instead of giving the token to the application container, we offload the git operations entirely to a "sidecar" container managed by the Operator. The Operator injects a sidecar (like the popular `git-sync` image) that shares a volume with the main application.

### Workflow

1.  **Injection**: The Operator injects a sidecar container into the Pod definition of the Environment.
2.  **Credentials**: The Operator passes the GitHub App credentials (or a mechanism to fetch them) specifically to the sidecar, **NOT** the main app.
3.  **Sync Loop**: The Sidecar runs a loop: it authenticates, pulls the repo, and keeps it updated in an `emptyDir` (or PVC) volume.
4.  **Shared Volume**: The Main Container mounts the same volume. It simply sees files on the disk. It does not know git exists.

### Pros

*   **Separation of Concerns**: The main app doesn't need git binaries, tokens, or network access to GitHub. It just reads files.
*   **Automatic "Pull Later"**: Since the sidecar runs continuously, it automatically handles the "pull later in time" requirement. It keeps the local disk in sync with the remote repo.
*   **Resilience**: If the token expires, the sidecar (which is designed for this) simply refreshes it and tries again.

### Cons

*   **Resource Overhead**: Running an extra container in every Pod increases CPU/Memory usage.
*   **Startup Latency**: The main application might start before the sidecar has finished cloning. The app needs logic to wait for the files to appear (or use an initContainer for the first clone).

## Implementation Strategy

The Operator will:
1.  Detect if a source requires private access or sync.
2.  Add a shared `EmptyDir` volume to the Pod.
3.  Add the `git-sync` container configured with the repo URL and credentials (mounted from Secret).
4.  Mount the shared volume to both containers.
