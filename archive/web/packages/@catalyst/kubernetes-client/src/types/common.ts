/**
 * Common Kubernetes types used across the package
 */

/**
 * Standard Kubernetes object metadata
 */
export interface ObjectMeta {
  name: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  finalizers?: string[];
  ownerReferences?: OwnerReference[];
}

/**
 * Owner reference for garbage collection
 */
export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

/**
 * Standard Kubernetes condition
 */
export interface Condition {
  type: string;
  status: "True" | "False" | "Unknown";
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
  observedGeneration?: number;
}

/**
 * List metadata for paginated responses
 */
export interface ListMeta {
  resourceVersion?: string;
  continue?: string;
  remainingItemCount?: number;
}

/**
 * Watch event types
 */
export type WatchEventType = "ADDED" | "MODIFIED" | "DELETED" | "BOOKMARK";

/**
 * Generic watch event
 */
export interface WatchEvent<T> {
  type: WatchEventType;
  object: T;
}

/**
 * Watch handle for managing watch streams
 */
export interface WatchHandle {
  /**
   * Stop the watch stream
   */
  stop(): void;

  /**
   * Check if the watch is active
   */
  isActive(): boolean;
}

/**
 * Options for watch operations
 */
export interface WatchOptions {
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  resourceVersion?: string;
  timeoutSeconds?: number;
}

/**
 * Options for list operations
 */
export interface ListOptions {
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continue?: string;
}
