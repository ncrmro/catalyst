# Tasks: VCS Provider Registry Integration

**Spec**: `003-vcs-providers`

## Phase 1: Registry Credentials

- [ ] T001 Define `ProjectRegistrySecret` schema or convention in `web/src/db/schema.ts` (if needed) or utilize existing Secret management.
- [ ] T002 Update VCS Provider logic to expose GHCR credentials (e.g. create Kubernetes Secret `registry-credentials` in project namespace).
- [ ] T003 Implement UI for users to provide generic registry credentials (Docker Hub, etc.).
