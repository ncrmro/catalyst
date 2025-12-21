// Kubernetes namespace management functions
import { getCoreV1Api, getClusterConfig } from "./k8s-client";

export interface NamespaceLabels {
  "catalyst/team": string;
  "catalyst/project": string;
  "catalyst/environment": string;
  [key: string]: string;
}

export interface CreateNamespaceOptions {
  team: string;
  project: string;
  environment: string;
}

export interface NamespaceResult {
  name: string;
  labels: NamespaceLabels;
  created: boolean;
}

/**
 * Generate namespace name from team, project, and environment
 * Format: team-project-environment
 */
export function generateNamespaceName(
  team: string,
  project: string,
  environment: string,
): string {
  // Sanitize inputs to be valid Kubernetes names (lowercase, alphanumeric, hyphens)
  const sanitize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  return `${sanitize(team)}-${sanitize(project)}-${sanitize(environment)}`;
}

/**
 * Create Kubernetes namespace with catalyst labels
 */
export async function createProjectNamespace(
  options: CreateNamespaceOptions,
  clusterName?: string,
): Promise<NamespaceResult> {
  const { team, project, environment } = options;

  // Initialize Kubernetes client using the proper cluster configuration
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const CoreV1Api = await getCoreV1Api();
  const k8sApi = kc.makeApiClient(CoreV1Api);

  const namespaceName = generateNamespaceName(team, project, environment);

  const labels: NamespaceLabels = {
    "catalyst/team": team,
    "catalyst/project": project,
    "catalyst/environment": environment,
  };

  // Define the namespace
  const namespace = {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: {
      name: namespaceName,
      labels,
    },
  };

  try {
    // Create the namespace
    await k8sApi.createNamespace({
      body: namespace,
    });

    console.log(`Namespace created: ${namespaceName}`, {
      team,
      project,
      environment,
    });

    return {
      name: namespaceName,
      labels,
      created: true,
    };
  } catch (error) {
    // Check if namespace already exists (HTTP 409 Conflict)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 409
    ) {
      console.log(`Namespace already exists: ${namespaceName}`);
      return {
        name: namespaceName,
        labels,
        created: false,
      };
    }
    throw error;
  }
}

/**
 * Check if namespace exists
 */
export async function namespaceExists(
  namespaceName: string,
  clusterName?: string,
): Promise<boolean> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(
        `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
      );
    }

    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);

    await k8sApi.readNamespace({ name: namespaceName });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return false;
    }
    throw error;
  }
}

/**
 * List all namespaces for a specific cluster
 */
export async function listNamespaces(
  clusterName?: string,
): Promise<
  {
    name: string;
    labels?: { [key: string]: string };
    creationTimestamp?: string;
  }[]
> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(
        `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
      );
    }

    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);

    const response = await k8sApi.listNamespace();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.items.map((ns: any) => ({
      name: ns.metadata?.name || "",
      labels: ns.metadata?.labels || {},
      creationTimestamp: ns.metadata?.creationTimestamp,
    }));
  } catch (error) {
    console.error("Error listing namespaces:", error);
    throw error;
  }
}

/**
 * Delete namespace (for cleanup in tests)
 */
export async function deleteNamespace(
  namespaceName: string,
  clusterName?: string,
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const CoreV1Api = await getCoreV1Api();
  const k8sApi = kc.makeApiClient(CoreV1Api);

  await k8sApi.deleteNamespace({ name: namespaceName });
}
