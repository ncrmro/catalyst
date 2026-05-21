/**
 * Unified K8s API Handler
 *
 * Routes API requests to appropriate K8s operations.
 * Auth-agnostic - expects KubeConfig to be provided by caller.
 */

import type { KubeConfig } from "../config";
import { listPods } from "../pods/list";
import { getPodLogs, streamPodLogs } from "../pods/logs";
import { KubernetesError } from "../errors";
import type {
  K8sApiRequest,
  K8sApiResponse,
  PodsResponse,
  LogsResponse,
  LogStreamEvent,
} from "./types";

/**
 * Handle a K8s API request (non-streaming)
 *
 * Routes to the appropriate K8s operation based on resource type.
 */
export async function handleK8sApiRequest(
  kubeConfig: KubeConfig,
  request: K8sApiRequest,
): Promise<K8sApiResponse> {
  try {
    switch (request.resource) {
      case "pods":
        return await handlePodsRequest(kubeConfig, request);

      case "logs":
        return await handleLogsRequest(kubeConfig, request);

      case "logs:stream":
        // Streaming should use createLogStream instead
        return {
          success: false,
          error: "Use createLogStream for streaming logs",
        };

      case "status":
        return await handleStatusRequest(kubeConfig, request);

      default:
        return {
          success: false,
          error: `Unknown resource type: ${request.resource}`,
        };
    }
  } catch (error) {
    if (error instanceof KubernetesError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle pods list request
 */
async function handlePodsRequest(
  kubeConfig: KubeConfig,
  request: K8sApiRequest,
): Promise<K8sApiResponse<PodsResponse>> {
  const pods = await listPods(kubeConfig, request.namespace, {
    labelSelector: request.labelSelector,
  });

  return {
    success: true,
    data: { pods },
  };
}

/**
 * Handle logs request (one-shot, not streaming)
 *
 * If pod is specified, gets logs from that pod.
 * If no pod specified, aggregates logs from all pods with prefixes.
 */
async function handleLogsRequest(
  kubeConfig: KubeConfig,
  request: K8sApiRequest,
): Promise<K8sApiResponse<LogsResponse>> {
  const tailLines = request.tailLines ?? 100;

  if (request.pod) {
    // Single pod logs
    const logs = await getPodLogs(kubeConfig, request.namespace, request.pod, {
      container: request.container,
      tailLines,
      timestamps: request.timestamps,
    });

    return {
      success: true,
      data: {
        logs,
        podName: request.pod,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Aggregate logs from all pods
  const pods = await listPods(kubeConfig, request.namespace, {
    labelSelector: request.labelSelector,
  });

  if (pods.length === 0) {
    return {
      success: true,
      data: {
        logs: "",
        podName: "all",
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Fetch logs from all pods in parallel
  const logResults = await Promise.allSettled(
    pods.map(async (pod) => {
      try {
        const logs = await getPodLogs(kubeConfig, request.namespace, pod.name, {
          container: request.container,
          tailLines: Math.ceil(tailLines / pods.length), // Distribute tail lines
          timestamps: request.timestamps,
        });
        return { pod: pod.name, logs };
      } catch {
        return {
          pod: pod.name,
          logs: `[Error fetching logs from ${pod.name}]`,
        };
      }
    }),
  );

  // Aggregate logs with pod prefixes
  const aggregatedLogs = logResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{ pod: string; logs: string }> =>
        result.status === "fulfilled",
    )
    .map((result) => {
      const { pod, logs } = result.value;
      if (!logs.trim()) return "";
      // Prefix each line with pod name
      return logs
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `[${pod}] ${line}`)
        .join("\n");
    })
    .filter((logs) => logs.length > 0)
    .join("\n");

  return {
    success: true,
    data: {
      logs: aggregatedLogs,
      podName: "all",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Handle status request
 *
 * Returns deployment/pod status for the namespace.
 */
async function handleStatusRequest(
  kubeConfig: KubeConfig,
  request: K8sApiRequest,
): Promise<K8sApiResponse> {
  const pods = await listPods(kubeConfig, request.namespace, {
    labelSelector: request.labelSelector,
  });

  if (pods.length === 0) {
    return {
      success: true,
      data: {
        status: "pending",
        message: "No pods found",
      },
    };
  }

  // Determine overall status from pod statuses
  const statuses = pods.map((p) => p.status);

  if (statuses.every((s) => s === "Running")) {
    return {
      success: true,
      data: {
        status: "running",
        message: `${pods.length} pod(s) running`,
      },
    };
  }

  if (statuses.some((s) => s === "Failed")) {
    return {
      success: true,
      data: {
        status: "failed",
        message: "One or more pods failed",
      },
    };
  }

  if (statuses.some((s) => s === "Pending")) {
    return {
      success: true,
      data: {
        status: "deploying",
        message: "Pods are starting",
      },
    };
  }

  return {
    success: true,
    data: {
      status: "unknown",
      message: `Pod statuses: ${statuses.join(", ")}`,
    },
  };
}

/**
 * Options for creating a log stream
 */
export interface CreateLogStreamOptions {
  /** Callback for each log event */
  onData: (event: LogStreamEvent) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Callback when stream ends */
  onEnd?: () => void;
}

/**
 * Log stream handle for managing active streams
 */
export interface LogStreamController {
  /** Stop all log streams */
  stop(): void;
  /** Check if any streams are active */
  isActive(): boolean;
  /** List of pods being streamed */
  pods: string[];
}

/**
 * Create a log stream for SSE
 *
 * If pod is specified, streams from that pod.
 * If no pod specified, streams from all pods with pod context.
 */
export async function createLogStream(
  kubeConfig: KubeConfig,
  request: K8sApiRequest,
  options: CreateLogStreamOptions,
): Promise<LogStreamController> {
  const tailLines = request.tailLines ?? 50;

  if (request.pod) {
    // Single pod stream
    const handle = await streamPodLogs(
      kubeConfig,
      request.namespace,
      request.pod,
      {
        container: request.container,
        tailLines,
        timestamps: request.timestamps,
        follow: request.follow ?? true,
        onData: (data) => {
          options.onData({
            pod: request.pod!,
            container: request.container,
            log: data,
          });
        },
        onError: options.onError,
        onEnd: options.onEnd,
      },
    );

    return {
      stop: () => handle.stop(),
      isActive: () => handle.isActive(),
      pods: [request.pod],
    };
  }

  // Multi-pod stream
  const pods = await listPods(kubeConfig, request.namespace, {
    labelSelector: request.labelSelector,
  });

  if (pods.length === 0) {
    options.onEnd?.();
    return {
      stop: () => {},
      isActive: () => false,
      pods: [],
    };
  }

  const handles: Array<{
    pod: string;
    handle: Awaited<ReturnType<typeof streamPodLogs>>;
  }> = [];
  let activeCount = pods.length;

  // Start streams for all pods
  await Promise.all(
    pods.map(async (pod) => {
      try {
        const handle = await streamPodLogs(
          kubeConfig,
          request.namespace,
          pod.name,
          {
            container: request.container,
            tailLines: Math.ceil(tailLines / pods.length),
            timestamps: request.timestamps,
            follow: request.follow ?? true,
            onData: (data) => {
              options.onData({
                pod: pod.name,
                container: request.container,
                log: data,
              });
            },
            onError: (error) => {
              options.onError?.(error);
            },
            onEnd: () => {
              activeCount--;
              if (activeCount === 0) {
                options.onEnd?.();
              }
            },
          },
        );
        handles.push({ pod: pod.name, handle });
      } catch (error) {
        activeCount--;
        options.onError?.(
          error instanceof Error
            ? error
            : new Error(`Failed to stream ${pod.name}`),
        );
      }
    }),
  );

  return {
    stop: () => {
      handles.forEach(({ handle }) => handle.stop());
    },
    isActive: () => handles.some(({ handle }) => handle.isActive()),
    pods: handles.map(({ pod }) => pod),
  };
}
