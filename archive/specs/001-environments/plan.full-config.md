# Implementation Plan: Full Environment Configuration

**Spec**: `001-environments`
**Branch**: `feat/full-env-config`
**Created**: 2026-02-01

<!--
  Addresses FR-ENV-026 through FR-ENV-032.
  Removes all hardcoded values from the operator by making them configurable
  via CRDs that use Kubernetes-native types.
-->

## Summary

The operator hardcodes ~50+ framework-specific values (Next.js commands, port 3000, health paths, postgres credentials, resource limits). This plan replaces them with CRD fields that use **curated subsets of Kubernetes-native types** (`corev1.Container`, `corev1.Probe`, `corev1.ResourceRequirements`, etc.) so configuring an environment feels like writing a Deployment manifest. The web app resolves framework presets into these K8s-native values before writing to the CRD.

## Design Paradigm: K8s-Native Types Over Custom Abstractions

**Core principle**: CRD config fields mirror Kubernetes API types. Anyone who knows how to write a `Deployment`, `StatefulSet`, or `PersistentVolumeClaim` manifest already knows how to configure a Catalyst environment.

**Why not custom types**: Custom types like `ProbeConfig { path, port, periodSeconds }` require users to learn a new schema that maps 1:1 to an existing K8s type they already know (`corev1.Probe`). By reusing the real types, we get schema validation, documentation, and user familiarity for free.

**Curated subset**: We don't embed the full `corev1.Container` (which includes irrelevant fields like `lifecycle`, `stdin`, `tty`). Instead, we pick the ~10 fields people actually use when writing Deployments:

| CRD Field        | K8s Type                      | From                              |
| ---------------- | ----------------------------- | --------------------------------- |
| `image`          | `string`                      | `corev1.Container.Image`          |
| `command`        | `[]string`                    | `corev1.Container.Command`        |
| `args`           | `[]string`                    | `corev1.Container.Args`           |
| `workingDir`     | `string`                      | `corev1.Container.WorkingDir`     |
| `ports`          | `[]corev1.ContainerPort`      | `corev1.Container.Ports`          |
| `env`            | `[]corev1.EnvVar`             | `corev1.Container.Env`            |
| `resources`      | `corev1.ResourceRequirements` | `corev1.Container.Resources`      |
| `livenessProbe`  | `*corev1.Probe`               | `corev1.Container.LivenessProbe`  |
| `readinessProbe` | `*corev1.Probe`               | `corev1.Container.ReadinessProbe` |
| `startupProbe`   | `*corev1.Probe`               | `corev1.Container.StartupProbe`   |
| `volumeMounts`   | `[]corev1.VolumeMount`        | `corev1.Container.VolumeMounts`   |

**This paradigm MUST be documented** in `operator/AGENTS.md` and `operator/spec.md` so future contributors understand why we use K8s types and don't introduce custom abstractions.

## Two Deployment Paths (FR-ENV-027)

### Path 1: Helm Template (Chart Handles Everything)

For projects that have their own Helm chart with dev/prod modes built in:

```yaml
# Project CR template
templates:
  development:
    type: helm
    path: charts/my-app
    values:
      mode: development
      hotReload: true
  deployment:
    type: helm
    path: charts/my-app
    values:
      mode: production
      replicas: 3
```

The operator deploys the chart with values. No container/probe/resource config needed in the CRD — the chart manages all manifests. This is the path for teams that want full control.

### Path 2: Managed Template (Operator Creates Resources)

For projects that want the operator to create Deployment + Service + Ingress from config:

```yaml
# Project CR template
templates:
  development:
    type: managed
    config:
      image: node:22-slim
      command: ["./node_modules/.bin/next", "dev", "--turbopack"]
      workingDir: /code/web
      ports:
        - containerPort: 3000
      resources:
        requests: { cpu: 200m, memory: 512Mi }
        limits: { cpu: "1", memory: 2Gi }
      livenessProbe:
        httpGet:
          path: /api/health/liveness
          port: 3000
        periodSeconds: 15
      readinessProbe:
        httpGet:
          path: /api/health/readiness
          port: 3000
        periodSeconds: 10
      startupProbe:
        httpGet:
          path: /api/health/liveness
          port: 3000
        periodSeconds: 5
        failureThreshold: 30
      env:
        - name: WATCHPACK_POLLING
          value: "true"
      initContainers:
        - name: npm-install
          image: node:22-slim
          command: ["npm", "install"]
          workingDir: /code/web
        - name: db-migrate
          image: node:22-slim
          command: ["sh", "-c", "npm run db:migrate && npm run seed"]
          workingDir: /code/web
      services:
        - name: postgres
          container:
            image: postgres:16
            ports:
              - containerPort: 5432
            env:
              - name: POSTGRES_DB
                value: catalyst
          storage:
            resources:
              requests:
                storage: 1Gi
      volumes:
        - name: code
          persistentVolumeClaim:
            claimName: web-code
            resources:
              requests:
                storage: 5Gi
```

