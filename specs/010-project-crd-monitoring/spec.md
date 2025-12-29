# Project CRD Monitoring Stack Specification

## Overview

This specification outlines how to extend the Catalyst Project Custom Resource Definition (CRD) to provision a dedicated monitoring stack (Prometheus, Alertmanager, Grafana, Loki) for projects. The monitoring stack can be configured at either the **Project level** or the **Team level** to optimize resource utilization.

## Goals

1. **Per-Project Observability**: Each project can have its own isolated monitoring stack
2. **Team-Level Sharing**: Teams can share a single monitoring stack across multiple projects to reduce resource overhead
3. **Declarative Configuration**: Monitoring is configured via CRD spec, reconciled by the operator
4. **Resource Efficiency**: Avoid duplicating monitoring infrastructure when not needed
5. **Isolation**: Metrics and logs are scoped appropriately to prevent cross-tenant data leakage

## Architecture

### Resource Hierarchy

```
Team (optional)
└── TeamMonitoringStack (optional - shared by all team projects)
    ├── Prometheus
    ├── Alertmanager
    ├── Grafana
    └── Loki

Project
├── ProjectMonitoringStack (optional - per-project, or reference team stack)
│   ├── Prometheus
│   ├── Alertmanager
│   ├── Grafana
│   └── Loki
└── Environment(s)
    └── Instrumented workloads
```

### Monitoring Stack Options

| Level       | Description                                     | Use Case                                              |
| ----------- | ----------------------------------------------- | ----------------------------------------------------- |
| **None**    | No dedicated stack; use cluster-wide monitoring | Small projects, cost-sensitive                        |
| **Project** | Dedicated stack per project                     | Isolated projects, strict data separation             |
| **Team**    | Shared stack across team projects               | Multiple projects under one team, resource efficiency |

## Custom Resource Definitions

### Extended Project CRD

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: my-project
  namespace: catalyst-system
spec:
  source:
    repositoryUrl: "https://github.com/org/repo"
    branch: "main"

  deployment:
    type: "helm"
    path: "./charts/app"
    values:
      image:
        repository: "registry.cluster.local/org/repo"

  resources:
    defaultQuota:
      cpu: "1"
      memory: "2Gi"

  # NEW: Monitoring configuration
  monitoring:
    # Option 1: No dedicated monitoring (use cluster-wide)
    enabled: false

    # Option 2: Dedicated per-project stack
    enabled: true
    mode: "project"  # "project" | "team"

    # Option 3: Use team-level shared stack
    enabled: true
    mode: "team"
    teamRef:
      name: "my-team"

    # Stack configuration (applies to project or team mode)
    stack:
      prometheus:
        enabled: true
        retention: "15d"
        storage:
          size: "10Gi"
          storageClass: "standard"
        resources:
          requests:
            cpu: "100m"
            memory: "512Mi"
          limits:
            cpu: "500m"
            memory: "1Gi"

      alertmanager:
        enabled: true
        replicas: 1
        storage:
          size: "1Gi"
        receivers: []  # AlertManager config (optional)

      grafana:
        enabled: true
        adminPassword:
          secretRef:
            name: "grafana-admin"
            key: "password"
        dashboards:
          - configMapRef:
              name: "project-dashboards"

      loki:
        enabled: true
        retention: "7d"
        storage:
          size: "20Gi"
          storageClass: "standard"

status:
  conditions:
    - type: "MonitoringReady"
      status: "True"
      reason: "StackDeployed"
      message: "Monitoring stack is operational"
  monitoring:
    prometheusUrl: "http://prometheus.my-project-monitoring.svc:9090"
    grafanaUrl: "https://grafana.my-project.preview.catalyst.dev"
    lokiUrl: "http://loki.my-project-monitoring.svc:3100"
    alertmanagerUrl: "http://alertmanager.my-project-monitoring.svc:9093"
