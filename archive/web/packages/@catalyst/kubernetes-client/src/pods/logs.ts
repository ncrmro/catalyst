/**
 * Pod log operations
 */

import type { KubeConfig } from "../config";
import { KubernetesError } from "../errors";
import { loadKubernetesClient } from "../loader";

/**
 * Options for fetching pod logs
 */
export interface GetLogsOptions {
  /** Container name (required if pod has multiple containers) */
  container?: string;
  /** Return logs from previous terminated container */
  previous?: boolean;
  /** Number of lines from the end to show */
  tailLines?: number;
  /** Only return logs since this time (RFC3339 or relative like "1h") */
  sinceTime?: string;
  /** Only return logs newer than this duration (e.g., "1h", "5m") */
  sinceSeconds?: number;
  /** Include timestamps in log output */
  timestamps?: boolean;
  /** Maximum bytes to return */
  limitBytes?: number;
}

/**
 * Get logs from a pod container
 */
export async function getPodLogs(
  kubeConfig: KubeConfig,
  namespace: string,
  podName: string,
  options?: GetLogsOptions,
): Promise<string> {
  const k8s = await loadKubernetesClient();
  const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

  try {
    const response = await api.readNamespacedPodLog({
      namespace,
      name: podName,
      container: options?.container,
      previous: options?.previous,
      tailLines: options?.tailLines,
      sinceSeconds: options?.sinceSeconds,
      timestamps: options?.timestamps,
      limitBytes: options?.limitBytes,
    });

    // Response is the log string directly
    return response || "";
  } catch (error) {
    throw KubernetesError.fromApiError(error);
  }
}

/**
 * Stream options for log streaming
 */
export interface StreamLogsOptions extends GetLogsOptions {
  /** Follow the log stream */
  follow?: boolean;
  /** Callback for each log chunk */
  onData: (data: string) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Callback when stream ends */
  onEnd?: () => void;
}

/**
 * Stream handle for managing log streams
 */
export interface LogStreamHandle {
  /** Stop the log stream */
  stop(): void;
  /** Check if stream is active */
  isActive(): boolean;
}

/**
 * Stream logs from a pod container
 *
 * Note: This creates a follow stream that continuously receives new logs.
 */
export async function streamPodLogs(
  kubeConfig: KubeConfig,
  namespace: string,
  podName: string,
  options: StreamLogsOptions,
): Promise<LogStreamHandle> {
  const k8s = await loadKubernetesClient();
  const log = new k8s.Log(kubeConfig.getRawConfig());
  const { Writable } = await import("stream");

  let active = true;
  let abortController: AbortController | null = null;

  // Create a writable stream to receive log data
  const outputStream = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      if (active) {
        const data = typeof chunk === "string" ? chunk : chunk.toString();
        options.onData(data);
      }
      callback();
    },
  });

  outputStream.on("error", (error: Error) => {
    if (active) {
      options.onError?.(error);
    }
  });

  outputStream.on("finish", () => {
    active = false;
    options.onEnd?.();
  });

  try {
    abortController = await log.log(
      namespace,
      podName,
      options.container || "",
      outputStream,
      {
        follow: options.follow ?? true,
        previous: options.previous,
        tailLines: options.tailLines,
        sinceSeconds: options.sinceSeconds,
        timestamps: options.timestamps,
        limitBytes: options.limitBytes,
      },
    );
  } catch (error) {
    active = false;
    throw KubernetesError.fromApiError(error);
  }

  return {
    stop: () => {
      active = false;
      if (abortController) {
        abortController.abort();
      }
      outputStream.end();
    },
    isActive: () => active,
  };
}
