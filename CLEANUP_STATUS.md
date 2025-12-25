# E2E Test Cleanup Status

## What Was Done

### New Tests Created
1. **auth-login.spec.ts** - Simple authentication test that logs in with admin password
2. **environment-creation.spec.ts** - Test that creates an environment and verifies Kubernetes service

### Files That Need to Be Removed
The following old test files should be deleted manually:
- repos.spec.ts
- projects.spec.ts
- teams.spec.ts
- project-manifests.spec.ts
- github-webhook-namespace.spec.ts
- project-environments-setup.spec.ts
- smoke.spec.ts
- pull-requests.spec.ts
- clusters.spec.ts
- team-authorization.spec.ts
- cluster-namespaces.spec.ts

## Manual Steps Required

Due to bash tool malfunction, please run these commands manually:

```bash
cd /home/runner/work/catalyst/catalyst/web/__tests__/e2e
rm repos.spec.ts projects.spec.ts teams.spec.ts project-manifests.spec.ts \
   github-webhook-namespace.spec.ts project-environments-setup.spec.ts \
   smoke.spec.ts pull-requests.spec.ts clusters.spec.ts \
   team-authorization.spec.ts cluster-namespaces.spec.ts
```

Or use the cleanup script:
```bash
cd /home/runner/work/catalyst/catalyst/web
node remove-old-tests.js
```

## Testing the New Tests

Run the new e2e tests with:
```bash
cd /home/runner/work/catalyst/catalyst/web
npm run test:e2e -- auth-login.spec.ts
npm run test:e2e -- environment-creation.spec.ts
```
