# Catalyst Helm Chart Verification Checklist

This document provides a comprehensive checklist for verifying the Catalyst Helm chart installation.

## Pre-Installation Verification

- [ ] Kind cluster is running: `kind get clusters`
- [ ] Helm is installed: `helm version`
- [ ] kubectl is configured: `kubectl cluster-info`
- [ ] Chart dependencies are built: `helm dependency list ./charts/catalyst`

## Installation Verification

### 1. Chart Linting

```bash
cd charts/catalyst
helm lint .
```

Expected: No errors, only warnings about optional fields like icon.

### 2. Chart Templating

```bash
helm template catalyst . --values values-kind.yaml > /tmp/catalyst-manifests.yaml
```

Expected: Manifests generate without errors.

### 3. Installation

```bash
helm install catalyst . \
  --create-namespace \
  --namespace catalyst \
  --values values-kind.yaml \
  --wait \
  --timeout 10m
```

Expected: Installation completes successfully.

## Post-Installation Verification

### 4. Namespaces Created

```bash
kubectl get namespaces | grep -E "(catalyst|catalyst-system)"
```

Expected output:
```
catalyst            Active   1m
catalyst-system     Active   1m
```

### 5. Web Application

```bash
kubectl get pods -n catalyst -l app.kubernetes.io/component=web
```

Expected: 1 pod in Running status.

```bash
kubectl get deployment -n catalyst -l app.kubernetes.io/component=web
```

Expected: 1/1 ready.

```bash
kubectl get service -n catalyst -l app.kubernetes.io/component=web
```

Expected: ClusterIP service on port 3000.

### 6. PostgreSQL Database

```bash
kubectl get pods -n catalyst -l app.kubernetes.io/name=postgresql
```

Expected: 1 pod in Running status.

```bash
kubectl get statefulset -n catalyst -l app.kubernetes.io/name=postgresql
```

Expected: 1/1 ready.

```bash
kubectl get pvc -n catalyst
```

Expected: PVC bound with 2Gi size.

### 7. Operator

```bash
kubectl get pods -n catalyst-system -l app.kubernetes.io/component=operator
```

Expected: 1 pod in Running status.

```bash
kubectl get deployment -n catalyst-system -l app.kubernetes.io/component=operator
```

Expected: 1/1 ready.

```bash
kubectl get serviceaccount -n catalyst-system
```

Expected: catalyst-operator service account.

### 8. RBAC Resources

```bash
kubectl get clusterrole | grep catalyst
```

Expected: catalyst-operator-manager-role.

```bash
kubectl get clusterrolebinding | grep catalyst
```

Expected: catalyst-operator-manager-rolebinding.

### 9. CRDs

```bash
kubectl get crds | grep catalyst
```

Expected output:
```
environments.catalyst.catalyst.dev
projects.catalyst.catalyst.dev
```

```bash
kubectl explain projects.catalyst.catalyst.dev
kubectl explain environments.catalyst.catalyst.dev
```

Expected: CRD schema documentation.

### 10. Metrics Service

```bash
kubectl get service -n catalyst-system | grep metrics
```

Expected: metrics service on port 8443.

## Functional Testing

### 11. Create Test Project

```bash
kubectl apply -f - <<EOF
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: test-project
  namespace: catalyst-system
spec:
  source:
    repositoryUrl: "https://github.com/example/repo"
    branch: "main"
  deployment:
    type: "helm"
    path: "./charts/app"
  resources:
    defaultQuota:
      cpu: "1"
      memory: "2Gi"
EOF
```

Verify:
```bash
kubectl get projects -n catalyst-system
```

Expected: test-project resource created.

### 12. Check Operator Logs

```bash
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator --tail=50
```

Expected: Logs showing reconciliation activity, no error messages.

### 13. Create Test Environment

```bash
kubectl apply -f - <<EOF
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Environment
metadata:
  name: test-env
  namespace: catalyst-system
spec:
  projectRef:
    name: test-project
  type: "development"
  source:
    commitSha: "abc123"
    branch: "main"
EOF
```

Verify:
```bash
kubectl get environments -n catalyst-system
```

Expected: test-env resource created.

### 14. Verify Namespace Creation

```bash
kubectl get namespaces | grep env-
```

Expected: Namespace created by operator (may take a moment).

### 15. Web Application Connectivity

```bash
# Port-forward to web service
kubectl port-forward -n catalyst svc/catalyst-web 3000:3000 &
sleep 3

# Test HTTP endpoint
curl -s http://localhost:3000 | head -20
```

Expected: HTML response from Next.js application.

### 16. Database Connectivity

```bash
# Check if web app can connect to database
kubectl logs -n catalyst -l app.kubernetes.io/component=web --tail=100 | grep -i database
```

Expected: No database connection errors.

## Health Checks

### 17. Pod Health

```bash
# Check all pods are healthy
kubectl get pods -n catalyst
kubectl get pods -n catalyst-system
```

Expected: All pods in Running status with 0 restarts (or minimal restarts).

### 18. Resource Usage

```bash
# Check resource consumption
kubectl top pods -n catalyst
kubectl top pods -n catalyst-system
```

Expected: Usage within defined limits.

### 19. Events

```bash
# Check for error events
kubectl get events -n catalyst --sort-by='.lastTimestamp' | tail -20
kubectl get events -n catalyst-system --sort-by='.lastTimestamp' | tail -20
```

Expected: No error or warning events.

## Cleanup Verification

### 20. Uninstall Chart

```bash
helm uninstall catalyst -n catalyst
```

Expected: Successful uninstall.

### 21. Resources Removed

```bash
kubectl get all -n catalyst
kubectl get all -n catalyst-system
```

Expected: Most resources removed (some may have finalizers).

### 22. CRDs Still Present

```bash
kubectl get crds | grep catalyst
```

Expected: CRDs still present (they are not auto-deleted to prevent data loss).

### 23. Manual CRD Cleanup

```bash
kubectl delete crd projects.catalyst.catalyst.dev
kubectl delete crd environments.catalyst.catalyst.dev
```

Expected: CRDs deleted successfully.

### 24. Namespace Cleanup

```bash
kubectl delete namespace catalyst
kubectl delete namespace catalyst-system
```

Expected: Namespaces deleted.

## Common Issues and Resolutions

### Issue: PostgreSQL pod not starting

**Check:**
```bash
kubectl describe pod -n catalyst -l app.kubernetes.io/name=postgresql
kubectl logs -n catalyst -l app.kubernetes.io/name=postgresql
```

**Possible causes:**
- Insufficient resources
- PVC binding issues
- Image pull errors

### Issue: Operator pod not starting

**Check:**
```bash
kubectl describe pod -n catalyst-system -l app.kubernetes.io/component=operator
kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator
```

**Possible causes:**
- RBAC permissions not configured
- Image not available
- CRDs not installed

### Issue: Web app can't connect to database

**Check:**
```bash
kubectl get secret catalyst-web -n catalyst -o jsonpath='{.data.DATABASE_URL}' | base64 -d
kubectl get service -n catalyst -l app.kubernetes.io/name=postgresql
```

**Possible causes:**
- Wrong DATABASE_URL in secret
- PostgreSQL service not ready
- Network policies blocking connection

## Summary

✅ All checks passed: Chart is functioning correctly
⚠️ Some checks failed: Review logs and troubleshoot
❌ Multiple failures: Consider reinstalling or checking cluster state

## Additional Resources

- [Helm Chart README](../../charts/catalyst/README.md)
- [Quick Reference Guide](../../charts/catalyst/QUICKREF.md)
- [Operator Documentation](../../operator/README.md)
