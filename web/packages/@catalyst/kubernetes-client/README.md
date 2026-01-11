# @catalyst/kubernetes-client

TypeScript client for Catalyst Kubernetes CRDs (Environment, Project) with exec/shell support.

## API Group

All Catalyst CRDs use the API group `catalyst.catalyst.dev/v1alpha1`.

## Installation

This package is part of the Catalyst monorepo and is installed as a workspace dependency.

```bash
# From web/ directory
npm install
```

## Usage

### Environment Operations

```typescript
import {
  createEnvironmentClient,
  EnvironmentWatcher,
  getClusterConfig,
} from "@catalyst/kubernetes-client";

// Create a client
const client = await createEnvironmentClient();

// List environments
const envList = await client.list({ namespace: "catalyst-system" });

// Get a specific environment
const env = await client.get("pr-123", "catalyst-system");

// Create an environment
const newEnv = await client.create({
  apiVersion: "catalyst.catalyst.dev/v1alpha1",
  kind: "Environment",
  metadata: { name: "pr-456", namespace: "catalyst-system" },
  spec: {
    projectRef: { name: "my-project" },
    type: "development",
    source: {
      commitSha: "abc123",
      branch: "feature/new-thing",
      prNumber: 456,
    },
  },
});

// Watch for changes
const kubeConfig = await getClusterConfig();
const watcher = new EnvironmentWatcher(kubeConfig);

await watcher.start({
  namespace: "catalyst-system",
  onEvent: (event) => {
    console.log(`${event.type}: ${event.object.metadata.name}`);
  },
  onError: (error) => {
    console.error("Watch error:", error);
  },
});

// Stop watching
watcher.stop();
```

### Pod Operations

```typescript
import {
  getClusterConfig,
  listPods,
  getPodLogs,
} from "@catalyst/kubernetes-client";

const kubeConfig = await getClusterConfig();

// List pods
const pods = await listPods(kubeConfig, "my-namespace", {
  labelSelector: "app=my-app",
});

// Get logs
const logs = await getPodLogs(kubeConfig, "my-namespace", "my-pod", {
  tailLines: 100,
  timestamps: true,
});
```

### Exec/Shell

```typescript
import {
  getClusterConfig,
  exec,
  createShellSession,
} from "@catalyst/kubernetes-client";

const kubeConfig = await getClusterConfig();

// Execute a command
const result = await exec(kubeConfig, {
  namespace: "my-namespace",
  pod: "my-pod",
  command: ["ls", "-la"],
});
console.log(result.stdout);

// Interactive shell session
const shell = await createShellSession(kubeConfig, {
  namespace: "my-namespace",
  pod: "my-pod",
  shell: "/bin/bash",
  initialSize: { cols: 80, rows: 24 },
});

shell.onData((data) => process.stdout.write(data));
shell.write("echo hello\n");
shell.resize(120, 40);
await shell.close();
```

## Configuration

The client automatically loads kubeconfig from:

1. `KUBECONFIG_PRIMARY`, `KUBECONFIG_SECONDARY`, etc. (base64-encoded JSON)
2. Default kubeconfig location (`~/.kube/config`)
3. In-cluster config when running inside Kubernetes

### Environment Variables

- `KUBECONFIG_*` - Base64-encoded JSON kubeconfig
- `KUBERNETES_API_SERVER_HOST` - Override API server hostname
- `KUBE_SKIP_TLS_VERIFY` - Skip TLS verification (true/false)

## Types

All CRD types are exported and match the Go definitions in the operator:

```typescript
import type {
  Environment,
  EnvironmentSpec,
  EnvironmentStatus,
  Project,
  ProjectSpec,
} from "@catalyst/kubernetes-client";
```

## Runtime Validation with Zod

For runtime validation of API responses, configuration files, or untrusted data, use the provided Zod schemas:

```typescript
import {
  EnvironmentSchema,
  validateEnvironment,
  safeValidateEnvironment,
} from "@catalyst/kubernetes-client/zod";
import { createEnvironmentClient } from "@catalyst/kubernetes-client";

// Get an environment
const client = await createEnvironmentClient();
const env = await client.get("my-env", "default");

// Validate at runtime
try {
  const validatedEnv = validateEnvironment(env);
  console.log("Valid environment:", validatedEnv);
} catch (error) {
  console.error("Validation failed:", error);
}

// Safe validation (returns result object)
const result = safeValidateEnvironment(env);
if (result.success) {
  console.log("Valid environment:", result.data);
} else {
  console.error("Validation errors:", result.error);
}
```

### Available Zod Schemas

- **Common**: `ObjectMetaSchema`, `ConditionSchema`, `ListMetaSchema`, `OwnerReferenceSchema`
- **Environment**: `EnvironmentSchema`, `EnvironmentListSchema`, `EnvironmentSpecSchema`, `EnvironmentStatusSchema`
- **Helper Functions**: `validateEnvironment()`, `safeValidateEnvironment()`, `validateEnvironmentList()`, `safeValidateEnvironmentList()`

For more examples and detailed guidance, see [TYPE_SAFETY.md](./TYPE_SAFETY.md).

## Type Safety Best Practices

For detailed guidance on type-safe CRD operations, runtime validation with Zod, and avoiding common pitfalls with `as any` casts, see [TYPE_SAFETY.md](./TYPE_SAFETY.md).

**Quick tip**: Always use the typed client classes (`createEnvironmentClient()`) instead of raw `CustomObjectsApi` calls for full type safety and IDE support.
