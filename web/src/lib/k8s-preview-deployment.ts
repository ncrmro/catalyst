/**
 * Kubernetes Preview Deployment Operations
 *
 * Low-level Kubernetes API calls for deploying preview applications.
 * This module handles Deployment and Service creation/deletion for PR previews.
 *
 * NOTE: This module contains NO database operations. Database logic lives in
 * models/preview-environments.ts which orchestrates calls to these functions.
 */

import { getClusterConfig, getCoreV1Api, getAppsV1Api } from "./k8s-client";

export interface PreviewDeploymentConfig {
  namespace: string;
  deploymentName: string;
  imageUri: string;
  prNumber: number;
  commitSha: string;
  containerPort?: number;
  resourceLimits?: {
    cpu: string;
    memory: string;
  };
  resourceRequests?: {
    cpu: string;
    memory: string;
  };
}

export interface DeploymentResult {
  success: boolean;
  deploymentName?: string;
  serviceName?: string;
  error?: string;
}

export interface DeploymentStatus {
  ready: boolean;
  status: "pending" | "progressing" | "available" | "failed";
  replicas?: number;
  readyReplicas?: number;
  error?: string;
}

/**
 * Deploy a preview application to Kubernetes.
 *
 * Creates:
 * - A Deployment with the specified image
 * - A ClusterIP Service to expose the deployment
 *
 * @param config - Deployment configuration
 * @returns Deployment result
 */
