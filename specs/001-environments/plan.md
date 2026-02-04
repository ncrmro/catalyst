# Implementation Plan: Environments & Templates

**Branch**: `copilot/update-deployment-ingresses-system` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-environments/spec.md`

## Summary

Standardize environment deployment strategies using **Environment Templates** within the `Project` CRD. This enables supporting diverse project types (Helm, Docker Compose, Nix) with a consistent operator and UI surface.

## Technical Context

**Language/Version**: Go 1.22+ (Operator), TypeScript/Next.js 15 (Web)
**Target Platform**: Kubernetes (K3s/Kind/EKS/GKE)
**Project Type**: System (Operator + Web Platform)

## Constitution Check

_GATE: Passed. Standardization reduces complexity by unifying deployment paths._

## Project Structure

### Documentation

```text
specs/001-environments/
├── plan.md              # This file
├── spec.md              # Functional requirements & User Stories
├── research.*.md        # Deep dives
└── tasks.md             # Implementation tasks
```

### Source Code

```text
operator/
├── api/v1alpha1/        # CRD Definitions
├── internal/controller/ # Reconciliation Logic
└── examples/            # Standardized Manifest Examples

web/
├── src/app/(dashboard)/ # UI Pages
├── packages/@catalyst/kubernetes-client/ # Client Lib
└── __tests__/integration/ # Contract Tests
```

---

## North Star Goals (Amendment 2026-01-09)

We are focusing on enabling fully functional **development environments** for three distinct use cases:

1.  **Catalyst (Self-hosting)**:
    - **Strategy**: Helm-based for both development (hot-reload) and production.
    - **Goal**: Prove the platform can host itself using standard Helm charts.

2.  **Next.js App + LibSQL**:
    - **Strategy**: Zero-config (no Dockerfile) build. Managed database service (LibSQL/Turso).
    - **Goal**: Prove "Zero-Friction" onboarding for modern web apps without containers.

3.  **Rails App**:
    - **Strategy**: `docker-compose.yml` for development (complex local setup reuse). Helm for production.
    - **Goal**: Prove support for legacy/complex stacks that rely on Docker Compose for local dev.

## Implementation Strategy (Phase 14 Amendment)

The North Star goal will be delivered through a prioritized sequence:

1.  **Operator Logic**: Implement the core translation and deployment logic for the three template types (Helm, Compose, Zero-Config).
2.  **Local Validation (Extended Test)**: Developers validate all three use cases in a local K3s cluster.
    - **Note**: Builds are specifically deferred for now. The primary focus is getting the Next.js configuration running in a preview environment using a boilerplate Next.js app.
    - **Requirement**: Use a boilerplate Next.js application with a readiness check that verifies it can reach a LibSQL database.
    - A `make validate` script will be created to automate these checks.
3.  **UI Validation**: Manual verification that the Web UI reflects the state and allows configuration of these environments.
4.  **CI Integration (Lightweight)**: Automated regression testing for the most common use case (Next.js/Zero-Config) in Kind to manage resource constraints.

## Environment Templates Standardization (Amendment 2026-01-09)

**Goal**: Standardize how environments are defined and deployed to support the North Star use cases.

**Completed**:

- **Standardized Keys**: Mandated `development` and `deployment` as the standard template keys in `Project` CRD.
- **Reference Examples**: Created standardized example pairs in `operator/examples/` (`catalyst.*`, `compose.*`, `prebuilt.*`, `custom-helm.*`) as the source of truth.
- **Spec Updates**: Updated `spec.md` to document standard templates and managed services.

**Upcoming Work**:

1. **Docker Compose Support (FR-ENV-012)**:
   - Design: Allow `type: docker-compose` in templates. See [`operator/examples/compose.project.yaml`](../../operator/examples/compose.project.yaml).
   - Implementation: Operator translates `docker-compose.yml` to Kubernetes manifests (or delegates to a tool).

2. **Prebuilt Image Overrides (FR-ENV-013)**:
   - Design: Allow templates to define a base image, with the specific tag/SHA provided by the `Environment` CR instance. See [`operator/examples/prebuilt.project.yaml`](../../operator/examples/prebuilt.project.yaml).
   - Implementation: Operator logic to inject `Environment.Spec.Sources[0].CommitSha` or `Config.Image` into the template values.

3. **User-Managed Helm (FR-ENV-014)**:
   - Design: Support templates where the user provides the full chart and values, with minimal operator interference. See [`operator/examples/custom-helm.project.yaml`](../../operator/examples/custom-helm.project.yaml).
   - Implementation: Ensure operator supports "passthrough" mode for Helm values.

4. **Nix Flake Support (FR-ENV-015)**:
   - Design: Support `type: nix-flake` for devShells and Nix builds. See [`operator/examples/nix.project.yaml`](../../operator/examples/nix.project.yaml) and [`operator/examples/catalyst-nix.project.yaml`](../../operator/examples/catalyst-nix.project.yaml).
   - Implementation: Provision environments using Nix-capable executors that can instantiate flakes and build images.

5. **Registry Support (FR-ENV-016/017)**:
   - Support private image pulling/pushing by managing registry secrets.

6. **UI Updates**:
   - Update Platform page to reflect these capabilities (partially done with cross-linking).
   - Create UI forms for configuring these advanced template types.

## Related Research

- [research.web-terminal.md](./research.web-terminal.md) - Web terminal implementation approaches (WebSocket, SSE, polling, custom servers)

## Current Status

### Implemented

- **@catalyst/kubernetes-client package** - Complete with:
  - Environment CR operations (CRUD, watch with auto-reconnection)
  - Pod operations (list, logs, metrics)
  - Exec/shell functionality (command execution)
  - Multi-cluster KubeConfig support
  - Dynamic ESM loading for @kubernetes/client-node

- **Terminal UI component** - `web/src/components/terminal.tsx` using xterm.js
  - Command-by-command execution via server actions
  - Fully integrated with `exec` from `@catalyst/kubernetes-client`

- **Exec server action** - `web/src/actions/pod-exec.ts`
  - Executes commands in pod containers using new client package

### Remaining Integration Work

1. **Package Dependency**:
   - Add `"@catalyst/kubernetes-client": "workspace:*"` to `web/package.json`

2. **Real Data Integration**:
   - Update `web/src/actions/preview-environments.ts` to use `@catalyst/kubernetes-client`
   - Fetch real Pod/Container status in `web/src/app/(dashboard)/projects/[slug]/env/[envSlug]/page.tsx`
   - Replace `mockContainers` in `EnvironmentDetailView` with real data

3. **Legacy Cleanup**:
   - Migrate usages of `web/src/lib/k8s-operator.ts` to new client
   - Delete legacy files:
     - `web/src/lib/k8s-operator.ts`
     - `web/src/lib/k8s-pods.ts`
     - `web/src/lib/k8s-namespaces.ts`

### Operator Implementation Roadmap

1. **Build Controller**: Kaniko-based builds for Docker/Auto-detect.
2. **Generic Deployment**: Standard K8s resources (Deployment/Service/Ingress).
3. **Helm Deployment**: Helm SDK integration for template-driven deployments.
4. **Registry Support**: Secret management for private image pulling/pushing.
5. **CI/Job Orchestration**: Future support for lifecycle hooks.

### Operator Implementation Plan

**1. Build Controller Logic (Docker/Auto-detect)**

- **Goal**: Build source code into a container image inside the cluster using Kaniko.
- **File**: `operator/internal/controller/environment_controller.go` (logic) & `operator/internal/controller/build.go` (resource definitions).
- **Workflow**:
  1.  **Check State**: If `Environment.Status.Phase` is empty or "Pending".
  2.  **Check Job**: Look for an existing Job named `build-<project>-<commit-short>` in the target namespace.
  3.  **Create Job (if missing)**:
      - **Image**: `gcr.io/kaniko-project/executor:latest`
      - **Args**:
        - `--context=git://github.com/<org>/<repo>.git#<commit-sha>` (Requires git secret if private)
        - `--destination=registry.cluster.local:5000/<project>:<commit-sha>`
        - `--dockerfile=Dockerfile` (Default, or from `Project.Spec.Deployment.Path`)
        - `--insecure` (For internal registry)
        - `--cache=true` (Speed up builds)
      - **Resources**: Set reasonable requests/limits (e.g., 1GB RAM).
  4.  **Update Status**: Set `Environment.Status.Phase` to "Building".
  5.  **Watch Job**:
      - If **Succeeded**: Transition Phase to "Deploying".
      - If **Failed**: Transition Phase to "Failed" (User must push new commit to retry).