This reads like a Deployment manifest. If you know K8s, you know this.

## Technical Context

**Language/Framework**: Go (operator), TypeScript/Next.js 15 (web), PostgreSQL + Drizzle ORM
**Primary Dependencies**: controller-runtime, k8s.io/api (Go); Zod (TypeScript)
**Testing**: Go tests (operator), Vitest (web), Playwright (E2E)

## Data Model

### Go CRD Types

**File: `operator/api/v1alpha1/environment_types.go`**

```go
import (
	corev1 "k8s.io/api/core/v1"
)

// EnvironmentConfig uses a curated subset of Kubernetes-native types.
//
// Design paradigm: Fields mirror corev1.Container and corev1.PodSpec so that
// configuring an environment feels like writing a Deployment manifest. We use
// real K8s types (corev1.Probe, corev1.ResourceRequirements, etc.) instead of
// custom abstractions. See FR-ENV-026 in specs/001-environments/spec.md.
//
// Curated fields from corev1.Container:
//   image, command, args, workingDir, ports, env, resources,
//   livenessProbe, readinessProbe, startupProbe, volumeMounts
//
// NOT included (irrelevant for environment config):
//   lifecycle, securityContext, stdin, tty, terminationMessagePath, etc.
type EnvironmentConfig struct {
	// Existing fields
	EnvVars []EnvVar `json:"envVars,omitempty"`
	Image   string   `json:"image,omitempty"`

	// --- Curated corev1.Container fields (FR-ENV-026) ---

	// Command is the entrypoint array (mirrors corev1.Container.Command)
	Command []string `json:"command,omitempty"`

	// Args are arguments to the command (mirrors corev1.Container.Args)
	Args []string `json:"args,omitempty"`

	// WorkingDir is the container's working directory (mirrors corev1.Container.WorkingDir)
	WorkingDir string `json:"workingDir,omitempty"`

	// Ports are the container ports to expose (mirrors corev1.Container.Ports)
	Ports []corev1.ContainerPort `json:"ports,omitempty"`

	// Env are environment variables using K8s-native EnvVar (supports valueFrom/secretKeyRef)
	// This supplements the simpler EnvVars field above for backwards compatibility.
	Env []corev1.EnvVar `json:"env,omitempty"`

	// Resources are CPU/memory requests and limits (mirrors corev1.Container.Resources)
	Resources *corev1.ResourceRequirements `json:"resources,omitempty"`

	// LivenessProbe (mirrors corev1.Container.LivenessProbe)
	LivenessProbe *corev1.Probe `json:"livenessProbe,omitempty"`

	// ReadinessProbe (mirrors corev1.Container.ReadinessProbe)
	ReadinessProbe *corev1.Probe `json:"readinessProbe,omitempty"`

	// StartupProbe (mirrors corev1.Container.StartupProbe)
	StartupProbe *corev1.Probe `json:"startupProbe,omitempty"`

	// VolumeMounts for the main container (mirrors corev1.Container.VolumeMounts)
	VolumeMounts []corev1.VolumeMount `json:"volumeMounts,omitempty"`

	// --- Init containers (FR-ENV-031) ---

	// InitContainers are run before the main container, using the same curated subset.
	// Each entry creates a Kubernetes init container on the Deployment.
	InitContainers []InitContainerSpec `json:"initContainers,omitempty"`

	// --- Managed services (FR-ENV-028) ---

	// Services are named service entries, each creating a separate StatefulSet.
	Services []ManagedServiceSpec `json:"services,omitempty"`

	// --- Volumes (FR-ENV-032) ---

	// Volumes defines PVCs and other volumes for the environment namespace.
	Volumes []VolumeSpec `json:"volumes,omitempty"`
}

// InitContainerSpec is a curated subset of corev1.Container for init containers.
// Same design paradigm: mirrors K8s-native fields.
type InitContainerSpec struct {
	Name       string                        `json:"name"`
	Image      string                        `json:"image,omitempty"`
	Command    []string                      `json:"command,omitempty"`
	Args       []string                      `json:"args,omitempty"`
	WorkingDir string                        `json:"workingDir,omitempty"`
	Env        []corev1.EnvVar               `json:"env,omitempty"`
	Resources  *corev1.ResourceRequirements  `json:"resources,omitempty"`
	VolumeMounts []corev1.VolumeMount        `json:"volumeMounts,omitempty"`
}

// ManagedServiceSpec defines a named service entry that maps to a StatefulSet.
// Models services like PostgreSQL, Redis — each gets its own StatefulSet + Service.
type ManagedServiceSpec struct {
	// Name identifies this service (e.g., "postgres", "redis")
	Name string `json:"name"`

	// Container spec for the service (curated subset: image, env, ports, resources)
	Container ManagedServiceContainer `json:"container"`

	// Storage defines the PVC template for the StatefulSet (mirrors StatefulSet volumeClaimTemplates)
	Storage *corev1.PersistentVolumeClaimSpec `json:"storage,omitempty"`

	// Database name to create (postgres-only convenience field)
	Database string `json:"database,omitempty"`
}

// ManagedServiceContainer is a curated subset of corev1.Container for service pods.
type ManagedServiceContainer struct {
	Image     string                        `json:"image"`
	Ports     []corev1.ContainerPort        `json:"ports,omitempty"`
	Env       []corev1.EnvVar               `json:"env,omitempty"`
	Resources *corev1.ResourceRequirements  `json:"resources,omitempty"`
}

// VolumeSpec defines a PVC to create in the environment namespace.
type VolumeSpec struct {
	// Name of the volume (used in volumeMounts)
	Name string `json:"name"`

	// PersistentVolumeClaim spec (mirrors corev1.PersistentVolumeClaimSpec)
	PersistentVolumeClaim *corev1.PersistentVolumeClaimSpec `json:"persistentVolumeClaim,omitempty"`
}
```

