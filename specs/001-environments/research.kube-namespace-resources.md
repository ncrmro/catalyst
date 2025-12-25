# Kubernetes Resource Quotas

**Source**: https://kubernetes.io/docs/concepts/policy/resource-quotas/

Resource quotas constrain aggregate resource consumption per namespace, preventing any single environment from monopolizing shared cluster resources.

## Overview

A `ResourceQuota` object limits the total resources that can be consumed within a namespace. When quotas are enforced:

- Requests exceeding limits are rejected with HTTP 403
- Pods must specify resource requests/limits explicitly
- Usage is tracked and enforced in real-time

## Types of Resource Quotas

### Compute Resources

| Resource           | Description                           |
| ------------------ | ------------------------------------- |
| `requests.cpu`     | Total CPU requests across all pods    |
| `limits.cpu`       | Total CPU limits across all pods      |
| `requests.memory`  | Total memory requests across all pods |
| `limits.memory`    | Total memory limits across all pods   |
| `hugepages-<size>` | Huge pages of specified size          |

### Storage Resources

| Resource                                                       | Description                      |
| -------------------------------------------------------------- | -------------------------------- |
| `requests.storage`                                             | Total storage across all PVCs    |
| `persistentvolumeclaims`                                       | Number of PVC objects allowed    |
| `requests.ephemeral-storage`                                   | Total ephemeral storage requests |
| `limits.ephemeral-storage`                                     | Total ephemeral storage limits   |
| `<storage-class>.storageclass.storage.k8s.io/requests.storage` | Storage for specific class       |

### Object Count Quotas

Limit total resources by kind using `count/<resource>.<group>` syntax:

```yaml
count/pods
count/services
count/secrets
count/configmaps
count/deployments.apps
count/jobs.batch
```

## Example: Development Environment Quota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-environment-quota
  namespace: myteam-myproject-pr-123
  labels:
    catalyst.dev/team: "myteam"
    catalyst.dev/project: "myproject"
spec:
  hard:
    # Compute limits
    requests.cpu: "2"
    limits.cpu: "4"
    requests.memory: 4Gi
    limits.memory: 8Gi

    # Storage limits
    requests.storage: 20Gi
    persistentvolumeclaims: "5"

    # Object counts
    pods: "20"
    services: "10"
    secrets: "20"
    configmaps: "20"
```

## Example: Production Environment Quota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: project-production
spec:
  hard:
    # Higher compute limits for production
    requests.cpu: "8"
    limits.cpu: "16"
    requests.memory: 16Gi
    limits.memory: 32Gi

    # More storage for production data
    requests.storage: 100Gi
    persistentvolumeclaims: "20"

    # Allow more objects
    pods: "50"
    services: "20"
```

## LimitRange: Default Resource Requests

When quotas are enforced, pods must specify resource requests. Use `LimitRange` to set defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: dev-pr-123
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "2"
        memory: "4Gi"
      min:
        cpu: "50m"
        memory: "64Mi"
```

## Quota Scopes

Quotas can be scoped to specific pod states:

| Scope            | Description                                   |
| ---------------- | --------------------------------------------- |
| `Terminating`    | Pods with `activeDeadlineSeconds >= 0`        |
| `NotTerminating` | Pods without `activeDeadlineSeconds`          |
| `BestEffort`     | Pods with no resource requests/limits         |
| `NotBestEffort`  | Pods with at least one resource request/limit |
| `PriorityClass`  | Pods matching specified priority classes      |

## Relevance to Catalyst Environments

### Development Environments

- Enforce reasonable limits to prevent runaway containers
- Allow experimentation within bounded resources
- Auto-cleanup when namespace is deleted releases all quotas

### Deployment Environments

- Production quotas based on capacity planning
- Staging mirrors production limits for realistic testing
- Per-team quotas prevent noisy neighbor issues

### Implementation Notes

1. Create `ResourceQuota` when namespace is provisioned
2. Create `LimitRange` to set sensible defaults
3. Quotas are enforced immediately—existing pods are not evicted
4. Monitor quota usage for capacity planning

## References

- [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Managing Resources](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