- **Job Spec Example**:
  ```yaml
  apiVersion: batch/v1
  kind: Job
  metadata:
    name: build-myproj-a1b2c3d
    namespace: env-myproj-pr-123
  spec:
    ttlSecondsAfterFinished: 3600 # Cleanup successful builds
    template:
      spec:
        containers:
          - name: kaniko
            image: gcr.io/kaniko-project/executor:latest
            args:
              - "--context=git://github.com/org/repo.git#commit-sha"
              - "--destination=registry.cluster.local:5000/myproj:commit-sha"
              - "--insecure"
            env:
              - name: GIT_TOKEN # If private repo
                valueFrom: { secretKeyRef: { ... } }
        restartPolicy: Never
  ```

**2. Generic Deployment Logic (Docker/Auto-detect)**

- **Goal**: Deploy the built image using standard K8s resources.
- **File**: `operator/internal/controller/environment_controller.go`
- **Logic**:
  - Once Build Job succeeds, call existing (unused) helpers in `deploy.go`:
    - `desiredDeployment`: Creates Deployment using the image from step 1.
    - `desiredService`: Creates ClusterIP service.
    - `desiredIngress`: Creates Ingress with TLS.
  - Apply these resources to the target namespace.
  - Update `Environment.Status.Phase` to "Ready".