**File: `operator/api/v1alpha1/project_types.go`**

```go
type EnvironmentTemplate struct {
	SourceRef string                `json:"sourceRef,omitempty"`
	Type      string                `json:"type"` // "helm" or "managed"
	Path      string                `json:"path,omitempty"`
	Builds    []BuildSpec           `json:"builds,omitempty"`
	Values    runtime.RawExtension  `json:"values,omitempty"`

	// Config provides template-level defaults for managed deployments.
	// Uses K8s-native types (see EnvironmentConfig).
	// Environment CR config overrides these values.
	Config *EnvironmentConfig `json:"config,omitempty"`
}
```

### TypeScript Config Schema

**File: `web/src/types/environment-config.ts`** — additions to existing schemas:

```typescript
// K8s-native container port (mirrors corev1.ContainerPort)
export const ContainerPortSchema = z.object({
  name: z.string().optional(),
  containerPort: z.number().int().min(1).max(65535),
  protocol: z.enum(["TCP", "UDP", "SCTP"]).optional(),
});

// K8s-native probe (mirrors corev1.Probe)
export const ProbeSchema = z.object({
  httpGet: z
    .object({
      path: z.string(),
      port: z.number(),
    })
    .optional(),
  tcpSocket: z
    .object({
      port: z.number(),
    })
    .optional(),
  exec: z
    .object({
      command: z.array(z.string()),
    })
    .optional(),
  initialDelaySeconds: z.number().optional(),
  periodSeconds: z.number().optional(),
  timeoutSeconds: z.number().optional(),
  failureThreshold: z.number().optional(),
  successThreshold: z.number().optional(),
});

// K8s-native resource requirements (mirrors corev1.ResourceRequirements)
export const ResourceRequirementsSchema = z.object({
  requests: z.record(z.string()).optional(),
  limits: z.record(z.string()).optional(),
});

// K8s-native env var (mirrors corev1.EnvVar, simplified)
export const K8sEnvVarSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
  valueFrom: z
    .object({
      secretKeyRef: z
        .object({
          name: z.string(),
          key: z.string(),
        })
        .optional(),
      configMapKeyRef: z
        .object({
          name: z.string(),
          key: z.string(),
        })
        .optional(),
    })
    .optional(),
});

// Init container spec (curated subset)
export const InitContainerSpecSchema = z.object({
  name: z.string(),
  image: z.string().optional(),
  command: z.array(z.string()).optional(),
  args: z.array(z.string()).optional(),
  workingDir: z.string().optional(),
  env: z.array(K8sEnvVarSchema).optional(),
  resources: ResourceRequirementsSchema.optional(),
});

// Managed service entry → maps to StatefulSet
export const ManagedServiceSpecSchema = z.object({
  name: z.string(),
  container: z.object({
    image: z.string(),
    ports: z.array(ContainerPortSchema).optional(),
    env: z.array(K8sEnvVarSchema).optional(),
    resources: ResourceRequirementsSchema.optional(),
  }),
  storage: z
    .object({
      resources: z.object({
        requests: z.object({ storage: z.string() }),
      }),
      accessModes: z.array(z.string()).optional(),
    })
    .optional(),
  database: z.string().optional(),
});

// Volume spec → maps to PVC
export const VolumeSpecSchema = z.object({
  name: z.string(),
  persistentVolumeClaim: z
    .object({
      resources: z.object({
        requests: z.object({ storage: z.string() }),
      }),
      accessModes: z.array(z.string()).optional(),
    })
    .optional(),
});
```