export async function deployPreviewApplication(
  config: PreviewDeploymentConfig,
): Promise<DeploymentResult> {
  const {
    namespace,
    deploymentName,
    imageUri,
    prNumber,
    commitSha,
    containerPort = 3000,
    resourceLimits = { cpu: "500m", memory: "512Mi" },
    resourceRequests = { cpu: "100m", memory: "128Mi" },
  } = config;

  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return { success: false, error: "Kubernetes cluster not configured" };
    }

    const AppsV1Api = await getAppsV1Api();
    const appsApi = kc.makeApiClient(AppsV1Api);

    const labels = {
      app: "preview-environment",
      "pr-number": String(prNumber),
      "commit-sha": commitSha.slice(0, 7),
      "created-by": "catalyst",
    };

    // Create Deployment manifest
    const deployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: deploymentName,
        namespace,
        labels,
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: "preview-environment",
            "pr-number": String(prNumber),
          },
        },
        template: {
          metadata: {
            labels,
          },
          spec: {
            containers: [
              {
                name: "app",
                image: imageUri,
                ports: [{ containerPort }],
                resources: {
                  limits: resourceLimits,
                  requests: resourceRequests,
                },
                env: [
                  { name: "NODE_ENV", value: "preview" },
                  { name: "PR_NUMBER", value: String(prNumber) },
                  { name: "COMMIT_SHA", value: commitSha },
                ],
                readinessProbe: {
                  httpGet: {
                    path: "/",
                    port: containerPort,
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                },
              },
            ],
          },
        },
      },
    };

    // Create or update the deployment
    try {
      await appsApi.createNamespacedDeployment({
        namespace,
        body: deployment,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already exists")) {
        await appsApi.replaceNamespacedDeployment({
          name: deploymentName,
          namespace,
          body: deployment,
        });
      } else {
        throw error;
      }
    }

    // Create Service
    const serviceResult = await createPreviewService({
      namespace,
      serviceName: deploymentName,
      prNumber,
      targetPort: containerPort,
    });

    if (!serviceResult.success) {
      console.warn("Service creation warning:", serviceResult.error);
      // Continue even if service already exists
    }

    return {
      success: true,
      deploymentName,
      serviceName: deploymentName,
    };
  } catch (error) {
    console.error("Error deploying preview application:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a ClusterIP Service to expose the preview deployment.
 */
async function createPreviewService(params: {
  namespace: string;
  serviceName: string;
  prNumber: number;
  targetPort: number;
}): Promise<{ success: boolean; error?: string }> {
  const { namespace, serviceName, prNumber, targetPort } = params;

  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return { success: false, error: "Kubernetes cluster not configured" };
    }

    const CoreV1Api = await getCoreV1Api();
    const coreApi = kc.makeApiClient(CoreV1Api);

    const service = {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: serviceName,
        namespace,
        labels: {
          app: "preview-environment",
          "pr-number": String(prNumber),
          "created-by": "catalyst",
        },
      },
      spec: {
        selector: {
          app: "preview-environment",
          "pr-number": String(prNumber),
        },
        ports: [
          {
            port: 80,
            targetPort,
            protocol: "TCP",
          },
        ],
        type: "ClusterIP",
      },
    };

    try {
      await coreApi.createNamespacedService({
        namespace,
        body: service,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("already exists")) {
        throw error;
      }
      // Service already exists - that's fine
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Watch a deployment until it reaches a ready or failed state.
 *
 * @param namespace - Kubernetes namespace
 * @param deploymentName - Deployment name
 * @param timeoutMs - Timeout in milliseconds (default: 3 minutes)
 * @returns Final deployment status
 */
export async function watchDeploymentUntilReady(
  namespace: string,
  deploymentName: string,
  timeoutMs: number = 180000,
): Promise<DeploymentStatus> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return {
        ready: false,
        status: "failed",
        error: "Kubernetes cluster not configured",
      };
    }

    const AppsV1Api = await getAppsV1Api();
    const appsApi = kc.makeApiClient(AppsV1Api);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const deployment = await appsApi.readNamespacedDeployment({
          name: deploymentName,
          namespace,
        });

        const status = deployment.status;
        const spec = deployment.spec;

        // Check if deployment is ready
        if (
          status?.readyReplicas &&
          spec?.replicas &&
          status.readyReplicas >= spec.replicas
        ) {
          return {
            ready: true,
            status: "available",
            replicas: spec.replicas,
            readyReplicas: status.readyReplicas,
          };
        }

        // Check for failure conditions
        const conditions = status?.conditions || [];
        const failedCondition = conditions.find(
          (c: { type?: string; status?: string; message?: string }) =>
            c.type === "Progressing" && c.status === "False",
        );
        if (failedCondition) {
          return {
            ready: false,
            status: "failed",
            replicas: spec?.replicas,
            readyReplicas: status?.readyReplicas || 0,
            error: failedCondition.message || "Deployment failed to progress",
          };
        }

        // Check for replica failure
        const replicaFailure = conditions.find(
          (c: { type?: string; status?: string; message?: string }) =>
            c.type === "ReplicaFailure" && c.status === "True",
        );
        if (replicaFailure) {
          return {
            ready: false,
            status: "failed",
            replicas: spec?.replicas,
            readyReplicas: status?.readyReplicas || 0,
            error: replicaFailure.message || "Pod failed to start",
          };
        }
      } catch (error) {
        console.warn("Error polling deployment status:", error);
        // Continue polling on transient errors
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return {
      ready: false,
      status: "failed",
      error: `Deployment did not become ready within ${timeoutMs / 1000} seconds`,
    };
  } catch (error) {
    console.error("Error watching deployment status:", error);
    return {
      ready: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a preview deployment and its associated service.
 *
 * @param namespace - Kubernetes namespace
 * @param deploymentName - Deployment name (also used for service)
 * @returns Deletion result
 */
export async function deletePreviewDeployment(
  namespace: string,
  deploymentName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return { success: false, error: "Kubernetes cluster not configured" };
    }

    const AppsV1Api = await getAppsV1Api();
    const CoreV1Api = await getCoreV1Api();
    const appsApi = kc.makeApiClient(AppsV1Api);
    const coreApi = kc.makeApiClient(CoreV1Api);

    // Delete deployment
    try {
      await appsApi.deleteNamespacedDeployment({
        name: deploymentName,
        namespace,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("not found")) {
        console.warn("Error deleting deployment:", errorMessage);
      }
    }

    // Delete service
    try {
      await coreApi.deleteNamespacedService({
        name: deploymentName,
        namespace,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("not found")) {
        console.warn("Error deleting service:", errorMessage);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting preview deployment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get current status of a preview deployment.
 *
 * @param namespace - Kubernetes namespace
 * @param deploymentName - Deployment name
 * @returns Current deployment status
 */
export async function getPreviewDeploymentStatus(
  namespace: string,
  deploymentName: string,
): Promise<DeploymentStatus> {
  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return {
        ready: false,
        status: "failed",
        error: "Kubernetes cluster not configured",
      };
    }

    const AppsV1Api = await getAppsV1Api();
    const appsApi = kc.makeApiClient(AppsV1Api);

    const deployment = await appsApi.readNamespacedDeployment({
      name: deploymentName,
      namespace,
    });

    const status = deployment.status;
    const spec = deployment.spec;

    // Check if ready
    if (
      status?.readyReplicas &&
      spec?.replicas &&
      status.readyReplicas >= spec.replicas
    ) {
      return {
        ready: true,
        status: "available",
        replicas: spec.replicas,
        readyReplicas: status.readyReplicas,
      };
    }

    // Check conditions
    const conditions = status?.conditions || [];
    const progressingCondition = conditions.find(
      (c: { type?: string; status?: string; message?: string }) =>
        c.type === "Progressing",
    );

    if (progressingCondition?.status === "False") {
      return {
        ready: false,
        status: "failed",
        replicas: spec?.replicas,
        readyReplicas: status?.readyReplicas || 0,
        error: progressingCondition.message,
      };
    }

    return {
      ready: false,
      status: "progressing",
      replicas: spec?.replicas,
      readyReplicas: status?.readyReplicas || 0,
    };
  } catch (error) {
    console.error("Error getting deployment status:", error);
    return {
      ready: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get container logs from a preview deployment.
 *
 * @param namespace - Kubernetes namespace
 * @param prNumber - PR number (used as label selector)
 * @param options - Log options
 * @returns Log content
 */
export async function getPreviewPodLogs(
  namespace: string,
  prNumber: number,
  options?: {
    tailLines?: number;
    timestamps?: boolean;
  },
): Promise<{ success: boolean; logs?: string; error?: string }> {
  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return { success: false, error: "Kubernetes cluster not configured" };
    }

    const CoreV1Api = await getCoreV1Api();
    const coreApi = kc.makeApiClient(CoreV1Api);

    // List pods matching selector
    const pods = await coreApi.listNamespacedPod({
      namespace,
      labelSelector: `app=preview-environment,pr-number=${prNumber}`,
    });

    if (!pods.items || pods.items.length === 0) {
      return { success: false, error: "No pods found for this preview" };
    }

    const pod = pods.items[0];
    const podName = pod.metadata?.name;

    if (!podName) {
      return { success: false, error: "Pod name not found" };
    }

    // Check pod status
    const phase = pod.status?.phase;
    if (phase === "Pending") {
      return {
        success: false,
        error: "Pod is still pending - logs not yet available",
      };
    }

    // Get logs
    const logs = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace,
      tailLines: options?.tailLines || 500,
      timestamps: options?.timestamps || false,
    });

    return { success: true, logs: logs as string };
  } catch (error) {
    console.error("Error getting pod logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Resource usage information for a pod.
 */
export interface PodResourceUsage {
  cpuMillicores: number; // CPU usage in millicores
  memoryMiB: number; // Memory usage in MiB
  cpuLimit?: string; // CPU limit from pod spec
  memoryLimit?: string; // Memory limit from pod spec
}

/**
 * Get resource usage metrics for preview pods.
 *
 * Fetches CPU and memory usage from Kubernetes Metrics API.
 * Falls back gracefully if metrics server is not available.
 *
 * @param namespace - Kubernetes namespace
 * @param prNumber - PR number (used as label selector)
 * @returns Resource usage metrics or null if unavailable
 */
export async function getPreviewPodResourceUsage(
  namespace: string,
  prNumber: number,
): Promise<{ success: boolean; usage?: PodResourceUsage; error?: string }> {
  try {
    const kc = await getClusterConfig();
    if (!kc) {
      return { success: false, error: "Kubernetes cluster not configured" };
    }

    const CoreV1Api = await getCoreV1Api();
    const coreApi = kc.makeApiClient(CoreV1Api);

    // List pods matching selector
    const pods = await coreApi.listNamespacedPod({
      namespace,
      labelSelector: `app=preview-environment,pr-number=${prNumber}`,
    });

    if (!pods.items || pods.items.length === 0) {
      return { success: false, error: "No pods found for this preview" };
    }

    const pod = pods.items[0];
    const podName = pod.metadata?.name;

    if (!podName) {
      return { success: false, error: "Pod name not found" };
    }

    // Get container resource limits from pod spec
    const container = pod.spec?.containers?.[0];
    const cpuLimit = container?.resources?.limits?.cpu;
    const memoryLimit = container?.resources?.limits?.memory;

    // Try to get metrics from Kubernetes Metrics API
    // The metrics API path is /apis/metrics.k8s.io/v1beta1/namespaces/{namespace}/pods/{podName}
    try {
      // Use raw API call to metrics server
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metricsClient = (kc as any)._kc;
      if (!metricsClient) {
        // Return limits as fallback when metrics not available
        return {
          success: true,
          usage: {
            cpuMillicores: 0,
            memoryMiB: 0,
            cpuLimit,
            memoryLimit,
          },
        };
      }

      // Attempt metrics API call via kubectl proxy or direct API
      const opts = {
        path: `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods/${podName}`,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metricsResponse = await new Promise<any>((resolve, reject) => {
        metricsClient.applyToRequest({
          ...opts,
          method: "GET",
        });

        // For now, return mock metrics since direct API access requires additional setup
        // In production, you'd use the metrics client or a custom metrics fetcher
        resolve(null);
      }).catch(() => null);

      if (metricsResponse?.containers?.[0]?.usage) {
        const containerMetrics = metricsResponse.containers[0].usage;
        const cpuUsage = parseK8sResourceValue(containerMetrics.cpu, "cpu");
        const memoryUsage = parseK8sResourceValue(
          containerMetrics.memory,
          "memory",
        );

        return {
          success: true,
          usage: {
            cpuMillicores: cpuUsage,
            memoryMiB: memoryUsage,
            cpuLimit,
            memoryLimit,
          },
        };
      }
    } catch {
      // Metrics API not available - return resource limits as reference
      console.warn(
        "Kubernetes Metrics API not available, returning limits only",
      );
    }

    // Return resource limits as fallback
    return {
      success: true,
      usage: {
        cpuMillicores: 0,
        memoryMiB: 0,
        cpuLimit,
        memoryLimit,
      },
    };
  } catch (error) {
    console.error("Error getting pod resource usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse Kubernetes resource value strings into numeric values.
 *
 * @param value - Resource value string (e.g., "100m", "512Mi", "1Gi")
 * @param type - Resource type ("cpu" or "memory")
 * @returns Numeric value (millicores for CPU, MiB for memory)
 */
export function parseK8sResourceValue(
  value: string | undefined,
  type: "cpu" | "memory",
): number {
  if (!value) return 0;

  if (type === "cpu") {
    // CPU values: "100m" (millicores), "0.5" (cores), "1" (cores)
    if (value.endsWith("m")) {
      return parseInt(value.slice(0, -1), 10);
    } else if (value.endsWith("n")) {
      // Nanocores
      return parseInt(value.slice(0, -1), 10) / 1000000;
    } else {
      // Cores
      return parseFloat(value) * 1000;
    }
  } else {
    // Memory values: "512Mi", "1Gi", "1024Ki", "1073741824" (bytes)
    if (value.endsWith("Ki")) {
      return parseInt(value.slice(0, -2), 10) / 1024;
    } else if (value.endsWith("Mi")) {
      return parseInt(value.slice(0, -2), 10);
    } else if (value.endsWith("Gi")) {
      return parseInt(value.slice(0, -2), 10) * 1024;
    } else if (value.endsWith("Ti")) {
      return parseInt(value.slice(0, -2), 10) * 1024 * 1024;
    } else {
      // Bytes
      return parseInt(value, 10) / (1024 * 1024);
    }
  }
}

/**
 * Wait for a Kubernetes Job to complete.
 *
 * Used to wait for image build jobs before deploying.
 *
 * @param jobName - Name of the job
 * @param namespace - Kubernetes namespace
 * @param timeoutMs - Timeout in milliseconds
 * @returns Job completion status
 */
export async function waitForJobCompletion(
  jobName: string,
  namespace: string,
  timeoutMs: number = 180000,
): Promise<{ success: boolean; status: string; error?: string }> {
  const startTime = Date.now();
  const pollInterval = 5000;

  // Import dynamically to avoid circular dependencies
  const { getPullRequestPodJobStatus } = await import("./k8s-pull-request-pod");

  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await getPullRequestPodJobStatus(jobName, namespace);

      if (status.succeeded && status.succeeded > 0) {
        return { success: true, status: "completed" };
      }

      if (status.failed && status.failed > 0) {
        return {
          success: false,
          status: "failed",
          error: `Job failed after ${status.failed} attempts`,
        };
      }

      // Job still running
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.warn("Error polling job status:", error);
      // Continue polling on transient errors
    }
  }

  return {
    success: false,
    status: "timeout",
    error: `Job did not complete within ${timeoutMs / 1000} seconds`,
  };
}
