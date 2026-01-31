# Kubernetes Network Policies

**Source**: https://kubernetes.io/docs/concepts/services-networking/network-policies/

Network policies provide IP/port-level traffic control within Kubernetes clusters, enabling namespace isolation and controlled egress for environments.

## Overview

Network policies define how pods communicate with each other and external endpoints. They function as an application-centric firewall:

- By default, pods accept all traffic (no isolation)
- NetworkPolicy resources explicitly define allowed connections
- Both ingress and egress policies must allow a connection for it to succeed

## Pod Isolation Model

Kubernetes implements two independent isolation dimensions:

### Ingress Isolation

- Default: Pods accept all inbound traffic
- Isolated: When a NetworkPolicy selects a pod with `policyTypes: ["Ingress"]`
- Only explicitly allowed ingress traffic reaches isolated pods

### Egress Isolation

- Default: Pods can send traffic anywhere
- Isolated: When a NetworkPolicy selects a pod with `policyTypes: ["Egress"]`
- Only explicitly allowed egress traffic leaves isolated pods

## Selector Types

Network policies use four selector mechanisms:

| Selector                            | Description                                         |
| ----------------------------------- | --------------------------------------------------- |
| `podSelector`                       | Target pods by labels within the same namespace     |
| `namespaceSelector`                 | Target all pods in namespaces matching labels       |
| `podSelector` + `namespaceSelector` | Target specific pods in specific namespaces         |
| `ipBlock`                           | Allow/deny CIDR ranges (typically for external IPs) |

## Default Deny Policies

### Deny All Ingress

Isolates all pods in namespace, requiring explicit ingress rules:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: myteam-myproject-pr-123
  labels:
    catalyst.dev/team: "myteam"
    catalyst.dev/project: "myproject"
spec:
  podSelector: {} # Selects all pods
  policyTypes:
    - Ingress
  # No ingress rules = deny all
```

### Deny All Egress

Restricts all outbound traffic, requiring explicit egress rules:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: dev-pr-123
spec:
  podSelector: {}
  policyTypes:
    - Egress
  # No egress rules = deny all
```

### Deny All (Both Directions)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: dev-pr-123
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Example: Development Environment Policy

Allow ingress from ingress controller, egress to DNS and container registry only:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dev-environment-policy
  namespace: dev-pr-123
spec:
  podSelector: {} # Apply to all pods
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from ingress-nginx namespace
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
  egress:
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
        - podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow container registry
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
```

## Example: Allow Inter-Pod Communication

Allow pods within the same namespace to communicate:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: dev-pr-123
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {} # Same namespace pods
```

## Example: Database Access Policy

Allow only specific pods to access database:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-access
  namespace: project-production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              db-access: "true"
      ports:
        - protocol: TCP
          port: 5432
```

## Relevance to Catalyst Environments

### Development Environments

- Default deny prevents cross-environment access
- Allow ingress from ingress controller for public URL proxying
- Controlled egress to DNS and registry only
- Agents work within isolated network boundaries

### Deployment Environments

- Production namespaces isolated from development
- Explicit policies for database and service access
- Egress rules control external API access
- Audit trail via policy definitions

### Implementation Pattern

1. Apply default deny policy when namespace is created
2. Add allow rules for required traffic:
   - Ingress from nginx-ingress
   - Egress to kube-dns
   - Egress to container registry
   - Inter-pod communication within namespace
3. Environment-specific rules as needed

## CNI Requirements

Network policies require a CNI plugin that supports them:

| CNI Plugin  | NetworkPolicy Support                |
| ----------- | ------------------------------------ |
| Calico      | Full support                         |
| Cilium      | Full support + extended features     |
| Weave Net   | Full support                         |
| Flannel     | No support (requires Calico overlay) |
| AWS VPC CNI | Requires Calico add-on               |

## Lessons Learned

### K3s Flannel vs Kind kindnet NetworkPolicy Enforcement

K3s ships with Flannel as its default CNI, which **silently ignores NetworkPolicies** (see [CNI Requirements](#cni-requirements) table above). This means local development on K3s will not surface NetworkPolicy misconfigurations. Kind (v0.24+) uses kindnet, which **does enforce** NetworkPolicies, making CI the first place where policy bugs appear.

### Intra-Namespace Ingress Bug

**Symptom**: The `db-migrate` init container gets `ETIMEDOUT` connecting to the postgres ClusterIP service within the same namespace. The pod hangs in init and eventually times out.

**Root cause**: The operator's NetworkPolicy only allowed ingress from the ingress-nginx namespace. It did not include a `podSelector: {}` rule to allow intra-namespace communication. Since all pods in the namespace were isolated by the deny-all policy, the web pod's init containers could not reach the postgres service in the same namespace.

**Fix**: Added an ingress rule with `podSelector: {}` (empty selector = all pods in the namespace) to allow intra-namespace pod-to-pod communication. See `operator/internal/controller/resources.go`.

**Why it was missed**: The research document (lines 140-157 above) already documented the inter-pod communication pattern with `podSelector: {}`, and the implementation pattern (line 208) listed "Inter-pod communication within namespace" as a required rule. However, the operator implementation initially omitted this rule. K3s/Flannel silently ignored the missing rule, so local testing passed. The bug only surfaced in CI where Kind/kindnet enforced the policy.

### Takeaway

Always test NetworkPolicies on an enforcing CNI. Use Kind in CI to catch policy bugs that K3s/Flannel misses locally. When writing deny-all policies, explicitly allow intra-namespace traffic if pods need to communicate (e.g., web init containers connecting to managed services like postgres).

## References

- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Declare Network Policy](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)
- [Network Policy Recipes](https://github.com/ahmetb/kubernetes-network-policy-recipes)