```

### Team CRD (New)

For team-level monitoring, we introduce a `Team` CRD:

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Team
metadata:
  name: my-team
  namespace: catalyst-system
spec:
  # Team members (for RBAC)
  members:
    - userRef:
        name: "alice"
      role: "admin"
    - userRef:
        name: "bob"
      role: "developer"

  # Shared monitoring stack for all team projects
  monitoring:
    enabled: true
    stack:
      prometheus:
        enabled: true
        retention: "30d"
        storage:
          size: "50Gi"
        resources:
          requests:
            cpu: "250m"
            memory: "1Gi"
          limits:
            cpu: "1000m"
            memory: "4Gi"

      alertmanager:
        enabled: true
        replicas: 2 # HA for team-level
        receivers:
          - name: "team-slack"
            slackConfigs:
              - channel: "#my-team-alerts"
                sendResolved: true

      grafana:
        enabled: true
        # Team grafana with org-level access

      loki:
        enabled: true
        retention: "14d"
        storage:
          size: "100Gi"

status:
  conditions:
    - type: "MonitoringReady"
      status: "True"
  monitoring:
    namespace: "my-team-monitoring"
    prometheusUrl: "http://prometheus.my-team-monitoring.svc:9090"
    grafanaUrl: "https://grafana.my-team.catalyst.dev"
    lokiUrl: "http://loki.my-team-monitoring.svc:3100"
  projects:
    - name: "project-a"
    - name: "project-b"
```

## Go Type Definitions

### Project Monitoring Types

```go
// MonitoringSpec defines the monitoring configuration for a Project
type MonitoringSpec struct {
    // Enabled determines if dedicated monitoring is provisioned
    // +optional
    Enabled bool `json:"enabled,omitempty"`

    // Mode specifies whether monitoring is per-project or team-shared
    // +kubebuilder:validation:Enum=project;team
    // +optional
    Mode string `json:"mode,omitempty"`

    // TeamRef references a Team for team-level monitoring
    // Required when mode is "team"
    // +optional
    TeamRef *TeamReference `json:"teamRef,omitempty"`

    // Stack configures the monitoring stack components
    // Used when mode is "project", ignored when mode is "team"
    // +optional
    Stack *MonitoringStackSpec `json:"stack,omitempty"`
}

type TeamReference struct {
    // Name of the Team resource
    Name string `json:"name"`
}

type MonitoringStackSpec struct {
    // Prometheus configuration
    // +optional
    Prometheus *PrometheusSpec `json:"prometheus,omitempty"`

    // Alertmanager configuration
    // +optional
    Alertmanager *AlertmanagerSpec `json:"alertmanager,omitempty"`

    // Grafana configuration
    // +optional
    Grafana *GrafanaSpec `json:"grafana,omitempty"`

    // Loki configuration
    // +optional
    Loki *LokiSpec `json:"loki,omitempty"`
}

type PrometheusSpec struct {
    Enabled   bool              `json:"enabled,omitempty"`
    Retention string            `json:"retention,omitempty"`
    Storage   StorageSpec       `json:"storage,omitempty"`
    Resources corev1.ResourceRequirements `json:"resources,omitempty"`
}

type AlertmanagerSpec struct {
    Enabled   bool              `json:"enabled,omitempty"`
    Replicas  int32             `json:"replicas,omitempty"`
    Storage   StorageSpec       `json:"storage,omitempty"`
    Receivers []runtime.RawExtension `json:"receivers,omitempty"`
}

type GrafanaSpec struct {
    Enabled       bool                    `json:"enabled,omitempty"`
    AdminPassword *SecretKeySelector      `json:"adminPassword,omitempty"`
    Dashboards    []DashboardRef          `json:"dashboards,omitempty"`
}

type LokiSpec struct {
    Enabled   bool        `json:"enabled,omitempty"`
    Retention string      `json:"retention,omitempty"`
    Storage   StorageSpec `json:"storage,omitempty"`
}

type StorageSpec struct {
    Size         string `json:"size,omitempty"`
    StorageClass string `json:"storageClass,omitempty"`
}

// MonitoringStatus reports the state of the monitoring stack
type MonitoringStatus struct {
    Namespace       string `json:"namespace,omitempty"`
    PrometheusUrl   string `json:"prometheusUrl,omitempty"`
    AlertmanagerUrl string `json:"alertmanagerUrl,omitempty"`
    GrafanaUrl      string `json:"grafanaUrl,omitempty"`
    LokiUrl         string `json:"lokiUrl,omitempty"`
}
```

## Controller Implementation

### Monitoring Controller Logic

The Project controller's reconciliation loop extends to handle monitoring:

```go
func (r *ProjectReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // ... existing reconciliation ...

    // Handle monitoring stack
    if project.Spec.Monitoring != nil && project.Spec.Monitoring.Enabled {
        switch project.Spec.Monitoring.Mode {
        case "project":
            // Create dedicated monitoring namespace
            if err := r.reconcileProjectMonitoring(ctx, project); err != nil {
                return ctrl.Result{}, err
            }
        case "team":
            // Validate team reference and register project
            if err := r.reconcileTeamMonitoringRef(ctx, project); err != nil {
                return ctrl.Result{}, err
            }
        }
    }

    return ctrl.Result{}, nil
}

func (r *ProjectReconciler) reconcileProjectMonitoring(ctx context.Context, project *v1alpha1.Project) error {
    monitoringNs := fmt.Sprintf("%s-monitoring", project.Name)

    // 1. Create monitoring namespace
    if err := r.ensureNamespace(ctx, monitoringNs, project); err != nil {
        return err
    }

    // 2. Deploy Prometheus (if enabled)
    if project.Spec.Monitoring.Stack.Prometheus.Enabled {
        if err := r.deployPrometheus(ctx, monitoringNs, project); err != nil {
            return err
        }
    }

    // 3. Deploy Alertmanager (if enabled)
    if project.Spec.Monitoring.Stack.Alertmanager.Enabled {
        if err := r.deployAlertmanager(ctx, monitoringNs, project); err != nil {
            return err
        }
    }

    // 4. Deploy Grafana (if enabled)
    if project.Spec.Monitoring.Stack.Grafana.Enabled {
        if err := r.deployGrafana(ctx, monitoringNs, project); err != nil {
            return err
        }
    }

    // 5. Deploy Loki (if enabled)
    if project.Spec.Monitoring.Stack.Loki.Enabled {
        if err := r.deployLoki(ctx, monitoringNs, project); err != nil {
            return err
        }
    }

    // 6. Configure ServiceMonitors to scrape project environments
    if err := r.configureServiceMonitors(ctx, monitoringNs, project); err != nil {
        return err
    }

    return nil
}
```

### Deployment Strategy

The monitoring stack components are deployed using embedded Helm charts or raw manifests:

| Component    | Deployment Method              | Upstream Chart                    |
| ------------ | ------------------------------ | --------------------------------- |
| Prometheus   | kube-prometheus-stack subchart | prometheus-community/prometheus   |
| Alertmanager | kube-prometheus-stack subchart | prometheus-community/alertmanager |
| Grafana      | Grafana Helm chart             | grafana/grafana                   |
| Loki         | Loki Helm chart                | grafana/loki                      |

## Namespace Layout

### Per-Project Monitoring

```
my-project-dev/           # Environment namespace
├── app-deployment
├── app-service
└── PodMonitor (points to project monitoring)

my-project-monitoring/    # Monitoring namespace
├── prometheus-statefulset
├── alertmanager-deployment
├── grafana-deployment
└── loki-statefulset
```

### Team-Level Monitoring

```
team-alpha-monitoring/    # Shared monitoring namespace
├── prometheus-statefulset
├── alertmanager-deployment
├── grafana-deployment
└── loki-statefulset

project-a-dev/            # Project A environment
├── app-deployment
└── PodMonitor (points to team monitoring)

project-b-staging/        # Project B environment
├── app-deployment
└── PodMonitor (points to team monitoring)
```

## Automatic Instrumentation

When monitoring is enabled, the operator automatically:

1. **Injects ServiceMonitors/PodMonitors** into environment namespaces
2. **Configures Promtail/Alloy** sidecars for log collection
3. **Creates default dashboards** for:
   - Application metrics (request rate, latency, errors)
   - Resource usage (CPU, memory, network)
   - Pod status and restarts
4. **Sets up default alerts** for:
   - High error rate (>1% 5xx responses)
   - High latency (p99 > 1s)
   - Pod restarts (>3 in 5 minutes)
   - Resource saturation (>80% CPU/memory)

## Resource Considerations

### Minimum Resources (Per-Project Mode)