**3. Helm Deployment Logic**

- **Goal**: Deploy using a Helm chart defined in the repo.
- **File**: `operator/internal/controller/environment_controller.go`
- **Logic**:
  - If `Project.Spec.Deployment.Type` is "helm".
  - Import Helm Go SDK (`helm.sh/helm/v3`).
  - Create a Helm `ActionConfig` pointed at the target namespace.
  - Run `RunInstall` or `RunUpgrade`.
  - Map `Environment.Spec.Config.EnvVars` to Helm values (e.g., `--set env.foo=bar`).

**4. Prerequisites & Security**

- **RBAC Permissions**:
  - Operator needs `create, get, list, watch, delete` on `batch/v1/jobs` to manage builds.
  - Operator needs `create, get` on `core/v1/secrets` to copy/mount git credentials.
- **Secret Management**:
  - **Git Auth**: The Operator should expect a `git-credentials` Secret in its own namespace (or a referenced Secret in `Project`). It must mount this into the Kaniko pod (via `GIT_TOKEN` env var or `.git-credentials` file).
  - **Registry Auth**: Since we use `--insecure` for the internal registry, explicit auth config might be skipped for now, but production setups should mount a `docker-config` Secret.
- **Network Policy**: The Build Job needs egress access to:
  - GitHub (to clone source).
  - Internal Registry (to push image).
  - _Note_: The `default-deny` policy created for the namespace must allow these.

**5. CI/Job Orchestration (Future/Extension)**

- **Goal**: Run user-defined tasks (tests, migrations) within the environment.
- **Design**: See `specs/001-environments/research.ci-jobs.md`.
- **Implementation**:
  - Extend `Project` CRD with `jobs: []JobConfig`.
  - In `EnvironmentReconciler`, check for jobs matching current lifecycle phase (e.g., `PostBuild`).
  - Create K8s `Job` resources in the environment namespace.
  - Block/Advance `Environment` phase based on Job success.

**6. Schema Updates (Implemented)**

