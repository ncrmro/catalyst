// Type definitions for PR Preview Environments

import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pullRequestPods } from "@/db/schema";

export type PodStatus = 'pending' | 'deploying' | 'running' | 'failed' | 'deleting';

export interface ResourceAllocation {
  cpu: string;      // e.g., "500m"
  memory: string;   // e.g., "512Mi"
  pods: number;     // Number of pod replicas
}

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