| Component    | CPU Request | Memory Request | Storage  |
| ------------ | ----------- | -------------- | -------- |
| Prometheus   | 100m        | 512Mi          | 10Gi     |
| Alertmanager | 50m         | 128Mi          | 1Gi      |
| Grafana      | 100m        | 256Mi          | -        |
| Loki         | 100m        | 256Mi          | 20Gi     |
| **Total**    | **350m**    | **1.1Gi**      | **31Gi** |

### Recommended Resources (Team Mode)

| Component    | CPU Request | Memory Request | Storage   |
| ------------ | ----------- | -------------- | --------- |
| Prometheus   | 500m        | 2Gi            | 50Gi      |
| Alertmanager | 100m        | 256Mi          | 2Gi       |
| Grafana      | 200m        | 512Mi          | -         |
| Loki         | 500m        | 1Gi            | 100Gi     |
| **Total**    | **1.3 CPU** | **3.8Gi**      | **152Gi** |

### Resource Efficiency Recommendations

1. **Small Teams (1-3 projects)**: Use project-level monitoring if isolation is critical, otherwise team-level
2. **Medium Teams (4-10 projects)**: Strongly recommend team-level shared stack
3. **Large Organizations**: Consider a central monitoring cluster with remote-write/push

## Security

### RBAC

```yaml
# Project-scoped access to monitoring
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: project-monitoring-viewer
  namespace: my-project-monitoring
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "endpoints"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["monitoring.coreos.com"]
    resources: ["prometheuses", "servicemonitors", "podmonitors"]
    verbs: ["get", "list", "watch"]
```

### Network Policies

```yaml
# Allow project environments to push metrics/logs
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-project-scrape
  namespace: my-project-monitoring
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              catalyst.dev/project: "my-project"
      ports:
        - port: 9090 # Prometheus
        - port: 3100 # Loki
```

## Migration Path

### Phase 1: Team CRD & Basic Monitoring

1. Implement Team CRD with monitoring spec
2. Add monitoring field to Project CRD
3. Deploy Prometheus & Grafana per team/project

### Phase 2: Full Stack

1. Add Alertmanager with routing
2. Add Loki for log aggregation
3. Implement auto-instrumentation

### Phase 3: Advanced Features

1. Cross-project aggregation views
2. Cost allocation dashboards
3. Anomaly detection integration

## Example Configurations

### Minimal Project Monitoring

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: simple-app
spec:
  source:
    repositoryUrl: "https://github.com/org/simple-app"
    branch: "main"
  deployment:
    type: "helm"
    path: "./chart"
  monitoring:
    enabled: true
    mode: "project"
    stack:
      prometheus:
        enabled: true
        retention: "7d"
        storage:
          size: "5Gi"
      grafana:
        enabled: true
```

### Team with Shared Monitoring

```yaml
# Team definition with shared monitoring
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Team
metadata:
  name: platform-team
spec:
  monitoring:
    enabled: true
    stack:
      prometheus:
        enabled: true
        retention: "30d"
        storage:
          size: "100Gi"
      alertmanager:
        enabled: true
        replicas: 2
      grafana:
        enabled: true
      loki:
        enabled: true
        retention: "14d"
        storage:
          size: "200Gi"
---
# Project using team's shared monitoring
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: api-service
spec:
  source:
    repositoryUrl: "https://github.com/org/api-service"
    branch: "main"
  deployment:
    type: "helm"
    path: "./chart"
  monitoring:
    enabled: true
    mode: "team"
    teamRef:
      name: "platform-team"
---
# Another project using the same team monitoring
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: web-frontend
spec:
  source:
    repositoryUrl: "https://github.com/org/web-frontend"
    branch: "main"
  deployment:
    type: "helm"
    path: "./chart"
  monitoring:
    enabled: true
    mode: "team"
    teamRef:
      name: "platform-team"
```

## Open Questions

1. **Federation**: Should team-level Prometheus federate from project-level instances, or should all scraping be centralized?
2. **Multi-cluster**: How does monitoring work when a project spans multiple clusters?
3. **Cost Attribution**: Should we integrate with cloud provider billing APIs for monitoring cost allocation?
4. **Retention Policies**: Should there be org-wide defaults vs. per-team/project overrides?

## References

- [Prometheus Operator](https://prometheus-operator.dev/)
- [Grafana Loki](https://grafana.com/oss/loki/)
- [kube-prometheus-stack Helm Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Existing Catalyst Operator Spec](../operator/spec.md)
