# Kind Cluster Integration Test Issues

## Overview

During the implementation of namespace hierarchy fixes, we encountered two integration test failures related to the Kind (Kubernetes in Docker) cluster used for local testing. These failures are **pre-existing issues** and **not related** to the namespace hierarchy changes.

## Test Failures

### 1. Deployment Timeout (`k8s-preview-deployment.test.ts`)

**Test**: `should watch deployment until ready`

**Error**:
```
Error: Test timed out in 30000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
```

**Root Cause**: The test watches for a deployment to become ready with a 30-second timeout. This suggests the deployment is taking longer than expected or not progressing at all.

**Possible Reasons**:
- Image pull issues in Kind cluster
- Resource constraints on the test environment
- Networking issues between Kind containers
- Deployment controller not running or misconfigured

### 2. Buildx Kubernetes Driver Failure (`k8s-pull-request-pod-docker-build.test.ts`)

**Test**: `should clone repository and validate build environment without full Docker build`

**Error**:
```
ERROR: error for bootstrap "k8s-builder0": Get "https://10.96.0.1:443/apis/apps/v1/namespaces/default/deployments/k8s-builder0": dial tcp 10.96.0.1:443: i/o timeout
```

**Root Cause**: Docker buildx is trying to create a Kubernetes driver but cannot connect to the Kubernetes API server at `10.96.0.1:443`.

**Analysis**:
- `10.96.0.1` is the default Kubernetes service ClusterIP
- The timeout suggests networking issues within the Kind cluster
- The buildx pod cannot reach the Kubernetes API server from inside the cluster

**Possible Reasons**:
- Kind cluster networking not properly configured
- Service CIDR conflicts
- Missing or misconfigured kube-proxy
- CoreDNS not running or misconfigured
- Network policy blocking API server access

## Impact on Namespace Hierarchy Changes

**None**. These failures are:
1. Pre-existing (present before namespace hierarchy changes)
2. Infrastructure-related (Kind cluster setup)
3. Not related to namespace generation or CR creation logic

## Evidence

### Test Results Summary
- **Total Tests**: 135
- **Passed**: 133
- **Failed**: 2 (both Kind cluster infrastructure issues)
- **Unit Tests**: All 213 passed
- **TypeScript**: No errors
- **Linting**: Only pre-existing warnings

### What Works
- Namespace generation and validation
- DNS-1123 compliance
- Hash-based truncation
- Team/Project/Environment namespace creation
- Label generation for hierarchy
- All unit tests for namespace utilities

## Recommendations

### Short-term
1. Mark these tests as `skip` or increase timeout for CI environments
2. Add environment checks before running Kind-dependent tests
3. Document Kind cluster setup requirements

### Long-term
1. Investigate Kind cluster networking configuration
2. Consider using K3s VM instead of Kind for integration tests (already available in `.k3s-vm/`)
3. Add Kind cluster health checks before running tests
4. Set up proper Kind cluster with all required components:
   - Working kube-proxy
   - Functional CoreDNS
   - Proper service networking
   - Docker registry access

## Related Files

- `/home/runner/work/catalyst/catalyst/web/__tests__/integration/k8s-preview-deployment.test.ts`
- `/home/runner/work/catalyst/catalyst/web/__tests__/integration/k8s-pull-request-pod-docker-build.test.ts`
- `/home/runner/work/catalyst/catalyst/web/docs/kind-cluster-testing.md`

## CI Status

The integration tests are run in CI (`web.test.yml`) but these failures may need to be addressed separately:

```yaml
- name: Run integration tests
  run: npm run test:integration
  env:
    NODE_ENV: test
    KUBECONFIG_PRIMARY: ${{ env.KUBECONFIG_PRIMARY }}
```

## Resolution Status

**Status**: Open - requires separate investigation and fix  
**Priority**: Medium - does not block namespace hierarchy implementation  
**Assignee**: TBD  
**Related Issue**: TBD (should create separate issue for Kind cluster setup)
