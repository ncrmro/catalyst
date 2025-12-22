import { getClusterConfig, getCustomObjectsApi } from "./k8s-client";

const GROUP = "catalyst.catalyst.dev";
const VERSION = "v1alpha1";
const PLURAL = "environments";

export interface EnvironmentCRSpec {
  projectRef: {
    name: string;
  };
  type: string;
  source: {
    commitSha: string;
    branch: string;
    prNumber?: number;
  };
  config?: {
    envVars?: Array<{ name: string; value: string }>;
  };
}

export interface EnvironmentCR {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
  };
  spec: EnvironmentCRSpec;
  status?: {
    phase?: string;
    url?: string;
    conditions?: Array<{ type: string; status: string }>;
  };
}

export interface ProjectCRSpec {
  source: {
    repositoryUrl: string;
    branch: string;
  };
  deployment: {
    type: string;
    path: string;
    values?: Record<string, unknown>;
  };
  resources?: {
    defaultQuota?: {
      cpu?: string;
      memory?: string;
    };
  };
}

export async function createProjectCR(
  namespace: string,
  name: string,
  spec: ProjectCRSpec,
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
    if (err.response?.statusCode === 409) {
      // Already exists, try update (PATCH)?
      // For now return success
      return { success: true, isExisting: true };
    }
    console.error("Failed to create Project CR:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function createEnvironmentCR(
  namespace: string,
  name: string,
  spec: EnvironmentCRSpec,
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
    const err = error as {
      response?: { statusCode?: number };
      message?: string;
    };
    if (err.response?.statusCode === 409) {
      // Already exists, try update (PATCH)
      // For idempotency, we might want to patch spec
      // TODO: Implement patch if needed, or return success if it exists
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
    const err = error as { response?: { statusCode?: number } };
    if (err.response?.statusCode === 404) return null;
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
    const res = await client.listNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: PLURAL,
      labelSelector,
    });
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
    const err = error as {
      response?: { statusCode?: number };
      message?: string;
    };
    if (err.response?.statusCode === 404) {
      // Already deleted, consider success
      return { success: true };
    }
    console.error("Failed to delete Environment CR:", error);
    return { success: false, error: err.message || "Unknown error" };
  }
}
