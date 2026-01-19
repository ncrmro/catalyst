# Research: Private Repository Access via Git-Sync Sidecar

**Date**: 2026-01-10
**Status**: Superseded
**Related**: FR-ENV-019, FR-ENV-023
**Superseded By**: [research.git-credential-helper.md](./research.git-credential-helper.md)

## Summary

This document originally proposed a secret-based approach for git authentication. That approach has been **superseded** by the credential helper approach documented in [research.git-credential-helper.md](./research.git-credential-helper.md).

## Why Superseded

The secret-based approach had limitations:

1. **Token expiration**: 1-hour tokens stored in secrets expire, breaking push operations
2. **Secret management complexity**: Secrets needed to be created, copied between namespaces, and cleaned up
3. **No push support**: After token expiration, push operations would fail

The credential helper approach solves these issues by fetching fresh tokens on-demand from the web server.

---

## Historical Context (For Reference)

The original approach proposed:

1. Web app creates K8s Secret with GitHub token before Environment CR
2. Operator copies Secret from project namespace to environment namespace
3. Git-clone init container uses Secret for authentication

This worked for clone-only scenarios but failed for:

- Pod restarts after 1 hour
- Push operations in workspace mode

---

## Future Enhancement: Git-Sync Sidecar

For continuous sync scenarios (hot-reloading from remote changes), a sidecar approach may be added later. The sidecar would use the same credential helper pattern to fetch fresh tokens.

### Workflow

1. **Injection**: The Operator injects a sidecar container into the Pod definition
2. **Credentials**: The sidecar uses credential helper to fetch fresh tokens
3. **Sync Loop**: The sidecar runs a loop, pulling changes periodically
4. **Shared Volume**: The main container mounts the same PVC volume

This remains a future enhancement, not currently implemented.
