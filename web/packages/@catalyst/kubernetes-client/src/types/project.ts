/**
 * Project CRD types
 *
 * API Group: catalyst.catalyst.dev/v1alpha1
 * Based on: operator/api/v1alpha1/project_types.go
 */

import type { Condition, ListMeta, ObjectMeta } from "./common";

/**
 * CRD API constants
 */
export const PROJECT_API = {
  group: "catalyst.catalyst.dev",
  version: "v1alpha1",
  plural: "projects",
  kind: "Project",
} as const;

/**
 * Source configuration for the project
 */
export interface SourceConfig {
  /** Name to identify this source component */
  name: string;
  /** Git repository URL */
  repositoryUrl: string;
  /** Default branch to use */
  branch: string;
}

/**
 * Deployment type
 */
export type DeploymentType = "helm" | "manifest" | "kustomize";

/**
 * Environment Template configuration
 */
export interface EnvironmentTemplate {
  /** SourceRef refers to one of the sources defined in Project.Sources */
  sourceRef?: string;
  /** Type of deployment */
  type: DeploymentType;
  /** Path to the deployment definition (e.g., chart path) */
  path?: string;
  /** Default values to inject (JSON) */
  values?: Record<string, unknown>;
}

/**
 * Resource quota specification
 */
export interface QuotaSpec {
  /** CPU limit (e.g., "1") */
  cpu?: string;
  /** Memory limit (e.g., "2Gi") */
  memory?: string;
}

/**
 * Resource configuration
 */
export interface ResourceConfig {
  /** Default resource quota for environments */
  defaultQuota?: QuotaSpec;
}

/**
 * ProjectSpec defines the desired state of Project
 */
export interface ProjectSpec {
  /** Sources configuration */
  sources: SourceConfig[];
  /** Templates for different environment types. Standard keys: "development" and "deployment". */
  templates?: Record<string, EnvironmentTemplate>;
  /** Resource configuration */
  resources?: ResourceConfig;
}

/**
 * ProjectStatus defines the observed state of Project
 */
export interface ProjectStatus {
  /** Detailed conditions */
  conditions?: Condition[];
}

/**
 * Project is the Schema for the projects API
 */
export interface Project {
  apiVersion: "catalyst.catalyst.dev/v1alpha1";
  kind: "Project";
  metadata: ObjectMeta;
  spec: ProjectSpec;
  status?: ProjectStatus;
}

/**
 * ProjectList contains a list of Project
 */
export interface ProjectList {
  apiVersion: "catalyst.catalyst.dev/v1alpha1";
  kind: "ProjectList";
  metadata: ListMeta;
  items: Project[];
}

/**
 * Input for creating a Project (without status)
 */
export type ProjectInput = Omit<Project, "status">;