- **Project CRD**: Updated to support multiple sources.
  - Changed `spec.source` (single) to `spec.sources` (array).
  - Added `name` field to `SourceConfig` to identify components (e.g., "frontend", "backend").
- **Environment CRD**: Updated to match Project structure.
  - Changed `spec.source` (single) to `spec.sources` (array).
  - Added `name` field to `EnvironmentSource`.
- **Impact**: Operator logic must now iterate over `sources` when reconciling builds and deployments.

**7. Testing Strategy**

- **Unit Tests**: Coverage for helper logic (Namespace generation, URL generation).
- **Integration Tests (Web)**:
  - **Goal**: Verify the contract between Web App and Operator.
  - **Scenario**:
    1.  Call `createPreviewDeployment`.
    2.  Verify `Environment` CR exists with correct `spec.sources`.
    3.  _Simulate Operator_: Patch `Environment.Status` to `{ phase: "Ready", url: "..." }`.
    4.  Verify `getPreviewDeploymentStatusFull` returns "Ready" and the correct URL.
- **End-to-End Tests**: Full cluster tests (Kind/K3s) running both Web App and Operator are deferred to the Operator repo's CI.

### Deferred

- **True interactive terminal** - Requires WebSocket support
  - Next.js 15 doesn't support WebSocket route handlers natively
  - `next-ws` package not compatible with Next.js 15
  - See [research.web-terminal.md](./research.web-terminal.md) for alternatives

## Package Structure

```
web/packages/catalyst-kubernetes-client/
├── package.json
├── tsconfig.json
├── README.md
├── index.ts                        # Main exports
└── src/
    ├── config.ts                   # KubeConfig, registry, TLS handling
    ├── loader.ts                   # Dynamic ESM loading for @kubernetes/client-node
    ├── errors.ts                   # KubernetesError, ExecError, ConnectionError
    ├── types/
    │   ├── index.ts
    │   ├── environment.ts          # Environment CR types (catalyst.catalyst.dev/v1alpha1)
    │   ├── project.ts              # Project CR types
    │   └── common.ts               # K8s metadata, conditions, etc.
    ├── environments/
    │   ├── index.ts
    │   ├── client.ts               # get, list, create, update, delete, apply
    │   └── watcher.ts              # watch with auto-reconnection
    ├── pods/
    │   ├── index.ts
    │   ├── list.ts                 # List pods in namespace
    │   ├── logs.ts                 # Get/stream pod logs
    │   └── metrics.ts              # Get pod resource usage
    ├── exec/
    │   ├── index.ts
    │   ├── exec.ts                 # Run command and get result
    │   ├── shell.ts                # Interactive shell session (WebSocket)
    │   └── resize.ts               # Terminal resize handling
    └── namespaces/
        └── index.ts                # Namespace CRUD with policies
```

## API Group

All Catalyst CRDs use: `catalyst.catalyst.dev/v1alpha1`

This follows kubebuilder convention: `{group}.{domain}/{version}` where group=`catalyst`, domain=`catalyst.dev`.

## Rationale

### Why a Separate Package?

1. **Dependency Isolation**: `@kubernetes/client-node` has ESM/CommonJS compatibility issues. Containing it in one package simplifies workarounds.

2. **Type Safety**: A single package with explicit exports ensures all Kubernetes interactions go through a well-typed API surface.

3. **Focused Testing**: The package can have its own test suite with proper mocking.

4. **Clean API**: Provides typed interfaces matching Go operator CRD definitions.

### Why Two Components (Client + Operator)?

1. **Separation of Concerns**: Web app needs read access + exec. Deployment orchestration belongs in the operator.

2. **Security Model**: Web app runs with limited permissions. Operator runs with elevated cluster permissions.

3. **Reliability**: Operator's reconciliation loop handles failures and drift.

4. **Independence**: Operator can be developed, tested, and deployed separately.

## Usage

