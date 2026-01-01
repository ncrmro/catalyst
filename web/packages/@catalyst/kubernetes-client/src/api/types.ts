/**
 * Unified K8s API Types
 *
 * Request/Response types for the unified K8s API handler.
 */

import type { PodInfo } from "../pods/list";
import type { LogStreamHandle } from "../pods/logs";

/**
 * Supported resource types for the unified API
 */
export type K8sResourceType = "pods" | "logs" | "logs:stream" | "status";

/**
 * Request parameters for K8s API operations
 */
export interface K8sApiRequest {
  /** Resource type to query */
  resource: K8sResourceType;
  /** Kubernetes namespace */
  namespace: string;
  /** Pod name (required for single-pod logs, optional for multi-pod) */
  pod?: string;
  /** Container name (optional, for multi-container pods) */
  container?: string;
  /** Number of log lines from the end (default: 100) */
  tailLines?: number;
  /** Follow log stream (for logs:stream) */
  follow?: boolean;
  /** Include timestamps in logs */
  timestamps?: boolean;
  /** Label selector for filtering pods */
  labelSelector?: string;
}

/**
 * Response for pods resource
 */
export interface PodsResponse {
  pods: PodInfo[];
}

/**
 * Response for logs resource
 */
export interface LogsResponse {
  logs: string;
  podName: string | "all";
  timestamp: string;
}

/**
 * Response for status resource
 */
export interface StatusResponse {
  status: "pending" | "deploying" | "running" | "failed" | "unknown";
  phase?: string;
  url?: string;
  message?: string;
}

/**
 * Unified API response wrapper
 */
export interface K8sApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Log stream event for SSE
 */
export interface LogStreamEvent {
  pod: string;
  container?: string;
  log: string;
  timestamp?: string;
}

/**
 * Extended log stream handle with pod context
 */
export interface MultiPodLogStreamHandle extends LogStreamHandle {
  /** Pods being streamed */
  pods: string[];
}

/**
 * Parse K8s API request from URL search params
 */
export function parseK8sApiRequest(
  searchParams: URLSearchParams,
): K8sApiRequest | { error: string } {
  const resource = searchParams.get("resource") as K8sResourceType | null;
  const namespace = searchParams.get("namespace");

  if (!resource) {
    return { error: "Missing required parameter: resource" };
  }

  if (!namespace) {
    return { error: "Missing required parameter: namespace" };
  }

  const validResources: K8sResourceType[] = [
    "pods",
    "logs",
    "logs:stream",
    "status",
  ];
  if (!validResources.includes(resource)) {
    return { error: `Invalid resource type: ${resource}` };
  }

  return {
    resource,
    namespace,
    pod: searchParams.get("pod") || undefined,
    container: searchParams.get("container") || undefined,
    tailLines: searchParams.has("tailLines")
      ? parseInt(searchParams.get("tailLines")!, 10)
      : undefined,
    follow: searchParams.get("follow") === "true",
    timestamps: searchParams.get("timestamps") === "true",
    labelSelector: searchParams.get("labelSelector") || undefined,
  };
}