These schemas are then added to `BaseConfigSchema`:

```typescript
export const BaseConfigSchema = z
  .object({
    // Existing fields
    managedServices: ManagedServicesSchema.optional(), // deprecated, use services[]
    envVars: z.array(EnvVarSchema).optional(),

    // K8s-native container config (FR-ENV-026)
    image: z.string().optional(),
    command: z.array(z.string()).optional(),
    args: z.array(z.string()).optional(),
    workingDir: z.string().optional(),
    ports: z.array(ContainerPortSchema).optional(),
    env: z.array(K8sEnvVarSchema).optional(),
    resources: ResourceRequirementsSchema.optional(),
    livenessProbe: ProbeSchema.optional(),
    readinessProbe: ProbeSchema.optional(),
    startupProbe: ProbeSchema.optional(),

    // Init containers (FR-ENV-031)
    initContainers: z.array(InitContainerSpecSchema).optional(),

    // Named service entries (FR-ENV-028)
    services: z.array(ManagedServiceSpecSchema).optional(),

    // Volumes (FR-ENV-032)
    volumes: z.array(VolumeSpecSchema).optional(),

    // Preset tracking (FR-ENV-030)
    preset: z.string().optional(),
  })
  .merge(DetectionFieldsSchema);
```

## Operator Config Resolution

**New file: `operator/internal/controller/config.go`**

Merge chain:

1. **Environment CR `Config`** (highest priority)
2. **Project template `Config`** (defaults for environment type)
3. **Zero/empty** — no probes, no services, operator logs warning

```go
// resolveConfig merges environment config over project template defaults.
// Non-zero/non-nil environment values override template values.
// Uses K8s-native types throughout (see FR-ENV-026 design paradigm).
func resolveConfig(env *EnvironmentConfig, tmpl *EnvironmentConfig) EnvironmentConfig {
	result := EnvironmentConfig{}
	if tmpl != nil {
		result = *tmpl // deep copy in practice
	}
	if env == nil {
		return result
	}
	// Override with environment-specific values
	if env.Image != "" { result.Image = env.Image }
	if len(env.Command) > 0 { result.Command = env.Command }
	if len(env.Args) > 0 { result.Args = env.Args }
	if env.WorkingDir != "" { result.WorkingDir = env.WorkingDir }
	if len(env.Ports) > 0 { result.Ports = env.Ports }
	if len(env.Env) > 0 { result.Env = append(result.Env, env.Env...) }
	if env.Resources != nil { result.Resources = env.Resources }
	if env.LivenessProbe != nil { result.LivenessProbe = env.LivenessProbe }
	if env.ReadinessProbe != nil { result.ReadinessProbe = env.ReadinessProbe }
	if env.StartupProbe != nil { result.StartupProbe = env.StartupProbe }
	if len(env.InitContainers) > 0 { result.InitContainers = env.InitContainers }
	if len(env.Services) > 0 { result.Services = env.Services }
	if len(env.Volumes) > 0 { result.Volumes = env.Volumes }
	return result
}
```

