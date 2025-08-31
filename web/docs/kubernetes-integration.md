# Kubernetes Integration Demo

This document demonstrates how the Kubernetes integration would work in a real environment with a Kubernetes cluster available.

## Available Kubernetes Features

### Pull Request Pod Manifests
For creating jobs with buildx kubernetes driver support, see [Pull Request Pod Manifest Documentation](./pull-request-pod-manifest.md).

### Deployment Management
The following demonstrates basic deployment operations:

## API Endpoint Usage

Call the deployment endpoint:
```bash
curl http://localhost:3000/api/kubernetes/deploy-nginx
```

### Expected Success Response
```json
{
  "success": true,
  "message": "Nginx deployment created successfully",
  "deployment": {
    "name": "nginx-deployment-1754966001914",
    "namespace": "default",
    "replicas": 1,
    "timestamp": 1754966001914
  }
}
```

## Kubectl Verification

After a successful API call, verify the deployment was created:

```bash
# List deployments in default namespace
kubectl get deployments -n default

# Check specific deployment (using name from API response)
kubectl get deployment nginx-deployment-1754966001914 -n default

# View deployment details
kubectl describe deployment nginx-deployment-1754966001914 -n default

# Check pods created by the deployment
kubectl get pods -l app=nginx -n default

# View deployment logs
kubectl logs -l app=nginx -n default
```

### Expected kubectl Output

```bash
$ kubectl get deployments -n default
NAME                            READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment-1754966001914  1/1     1            1           30s

$ kubectl describe deployment nginx-deployment-1754966001914 -n default
Name:                   nginx-deployment-1754966001914
Namespace:              default
CreationTimestamp:      Wed, 25 Dec 2024 10:00:01 +0000
Labels:                 app=nginx
                        created-by=catalyst-web-app
Selector:               app=nginx,deployment=nginx-deployment-1754966001914
Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
Pod Template:
  Labels:       app=nginx
                deployment=nginx-deployment-1754966001914
  Containers:
   nginx:
    Image:      nginx:1.25
    Port:       80/TCP
    Host Port:  0/TCP
    Limits:
      cpu:     100m
      memory:  128Mi
    Requests:
      cpu:        50m
      memory:     64Mi
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
```

## Integration Test Scenarios

### Scenario 1: Successful Deployment
1. Call API endpoint
2. Verify deployment exists with kubectl
3. Check pod is running
4. Clean up deployment

### Scenario 2: No Kubernetes Access
1. Call API endpoint
2. Receive error response about missing configuration
3. Verify graceful error handling

### Scenario 3: Insufficient Permissions
1. Call API endpoint with limited RBAC
2. Receive unauthorized error
3. Verify appropriate error message

## Clean Up

To clean up created deployments:
```bash
# Delete specific deployment
kubectl delete deployment nginx-deployment-1754966001914 -n default

# Delete all deployments created by the web app
kubectl delete deployments -l created-by=catalyst-web-app -n default
```

## Environment Requirements

For the integration tests to work properly:
- Kubernetes cluster (kind, minikube, or real cluster)
- kubectl configured and accessible
- Appropriate RBAC permissions for deployment creation
- Default namespace accessible