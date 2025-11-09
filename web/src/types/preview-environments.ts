// Preview Environments Types
// Generated from spec: specs/001-pr-preview-environments/data-model.md

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { pullRequestPods } from "@/db/schema";

/**
 * Pod deployment status enum
 */
export type PodStatus =
  | "pending"
  | "deploying"
  | "running"
  | "failed"
  | "deleting";

/**
 * Resource allocation for a preview environment pod
 */
export interface ResourceAllocation {
  cpu: string; // e.g., "500m"
  memory: string; // e.g., "512Mi"
  pods: number; // Number of pod replicas
}

/**
 * GitHub comment data for deployment status
 */
export interface DeploymentComment {
  url: string;
  status: PodStatus;
  timestamp: Date;
  errorMessage?: string;
  logs?: string;
}

/**
 * Configuration for creating a preview environment
 */
export interface PreviewEnvironmentConfig {
  repoName: string;
  prNumber: number;
  branch: string;
  commitSha: string;
  imageTag: string;
  namespace: string;
  publicUrl: string;
}

/**
 * Drizzle ORM type inference for pull request pods
 */
export type SelectPullRequestPod = InferSelectModel<typeof pullRequestPods>;
export type InsertPullRequestPod = InferInsertModel<typeof pullRequestPods>;

/**
 * Pull request pod with related data (for joins)
 */
export interface PullRequestPodWithRelations extends SelectPullRequestPod {
  pullRequest?: {
    id: string;
    number: number;
    title: string;
    state: string;
    url: string;
    repoId: string;
  };
}
