import { getClusterConfig, getCustomObjectsApi } from "./k8s-client";
import { EnvironmentCR, EnvironmentCRSpec, ProjectCRSpec } from "@/types/crd";

export type { EnvironmentCR, EnvironmentCRSpec, ProjectCRSpec };

const GROUP = "catalyst.catalyst.dev";
const VERSION = "v1alpha1";
const PLURAL = "environments";

export async function createProjectCR(
  namespace: string,
  name: string,
  spec: ProjectCRSpec,
  labels?: Record<string, string>,
) {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  const body = {
    apiVersion: `${GROUP}/${VERSION}`,
    kind: "Project",
    metadata: {
      name,
      namespace,
      labels,
    },
    spec,
  };

  try {
    await client.createNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: "projects",
      body,
    });
    return { success: true };
  } catch (error: unknown) {
    const err = error as {
      response?: { statusCode?: number };
      message?: string;
    };

    // Check for 409 Conflict (already exists) using comprehensive helper
    if (isKubeConflict(error)) {
      return { success: true, isExisting: true };
    }

    console.error("Failed to create Project CR:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function updateProjectCR(
  namespace: string,
  name: string,
  spec: ProjectCRSpec,
): Promise<{ success: boolean; error?: string }> {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  try {
    // Fetch existing to preserve metadata
    const existing = await client.getNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: "projects",
      name,
    });

    const body = {
      ...existing,
      spec,
    };

    await client.replaceNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: "projects",
      name,
      body,
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Failed to update Project CR:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function createEnvironmentCR(
  namespace: string,
  name: string,
  spec: EnvironmentCRSpec,
  labels?: Record<string, string>,
) {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  const body = {
    apiVersion: `${GROUP}/${VERSION}`,
    kind: "Environment",
    metadata: {
      name,
      namespace,
      labels,
    },
    spec,
  };

  try {
    // Attempt create
    // Note: Custom Resources are namespaced in our implementation
    // We are creating the CR in the "catalyst-system" or "default" namespace
    // as defined in the operator setup. The *target* namespace is managed by the operator.
    // However, the CR itself lives somewhere.
    // Let's assume CRs live in "default" for now or the same namespace passed in?
    // Wait, the operator watches all namespaces?
    // The previous implementation used "env-<project>-<id>" as the *target* namespace.
    // The CR needs to exist in a namespace the user has access to or a central one.
    // Let's use the `namespace` param as the namespace for the CR.

    await client.createNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: PLURAL,
      body,
    });
    return { success: true };
  } catch (error: unknown) {
    // The K8s client can throw errors with different structures:
    // - HttpError: { statusCode: number, body: string, message: string }
    // - Or: { response: { statusCode: number } }
    const err = error as {
      statusCode?: number;
      response?: { statusCode?: number };
      body?: string;
      message?: string;
    };

    const statusCode = err.statusCode ?? err.response?.statusCode;

    // Check for 409 Conflict (already exists)
    if (statusCode === 409) {
      // Already exists - this is fine for idempotency
      // Return success with isExisting flag
      return { success: true, isExisting: true };
    }

    // Also check body for AlreadyExists reason (fallback)
    if (err.body?.includes('"reason":"AlreadyExists"')) {
      return { success: true, isExisting: true };
    }

    // Check message content for "HTTP-Code: 409" pattern
    if (
      typeof err.message === "string" &&
      err.message.includes("HTTP-Code: 409")
    ) {
      return { success: true, isExisting: true };
    }

    console.error("Failed to create Environment CR:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function getEnvironmentCR(
  namespace: string,
  name: string,
): Promise<EnvironmentCR | null> {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  try {
    const res = await client.getNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: PLURAL,
      name,
    });
    // Response is returned directly, not wrapped in { body: ... }
    return res as EnvironmentCR;
  } catch (error: unknown) {
    if (isKubeNotFound(error)) return null;
    throw error;
  }
}

export async function listEnvironmentCRs(
  namespace: string,
  labelSelector?: string,
): Promise<EnvironmentCR[]> {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  try {
    // Add timeout wrapper to prevent hanging SSR in CI
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Kubernetes API timeout")), 5000),
    );

    const apiPromise = client.listNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: PLURAL,
      labelSelector,
    });

    const res = await Promise.race([apiPromise, timeoutPromise]);
    // Response is returned directly, not wrapped in { body: ... }
    const list = res as { items?: EnvironmentCR[] };
    return list.items || [];
  } catch (error: unknown) {
    console.error("Failed to list Environment CRs:", error);
    return [];
  }
}

