# Type-Safe CRD Operations

This document explains best practices for type-safe interactions with Kubernetes Custom Resources (CRDs) in the Catalyst platform.

## Problem

When working with Kubernetes CustomObjectsApi directly, you lose type safety:

```typescript
// ❌ BAD: No type safety, manual casting, hardcoded strings
const response = (await (customApi as any).listNamespacedCustomObject(
  "catalyst.catalyst.dev",
  "v1alpha1",
  "default",
  "environments",
)) as EnvironmentListResponse;
```

Issues with this approach:
- No compile-time type checking
- Hardcoded API group, version, plural strings
- Manual type casting (`as any`, `as EnvironmentListResponse`)
- No validation of response structure
- Easy to make typos in string literals
- No IDE autocomplete for API parameters

## Solution: Use Typed Client Classes

The `@catalyst/kubernetes-client` package provides typed client classes that wrap the K8s API with type safety.

### Using EnvironmentClient

```typescript
import { createEnvironmentClient } from "@catalyst/kubernetes-client";

// ✅ GOOD: Full type safety
const client = await createEnvironmentClient();
const envList = await client.list({ namespace: "default" });

// TypeScript knows the exact type
envList.items.forEach((env) => {
  console.log(env.metadata.name); // ✅ Type-checked
  console.log(env.spec.projectRef.name); // ✅ Type-checked
  console.log(env.status?.url); // ✅ Optional chaining is type-safe
});
```

### Benefits

1. **Type Safety**: All parameters and return types are fully typed
2. **Centralized Constants**: API group/version defined in one place (`ENVIRONMENT_API`)
3. **Error Handling**: Consistent error handling with `KubernetesError`
4. **IDE Support**: Full autocomplete and inline documentation
5. **Refactoring**: Safe to rename fields and update types

## Runtime Validation with Zod (Optional)

For additional runtime validation, you can use Zod schemas:

```typescript
import { z } from "zod";
import type { Environment } from "@catalyst/kubernetes-client";

// Define a Zod schema that matches the TypeScript type
const EnvironmentSchema = z.object({
  apiVersion: z.literal("catalyst.catalyst.dev/v1alpha1"),
  kind: z.literal("Environment"),
  metadata: z.object({
    name: z.string(),
    namespace: z.string(),
    uid: z.string().optional(),
    resourceVersion: z.string().optional(),
    creationTimestamp: z.string().optional(),
  }),
  spec: z.object({
    projectRef: z.object({
      name: z.string(),
    }),
    type: z.enum(["development", "deployment"]),
    deploymentMode: z.enum(["production", "development", "workspace"]).optional(),
    sources: z.array(z.object({
      name: z.string(),
      commitSha: z.string(),
      branch: z.string(),
      prNumber: z.number().optional(),
    })).optional(),
    config: z.object({
      envVars: z.array(z.object({
        name: z.string(),
        value: z.string(),
      })).optional(),
      image: z.string().optional(),
    }).optional(),
  }),
  status: z.object({
    phase: z.enum(["Pending", "Building", "Deploying", "Ready", "Failed"]).optional(),
    url: z.string().optional(),
    conditions: z.array(z.any()).optional(),
  }).optional(),
});

// Use in tests or when validating untrusted data
async function getValidatedEnvironment(name: string): Promise<Environment> {
  const client = await createEnvironmentClient();
  const env = await client.get(name, "default");
  
  if (!env) {
    throw new Error(`Environment ${name} not found`);
  }
  
  // Validate at runtime
  return EnvironmentSchema.parse(env);
}
```

## Migrating Existing Code

### Before (Type-Unsafe)

```typescript
const response = (await (customApi as any).listNamespacedCustomObject(
  "catalyst.catalyst.dev",
  "v1alpha1",
  "default",
  "environments",
)) as EnvironmentListResponse;

const testEnv = response.items.find(
  (env) => env.metadata.name === "test-env"
);
```

### After (Type-Safe)

```typescript
import { createEnvironmentClient } from "@catalyst/kubernetes-client";

const client = await createEnvironmentClient();
const envList = await client.list({ namespace: "default" });

const testEnv = envList.items.find(
  (env) => env.metadata.name === "test-env"
);
```

## Code Generation Approach

For projects that need to support multiple CRDs or want automated schema generation, consider:

### Option 1: Manual Type Definitions (Current)

- Keep TypeScript types in sync with Go structs manually
- Document sync requirement in comments
- Use type tests to catch drift

### Option 2: OpenAPI Schema Generation

Generate TypeScript types from CRD OpenAPI schemas:

```bash
# Generate OpenAPI schemas from CRDs
kubectl get crd environments.catalyst.catalyst.dev -o json \
  | jq '.spec.versions[0].schema.openAPIV3Schema' \
  > environment.schema.json

# Use openapi-typescript to generate types
npx openapi-typescript environment.schema.json \
  --output src/types/environment.generated.ts
```

### Option 3: Zod Schema from CRD

For projects requiring runtime validation, generate Zod schemas:

```typescript
// scripts/generate-zod-schemas.ts
import * as k8s from "@kubernetes/client-node";
import { jsonSchemaToZod } from "json-schema-to-zod";

async function generateZodSchemas() {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  const api = kc.makeApiClient(k8s.ApiextensionsV1Api);
  
  const crd = await api.readCustomResourceDefinition(
    "environments.catalyst.catalyst.dev"
  );
  
  const schema = crd.body.spec.versions[0].schema?.openAPIV3Schema;
  const zodCode = jsonSchemaToZod(schema);
  
  // Write to file
  await fs.writeFile("src/types/environment.zod.ts", zodCode);
}
```

## Best Practices

1. **Always use typed clients** instead of raw CustomObjectsApi
2. **Avoid `as any` casts** - they disable type checking
3. **Use const assertions** for API constants
4. **Document type sync requirements** in comments
5. **Add type tests** to catch API drift
6. **Consider runtime validation** for external data
7. **Leverage IDE features** - let TypeScript help you

## Testing

In tests, prefer the typed client over mocking the K8s API:

```typescript
import { describe, it, expect } from "vitest";
import { createEnvironmentClient } from "@catalyst/kubernetes-client";

describe("Environment operations", () => {
  it("should list environments", async () => {
    const client = await createEnvironmentClient();
    const list = await client.list({ namespace: "default" });
    
    expect(list.items).toBeInstanceOf(Array);
    expect(list.items.length).toBeGreaterThan(0);
    
    const env = list.items[0];
    expect(env.kind).toBe("Environment");
    expect(env.apiVersion).toBe("catalyst.catalyst.dev/v1alpha1");
    expect(env.spec.projectRef.name).toBeTruthy();
  });
});
```

## References

- [Kubernetes TypeScript Client](https://github.com/kubernetes-client/javascript)
- [Zod Documentation](https://zod.dev/)
- [OpenAPI TypeScript](https://github.com/drwpow/openapi-typescript)