```typescript
import {
  createEnvironmentClient,
  EnvironmentWatcher,
  getClusterConfig,
  exec,
} from "@catalyst/kubernetes-client";

// List environments
const client = await createEnvironmentClient();
const envs = await client.list({ namespace: "catalyst-system" });

// Execute command in pod
const kubeConfig = await getClusterConfig();
const result = await exec(kubeConfig, {
  namespace: "pr-123",
  pod: "app-0",
  command: ["ls", "-la"],
});
```

## Web App Integration

The web app uses the package via a re-export:

```typescript
// web/src/lib/kubernetes-client.ts
export * from "@catalyst/kubernetes-client";
```

And is configured in `next.config.ts`:

```typescript
transpilePackages: [
  "@tetrastack/react-glass-components",
  "@catalyst/kubernetes-client",
],
```

## Old Code Migration

The following files in `web/src/lib/` remain for app-specific logic (gradual migration):

| File                        | Status        | Notes                            |
| --------------------------- | ------------- | -------------------------------- |
| `k8s-client.ts`             | Keep          | Re-exports new package           |
| `k8s-namespaces.ts`         | Migrate later | Namespace create/delete logic    |
| `k8s-pods.ts`               | Migrate later | Pod listing (uses new package)   |
| `k8s-operator.ts`           | Keep          | Environment CR operations        |
| `k8s-preview-deployment.ts` | Keep          | Preview deployment orchestration |
| `k8s-pull-request-pod.ts`   | Keep          | PR pod operations                |
| `k8s-github-oidc.ts`        | Keep          | GitHub OIDC configuration        |

## Success Criteria

- [x] Environment CR operations in package
- [x] Pod operations in package
- [x] Exec functionality in package
- [x] Terminal UI component with xterm.js
- [x] Server action for command execution
- [x] Package integrated into web app
- [x] TypeCheck and lint passing
- [ ] Interactive terminal (blocked by Next.js 15 WebSocket support)
- [ ] Full migration of old k8s-\*.ts files
- [ ] Integration tests with K3s VM
- [ ] Verify Namespace naming: `<team>-<project>-<env>` with labels
- [ ] FR-ENV-001: Graceful handling of missing Kubernetes resources in web UI

## FR-ENV-001: Graceful Handling of Missing Kubernetes Resources

### Approach

1. **Create reusable `KubeResourceNotFound` component** (`web/src/components/kube-resource-not-found.tsx`):
   - Accepts resource type (e.g., "Environment"), resource name, and optional retry callback
   - Displays clear message that resource was not found in cluster
   - Lists possible causes (deleted externally, `make reset`, cluster connectivity, operator not reconciled)
   - Provides retry button to re-fetch from cluster

2. **Update environment page** (`web/src/app/(dashboard)/projects/[slug]/env/[envSlug]/page.tsx`):
   - Use `KubeResourceNotFound` component when environment CR is not found
   - Pass resource type and name for context

## Operator Integration

The web application uses a declarative operator-based workflow:

**Web App Responsibilities:**

- Create Environment CRs
- Read CR status
- Delete CRs
- Poll CR status to update database and UI
- Execute commands in environment pods

**Operator Responsibilities:**

- Define Project and Environment CRDs
- Handle namespace creation with ResourceQuota and NetworkPolicy
- Orchestrate Helm and manifest deployments
- Manage build jobs for PR images
- Update CR status (phase: Pending → Building → Deploying → Ready)
- Cleanup on CR deletion (finalizer pattern)

See [Operator Specification](../../operator/spec.md) for implementation details.

1. **Docker Compose Support (FR-ENV-012)**: Allow `type: docker-compose` in templates.
2. **Prebuilt Image Overrides (FR-ENV-013)**: Allow templates to define a base image with tag/SHA provided by the Environment CR.
3. **User-Managed Helm (FR-ENV-014)**: Support "passthrough" mode for custom Helm charts.
4. **Nix Flake Support (FR-ENV-015)**: Support Nix devShells and builds.

---

## Current Status

### Implemented (Client & UI)

- **@catalyst/kubernetes-client package**: Complete with CRUD, Watch, Pod Ops, and Exec/Shell support.
- **Terminal UI component**: xterm.js integration via server actions.
- **Exec server action**: Command execution in pod containers.