## Framework Presets (Web App)

**New file: `web/src/lib/framework-presets.ts`**

Resolved entirely in the web app. The operator never sees preset names.

| Preset       | Image            | Command                | Port    | Liveness             | Dev Memory | Install                         |
| ------------ | ---------------- | ---------------------- | ------- | -------------------- | ---------- | ------------------------------- |
| nextjs       | node:22-slim     | `next dev --turbopack` | 3000    | /api/health/liveness | 2Gi        | npm install                     |
| generic-node | node:22-slim     | `npm start`            | 3000    | /healthz             | 512Mi      | npm install                     |
| python       | python:3.12-slim | `gunicorn app:app`     | 8000    | /health              | 512Mi      | pip install -r requirements.txt |
| go           | golang:1.22      | `go run .`             | 8080    | /healthz             | 256Mi      | go mod download                 |
| static       | nginx:alpine     | (nginx default)        | 80      | /                    | 128Mi      | (none)                          |
| custom       | (empty)          | (empty)                | (empty) | (empty)              | (empty)    | (empty)                         |

Each preset also defines: startup probe (with appropriate failureThreshold), resource requests, managed service defaults (e.g., nextjs preset includes postgres service entry), framework-specific env vars.

## Operator Controller Changes

### `deploy.go` (Managed Deployment Mode)

Replace hardcoded values with reads from resolved config:

```go
func desiredDeployment(env *Environment, config *EnvironmentConfig, namespace string) *appsv1.Deployment {
	// Build main container from config — all fields come from CRD
	container := corev1.Container{
		Name:           "app",
		Image:          config.Image,
		Command:        config.Command,
		Args:           config.Args,
		WorkingDir:     config.WorkingDir,
		Ports:          config.Ports,
		Env:            config.Env,
		Resources:      derefResources(config.Resources),
		LivenessProbe:  config.LivenessProbe,
		ReadinessProbe: config.ReadinessProbe,
		StartupProbe:   config.StartupProbe,
		VolumeMounts:   config.VolumeMounts,
	}

	// Build init containers from config
	initContainers := toK8sInitContainers(config.InitContainers)

	// No hardcoded values — everything from CRD
	// ...
}
```

### `development_deploy.go` (Dev Mode)

