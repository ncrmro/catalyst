/**
 * Zod schemas for common Kubernetes types
 *
 * These schemas provide runtime validation for Kubernetes resource types.
 * They match the TypeScript interfaces defined in common.ts
 */

import { z } from "zod";

/**
 * Owner reference for garbage collection
 */
export const OwnerReferenceSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  name: z.string(),
  uid: z.string(),
  controller: z.boolean().optional(),
  blockOwnerDeletion: z.boolean().optional(),
});

/**
 * Standard Kubernetes object metadata
 */
export const ObjectMetaSchema = z.object({
  name: z.string(),
  namespace: z.string().optional(),
  uid: z.string().optional(),
  resourceVersion: z.string().optional(),
  creationTimestamp: z.string().optional(),
  deletionTimestamp: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  finalizers: z.array(z.string()).optional(),
  ownerReferences: z.array(OwnerReferenceSchema).optional(),
});

/**
 * Standard Kubernetes condition
 */
export const ConditionSchema = z.object({
  type: z.string(),
  status: z.enum(["True", "False", "Unknown"]),
  lastTransitionTime: z.string().optional(),
  reason: z.string().optional(),
  message: z.string().optional(),
  observedGeneration: z.number().optional(),
});

/**
 * List metadata for paginated responses
 */
export const ListMetaSchema = z.object({
  resourceVersion: z.string().optional(),
  continue: z.string().optional(),
  remainingItemCount: z.number().optional(),
});

/**
 * Watch event types
 */
export const WatchEventTypeSchema = z.enum([
  "ADDED",
  "MODIFIED",
  "DELETED",
  "BOOKMARK",
]);

/**
 * Generic watch event factory
 * Returns a schema for a watch event with a specific object type
 */
export function createWatchEventSchema<T extends z.ZodTypeAny>(
  objectSchema: T,
) {
  return z.object({
    type: WatchEventTypeSchema,
    object: objectSchema,
  });
}

/**
 * Options for watch operations
 */
export const WatchOptionsSchema = z.object({
  namespace: z.string().optional(),
  labelSelector: z.string().optional(),
  fieldSelector: z.string().optional(),
  resourceVersion: z.string().optional(),
  timeoutSeconds: z.number().optional(),
});

/**
 * Options for list operations
 */
export const ListOptionsSchema = z.object({
  namespace: z.string().optional(),
  labelSelector: z.string().optional(),
  fieldSelector: z.string().optional(),
  limit: z.number().optional(),
  continue: z.string().optional(),
});