### Remaining Integration Work

1. **Package Dependency**: Add client package to web app.
2. **Real Data Integration**: Use client package for real Pod/Container status in UI.
3. **Legacy Cleanup**: Remove old `lib/k8s-*` files.

### Operator Implementation Roadmap

1. **Build Controller**: Kaniko-based builds for Docker/Auto-detect.
2. **Generic Deployment**: Standard K8s resources (Deployment/Service/Ingress).
3. **Helm Deployment**: Helm SDK integration for template-driven deployments.
4. **Registry Support**: Secret management for private image pulling/pushing.
5. **CI/Job Orchestration**: Future support for lifecycle hooks.

### Use Case 3: Rails + Docker Compose

_Requirement: Complex local dev setup reuse._

- [ ] **Parser**: Implement `docker-compose` parser in Operator (`FR-ENV-012`).
- [ ] **Translation**: Map Compose services to Kubernetes `Deployment` and `Service` objects.
- [ ] **Volume Mapping**: Handle `volumes:` for hot-reload in dev mode.
- [ ] **Template**: Create `rails.project.yaml` example using `compose.project.yaml` as base.

### Step 3: UI Manual Validation

**Goal**: Verify the Web UI correctly reflects the state of these diverse environments.

- [ ] **Manual Test**:
  1. Create Projects in UI corresponding to the examples.
  2. Verify "Platform" page displays the correct template configuration.
  3. Verify "Environment" detail page shows logs and status for the running pods.

### Step 4: CI Integration (Lightweight)

**Goal**: Automated regression testing within resource constraints.

- [ ] **Node.js Test**: Add a GitHub Action workflow that runs the `Next.js` (Zero-Config) scenario in Kind.
  - Why: It's the most common use case and lighter than Rails/Compose.
  - Check: Project creation -> Environment creation -> Status=Ready -> HTTP 200 OK.

See `tasks.md` for the detailed execution list.

---

## Multi-Tier Secret Management (FR-ENV-034 through FR-ENV-041)

**Status**: Planned | **Priority**: P1 | **Blocker**: Production Catalyst deployment requires GitHub credentials

### Problem Statement

Environments require secrets (GitHub credentials, database URLs, API keys) but currently have no systematic storage mechanism. Manual Kubernetes Secret creation is error-prone and not scalable. Production Catalyst deployment (dogfooding) fails with "Missing required GitHub environment variables."

### Design Overview

Implement a GitHub-style three-tier secret management system with precedence-based inheritance:

1. **Team Secrets** → Shared across all projects (lowest precedence)
2. **Project Secrets** → Shared across all environments in a project (medium precedence)
3. **Environment Secrets** → Specific to single environment (highest precedence)

**Precedence Rule**: Environment > Project > Team (highest priority overrides lower)

### Database Schema

**Single polymorphic table** with hierarchical foreign keys. Team ID is always set, project/environment IDs are nullable based on scope level.

```typescript
export const secrets = pgTable(
  "secrets",
  {
    // Hierarchical foreign keys (team_id always present)
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    environmentId: text("environment_id").references(
      () => projectEnvironments.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(), // e.g., "GITHUB_APP_ID"

    // Secret data
    description: text("description"),
    encryptedValue: text("encrypted_value").notNull(),
    iv: text("iv").notNull(), // Initialization vector
    authTag: text("auth_tag").notNull(), // GCM authentication tag

    // Metadata
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Composite primary key = natural uniqueness constraint
    primaryKey({
      columns: [table.teamId, table.projectId, table.environmentId, table.name],
    }),
  ],
);
```

**Scope Patterns** (team_id always present):

- **Team-level**: `{ teamId: "abc", projectId: null, environmentId: null, name: "API_KEY" }`
- **Project-level**: `{ teamId: "abc", projectId: "xyz", environmentId: null, name: "API_KEY" }`
- **Environment-level**: `{ teamId: "abc", projectId: "xyz", environmentId: "123", name: "API_KEY" }`