export async function deleteEnvironmentCR(
  namespace: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  try {
    await client.deleteNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: PLURAL,
      name,
    });
    return { success: true };
  } catch (error: unknown) {
    if (isKubeNotFound(error)) {
      // Already deleted, consider success
      return { success: true };
    }
    const err = error as { message?: string };
    console.error("Failed to delete Environment CR:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Add or update annotations on an Environment CR
 * Used to link the Environment CR to the database record via environmentId
 */
export async function patchEnvironmentCRAnnotations(
  namespace: string,
  name: string,
  annotations: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  // Import KubernetesObjectApi and PatchStrategy for proper merge patch
  const { KubernetesObjectApi, PatchStrategy } = await import(
    "@kubernetes/client-node"
  );
  // Import KubeConfig type separately for type assertion
  type NativeKubeConfig = import("@kubernetes/client-node").KubeConfig;

  // The wrapper KubeConfig has the same interface as the native one
  const k8sApi = KubernetesObjectApi.makeApiClient(
    config as unknown as NativeKubeConfig,
  );

  // Create a partial object with just the metadata to patch
  const patch = {
    apiVersion: `${GROUP}/${VERSION}`,
    kind: "Environment",
    metadata: {
      name,
      namespace,
      annotations,
    },
  };

  try {
    await k8sApi.patch(
      patch,
      undefined, // pretty
      undefined, // dryRun
      undefined, // fieldManager
      undefined, // force
      PatchStrategy.MergePatch, // Use merge patch strategy
    );
    return { success: true };
  } catch (error: unknown) {
    if (isKubeNotFound(error)) {
      return { success: false, error: "Environment CR not found" };
    }
    const err = error as { message?: string };
    console.error("Failed to patch Environment CR annotations:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

interface KubernetesError {
  response?: {
    statusCode?: number;
  };
  statusCode?: number;
  body?: string | { code?: number };
  message?: string;
}

function isKubeNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as KubernetesError;

  // Check standard response.statusCode
  if (err.response?.statusCode === 404) return true;

  // Check statusCode property directly (some clients)
  if (err.statusCode === 404) return true;

  // Check body structure if response is missing but body is present
  if (err.body) {
    if (typeof err.body === "string") {
      try {
        const body = JSON.parse(err.body);
        if (body.code === 404) return true;
      } catch {
        /* ignore */
      }
    } else if (typeof err.body === "object" && err.body.code === 404) {
      return true;
    }
  }

  // Check message content as last resort for "HTTP-Code: 404"
  if (typeof err.message === "string") {
    if (err.message.includes("HTTP-Code: 404")) return true;
    if (err.message.includes("Not Found") && err.message.includes("404"))
      return true;
  }

  return false;
}

/**
 * Check if error is a Kubernetes 409 Conflict/AlreadyExists error
 * Checks multiple error structures to handle different client implementations
 */
function isKubeConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as KubernetesError;

  // Check standard response.statusCode
  if (err.response?.statusCode === 409) return true;

  // Check statusCode property directly (some clients)
  if (err.statusCode === 409) return true;

  // Check direct code property (the actual structure in some errors)
  if ("code" in err && err.code === 409) return true;

  // Check body structure if response is missing but body is present
  if (err.body) {
    if (typeof err.body === "string") {
      try {
        const body = JSON.parse(err.body);
        if (body.code === 409) return true;
        if (body.reason === "AlreadyExists") return true;
      } catch {
        /* ignore parse errors */
      }
    } else if (typeof err.body === "object") {
      const body = err.body as Record<string, unknown>;
      if (body.code === 409) return true;
      if (body.reason === "AlreadyExists") return true;
    }
  }

  // Check message content patterns
  if (typeof err.message === "string") {
    if (err.message.includes("HTTP-Code: 409")) return true;
    if (err.message.includes("already exists")) return true;
    if (err.message.includes("AlreadyExists")) return true;
  }

  return false;
}
