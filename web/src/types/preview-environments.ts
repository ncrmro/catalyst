// Type definitions for PR Preview Environments

import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pullRequestPods } from "@/db/schema";
import { z } from "@tetrastack/backend/utils";

export type PodStatus =
  | "pending"
  | "deploying"
  | "running"
  | "failed"
  | "deleting";

// ============================================================================
// Validation Schemas (T074-T076)
// ============================================================================

/**
 * DNS-1123 compliant namespace validation.
 * Must be lowercase, alphanumeric, hyphens allowed (not at start/end),
 * max 63 characters.
 */
export const namespaceSchema = z
  .string()
  .min(1, "Namespace is required")
  .max(63, "Namespace must be 63 characters or less")
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    "Namespace must be DNS-1123 compliant: lowercase alphanumeric and hyphens, cannot start or end with hyphen",
  );

/**
 * Git commit SHA validation.
 * Must be 40-character hex string.
 */
export const commitShaSchema = z
  .string()
  .length(40, "Commit SHA must be exactly 40 characters")
  .regex(/^[a-f0-9]{40}$/, "Commit SHA must be a 40-character hex string");

/**
 * Public URL validation.
 * Must be HTTPS URL format.
 */
export const publicUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .startsWith("https://", "Public URL must use HTTPS");

/**
 * Preview environment config validation schema.
 */
export const previewEnvironmentConfigSchema = z.object({
  repoName: z.string().min(1, "Repository name is required"),
  prNumber: z.number().int().positive("PR number must be positive"),
  branch: z.string().min(1, "Branch name is required"),
  commitSha: commitShaSchema,
  imageTag: z.string().min(1, "Image tag is required"),
  namespace: namespaceSchema,
  publicUrl: publicUrlSchema,
});

/**
 * Validate namespace string.
 */
export function validateNamespace(namespace: string): {
  valid: boolean;
  error?: string;
} {
  const result = namespaceSchema.safeParse(namespace);
  return result.success
    ? { valid: true }
    : { valid: false, error: result.error.errors[0]?.message };
}

/**
 * Validate commit SHA string.
 */
export function validateCommitSha(sha: string): {
  valid: boolean;
  error?: string;
} {
  const result = commitShaSchema.safeParse(sha);
  return result.success
    ? { valid: true }
    : { valid: false, error: result.error.errors[0]?.message };
}

/**
 * Validate public URL string.
 */
export function validatePublicUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  const result = publicUrlSchema.safeParse(url);
  return result.success
    ? { valid: true }
    : { valid: false, error: result.error.errors[0]?.message };
}

export interface ResourceAllocation {
  cpu: string; // e.g., "500m"
  memory: string; // e.g., "512Mi"
  pods: number; // Number of pod replicas
}

/**
 * Resource quota limits for preview environments.
 * Used for monitoring and alerting when environments exceed limits.
 */
export const RESOURCE_QUOTA_LIMITS = {
  cpuMillicores: 500, // 500m CPU
  memoryMiB: 512, // 512Mi memory
} as const;

export interface DeploymentComment {
  url: string;
  status: PodStatus;
  timestamp: Date;
  errorMessage?: string;
  logs?: string;
}

export interface PreviewEnvironmentConfig {
  repoName: string;
  prNumber: number;
  branch: string;
  commitSha: string;
  imageTag: string;
  namespace: string;
  publicUrl: string;
}

// Drizzle ORM type inference
export type SelectPullRequestPod = InferSelectModel<typeof pullRequestPods>;
export type InsertPullRequestPod = InferInsertModel<typeof pullRequestPods>;