**Benefits**:

- Single table = simpler migrations and queries
- Composite primary key = no separate ID needed, natural uniqueness
- Always filter by team first (for permissions) → composite PK index is optimal for queries
- Proper foreign key constraints with cascading deletes
- No redundant indexes needed (composite PK serves as both uniqueness constraint and query index)

### Encryption Strategy

Reuse existing AES-256-GCM pattern from `@tetrastack/backend/utils/security.ts`:

```typescript
// Encryption (on create/update)
const { encryptedData, iv, authTag } = encrypt(secretValue);
await db.insert(teamSecrets).values({
  name: "GITHUB_APP_ID",
  encryptedValue: encryptedData,
  iv,
  authTag,
});

// Decryption (on resolution)
const value = decrypt(secret.encryptedValue, secret.iv, secret.authTag);
```

**Key**: `TOKEN_ENCRYPTION_KEY` environment variable (32-byte hex)

### Secret Resolution Algorithm

Core function: `resolveSecretsForEnvironment(teamId, projectId, environmentId)`

```typescript
async function resolveSecretsForEnvironment(
  teamId: string,
  projectId: string,
  environmentId: string,
): Promise<Map<string, ResolvedSecret>> {
  // Fetch all three tiers in parallel
  const [teamSecrets, projectSecrets, envSecrets] = await Promise.all([
    db
      .select()
      .from(teamSecretsTable)
      .where(eq(teamSecretsTable.teamId, teamId)),
    db
      .select()
      .from(projectSecretsTable)
      .where(eq(projectSecretsTable.projectId, projectId)),
    db
      .select()
      .from(environmentSecretsTable)
      .where(eq(environmentSecretsTable.environmentId, environmentId)),
  ]);

  const resolved = new Map<string, ResolvedSecret>();

  // Apply in precedence order: team → project → environment
  for (const secret of teamSecrets) {
    const value = decrypt(secret.encryptedValue, secret.iv, secret.authTag);
    resolved.set(secret.name, { name: secret.name, value, source: "team" });
  }

  for (const secret of projectSecrets) {
    const value = decrypt(secret.encryptedValue, secret.iv, secret.authTag);
    resolved.set(secret.name, { name: secret.name, value, source: "project" }); // Override team
  }

  for (const secret of envSecrets) {
    const value = decrypt(secret.encryptedValue, secret.iv, secret.authTag);
    resolved.set(secret.name, {
      name: secret.name,
      value,
      source: "environment",
    }); // Override all
  }

  return resolved;
}
```

### Kubernetes Integration

**Operator API Endpoint**: `/api/internal/secrets/{environmentId}`

```typescript
// GET /api/internal/secrets/{environmentId}
// Authentication: Kubernetes TokenReview API
export async function GET(
  request: Request,
  { params }: { params: { environmentId: string } },
) {
  // 1. Authenticate operator using K8s TokenReview
  const token = extractBearerToken(request);
  await verifyServiceAccountToken(token);

  // 2. Fetch environment and resolve secrets
  const env = await getEnvironmentById(params.environmentId);
  const secrets = await resolveSecretsForEnvironment(
    env.project.teamId,
    env.projectId,
    env.id,
  );

  // 3. Return as flat key-value map
  return Response.json({
    secrets: Object.fromEntries(
      Array.from(secrets.entries()).map(([k, v]) => [k, v.value]),
    ),
  });
}
```

**Operator Workflow**:

1. Call web API: `GET /api/internal/secrets/{environmentId}`
2. Create K8s Secret: `kubectl create secret generic catalyst-secrets --from-literal=...`
3. Inject into pod spec:
   ```yaml
   env:
     - name: GITHUB_APP_ID
       valueFrom:
         secretKeyRef:
           name: catalyst-secrets
           key: GITHUB_APP_ID
   ```

### Access Control

**Permission Matrix**:

| Scope       | Who Can Manage                         |
| ----------- | -------------------------------------- |
| Team        | Team owners + admins                   |
| Project     | Team owners + admins + project members |
| Environment | Team owners + admins + project members |

Implemented in server actions via role checks:

```typescript
const membership = await getTeamMembership(userId, teamId);
if (!["owner", "admin"].includes(membership.role)) {
  throw new Error("Unauthorized");
}
```

### Validation Rules (FR-ENV-039)

Secret names must match Kubernetes env var conventions:

```typescript
const SECRET_NAME_REGEX = /^[A-Z_][A-Z0-9_]*$/;

const createSecretSchema = z.object({
  name: z
    .string()
    .max(253, "Secret name too long")
    .regex(
      SECRET_NAME_REGEX,
      "Invalid format: must be uppercase letters, digits, underscores only",
    ),
  value: z.string().min(1, "Value required"),
  description: z.string().optional(),
});
```

### User Interface

**Team Secrets Page**: `/teams/[slug]/secrets`
**Project Secrets Page**: `/projects/[slug]/secrets`

**Components**:

- `SecretList.tsx` - Table with masked values (●●●●●●●●)
- `SecretForm.tsx` - Create/edit form with validation
- `DeleteSecretDialog.tsx` - Confirmation before delete

**UX Flow**:

1. User navigates to secrets page
2. Clicks "Create Secret"
3. Fills form: NAME (uppercase validation), Value (password input), Description
4. On submit, value shown once for confirmation
5. Table shows masked value with Edit/Delete actions

### Structured Logging (FR-ENV-041)

All secret operations logged via `src/lib/logging.ts`:

```typescript
await logger.info("secret-created", {
  secretName: secret.name,
  scope: "team", // or "project" or "environment"
  scopeId: teamId,
  userId: session.user.id,
});

await logger.info("secret-updated", { ... });
await logger.info("secret-deleted", { ... });
```

**Never log**: Decrypted secret values

### Migration Path

**Phase 1**: Create migration `0021_add_secret_management.sql`

```sql
CREATE TABLE team_secrets (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX team_secrets_team_id_name_unique ON team_secrets(team_id, name);

-- Repeat for project_secrets and environment_secrets
```

### Testing Strategy

**Unit Tests**:

- `resolveSecretsForEnvironment()` precedence (3 tiers × 3 override scenarios)
- Encryption roundtrip (encrypt → store → retrieve → decrypt)
- Name validation edge cases

**Integration Tests**:

- CRUD operations via server actions
- Access control enforcement
- Operator API authentication

**E2E Test**:

```typescript
test("secret management full workflow", async ({ page }) => {
  // 1. Create project secret via UI
  await page.goto("/projects/catalyst/secrets");
  await page.click('button:has-text("Create Secret")');
  await page.fill('input[name="name"]', "GITHUB_APP_ID");
  await page.fill('input[name="value"]', "test123");
  await page.click('button:has-text("Save")');

  // 2. Deploy environment
  await page.goto("/projects/catalyst/platform");
  await page.click('button:has-text("Create Environment")');
  // ... wait for deployment

  // 3. Verify K8s Secret exists
  const secret = await kubectl.getSecret("catalyst-secrets", namespace);
  expect(secret.data.GITHUB_APP_ID).toBe(base64("test123"));

  // 4. Verify pod can access env var
  const podEnv = await kubectl.exec(pod, ["env"]);
  expect(podEnv).toContain("GITHUB_APP_ID=test123");
});
```

### Rollout Plan

1. **Merge spec update** (this commit) ✅
2. **Create GitHub issue** with implementation plan
3. **Assign to Copilot** for automated implementation
4. **Review & test** in staging environment
5. **Deploy to production** Catalyst instance
6. **Verify** GitHub credentials work in dogfood deployment

### Future Enhancements (Out of Scope for MVP)

- Secret versioning and history
- Approval workflows for production secrets
- External secret manager integration (Vault, AWS Secrets Manager)
- Secret rotation policies
- Detailed audit logs beyond structured logging
- "Outdated environment" indicator when upstream secrets change