Same pattern — all values from config. The git-clone init container is the only operator-managed container (it's infrastructure, not app config). Everything else comes from the CRD:

- Base image → `config.Image`
- Dev command → `config.Command`
- Working dir → `config.WorkingDir`
- Port → `config.Ports[0].ContainerPort`
- Probes → `config.LivenessProbe`, etc.
- Install/migrate → `config.InitContainers`
- Postgres → `config.Services` (creates StatefulSet)

### `resources.go`

Read `Project.Spec.Resources.DefaultQuota` instead of hardcoding:

```go
func desiredResourceQuota(namespace string, quota *QuotaSpec) *corev1.ResourceQuota {
	// Use project quota if available, warn if falling back to defaults
	cpu := "2"
	memory := "4Gi"
	if quota != nil && quota.CPU != "" { cpu = quota.CPU }
	if quota != nil && quota.Memory != "" { memory = quota.Memory }
	// ...
}
```

## Sync Function Changes

**File: `web/src/lib/sync-project-cr.ts`**

`environmentConfigToTemplate()` maps the expanded web config directly to CRD config fields. Since both use K8s-native types, the mapping is largely 1:1:

```typescript
function environmentConfigToTemplate(
  config: EnvironmentConfig,
): EnvironmentTemplate {
  return {
    sourceRef: "primary",
    type: config.method === "helm" ? "helm" : "managed",
    path: getPathForMethod(config),
    builds: getBuildsForMethod(config),
    config: {
      image: config.image,
      command: config.command,
      args: config.args,
      workingDir: config.workingDir,
      ports: config.ports,
      env: config.env,
      resources: config.resources,
      livenessProbe: config.livenessProbe,
      readinessProbe: config.readinessProbe,
      startupProbe: config.startupProbe,
      initContainers: config.initContainers,
      services: config.services,
      volumes: config.volumes,
    },
  };
}
```

## UI Components

### Environment Config Tab (`/projects/[slug]/env/[envSlug]`)

- **Preset selector** — dropdown, resolves to K8s-native values, auto-fills all fields
- **Container** — image, command, args, workingDir, ports (mirrors Deployment container spec)
- **Probes** — liveness/readiness/startup (mirrors Deployment probe config)
- **Resources** — CPU/memory requests and limits (mirrors Deployment resources)
- **Init Containers** — list of named containers with image, command, env (mirrors Deployment initContainers)
- **Services** — named entries with container spec + storage (mirrors StatefulSet pattern)
- **Volumes** — PVC definitions with size and access modes (mirrors PVC spec)

### Project Platform Page (`/projects/[slug]/platform`)

- Per-environment-type defaults (Development / Deployment tabs)
- Same fields as environment config — becomes `EnvironmentTemplate.Config`

## Metrics

| Metric                                      | Target                               | Measurement Method                                     |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| Zero hardcoded framework values in operator | 0                                    | `grep` for string literals like "3000", "node:", "npm" |
| Non-Next.js project deploys                 | Go or Python project via preset      | E2E test                                               |
| Config round-trip integrity                 | Web → CRD → Operator matches         | Integration test comparing resolved config             |
| Helm path still works                       | Existing helm deployments unaffected | Regression E2E test                                    |

## Risks & Mitigations

| Risk                                    | Impact | Mitigation                                                                    |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| CRD schema change breaks existing envs  | High   | All new fields `omitempty`; operator falls back when empty                    |
| K8s type imports bloat CRD YAML         | Low    | Curated subset keeps it manageable                                            |
| Managed services StatefulSet complexity | Medium | Ship postgres first (already works); add redis/opensearch later               |
| Large scope: operator + web + UI        | High   | Phase: CRD+operator → web schemas → UI forms                                  |
| Postgres credential generation          | Medium | K8s Secret with generated password; inject via `env[].valueFrom.secretKeyRef` |

## File Structure

```
operator/
├── AGENTS.md                           # Edit: document K8s-native types paradigm
├── spec.md                             # Edit: document K8s-native types paradigm
├── api/v1alpha1/
│   ├── environment_types.go            # Edit: expand EnvironmentConfig with K8s types
│   └── project_types.go               # Edit: add Config to EnvironmentTemplate
└── internal/controller/
    ├── config.go                       # Create: resolveConfig() merge logic
    ├── config_test.go                  # Create: merge logic tests
    ├── deploy.go                       # Edit: read config instead of hardcoding
    ├── development_deploy.go           # Edit: read config instead of hardcoding
    └── resources.go                    # Edit: read project quota config

web/src/
├── types/
│   ├── environment-config.ts           # Edit: add K8s-native Zod schemas
│   └── crd.ts                          # Edit: match Go CRD type changes
├── lib/
│   ├── framework-presets.ts            # Create: preset definitions + resolver
│   └── sync-project-cr.ts             # Edit: map config to CRD template
└── app/(dashboard)/projects/[slug]/
    ├── env/[envSlug]/_components/      # Edit: expand config form with K8s-native fields
    └── platform/_components/           # Edit: per-type default config
```

## Implementation Order

1. Update `spec.md` with FR-ENV-026 through FR-ENV-032 (done)
2. Create `plan.full-config.md` (this document)
3. Document K8s-native types paradigm in `operator/AGENTS.md` and `operator/spec.md`
4. CRD type changes (Go) — add K8s-native fields + regenerate CRD manifests
5. `config.go` — resolveConfig() merge logic + tests
6. Update `deploy.go` and `development_deploy.go` to read config
7. Update `resources.go` to read project quota
8. Web: expand Zod schemas with K8s-native types
9. Web: create `framework-presets.ts`
10. Web: update `sync-project-cr.ts` to map new fields
11. Web: update TypeScript CRD types
12. Web: expand UI config forms
13. E2E test: deploy a non-Next.js project via preset

## Dependencies

No new packages. All changes use existing imports:

- Go: `k8s.io/api/core/v1`, `k8s.io/api/apps/v1` (already imported in controllers)
- TypeScript: `zod` (already used), no new K8s client dependencies
