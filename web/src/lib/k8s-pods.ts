// Kubernetes pod management functions
import { getCoreV1Api, getClusterConfig } from "./k8s-client";

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  labels?: { [key: string]: string };
  creationTimestamp?: string;
  containers: ContainerInfo[];
  nodeName?: string;
  restartCount: number;
}

export interface ContainerInfo {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
}

/**
 * List all pods in a specific namespace for a specific cluster
 */
export async function listPodsInNamespace(
  namespaceName: string,
  clusterName?: string,
): Promise<PodInfo[]> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      throw new Error(
        `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
      );
    }

    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);

    const response = await k8sApi.listNamespacedPod({
      namespace: namespaceName,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.items.map((pod: any) => {
      const containers: ContainerInfo[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pod.spec?.containers?.map((container: any) => {
          const containerStatus = pod.status?.containerStatuses?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (status: any) => status.name === container.name,
          );
          return {
            name: container.name,
            image: container.image,
            ready: containerStatus?.ready ?? false,
            restartCount: containerStatus?.restartCount ?? 0,
          };
        }) || [];

      const totalRestartCount = containers.reduce(
        (sum, container) => sum + container.restartCount,
        0,
      );

      return {
        name: pod.metadata?.name || "",
        namespace: pod.metadata?.namespace || namespaceName,
        status: pod.status?.phase || "Unknown",
        labels: pod.metadata?.labels || {},
        creationTimestamp: pod.metadata?.creationTimestamp,
        containers,
        nodeName: pod.spec?.nodeName,
        restartCount: totalRestartCount,
      };
    });
  } catch (error) {
    console.error("Error listing pods:", error);
    throw error;
  }
}
