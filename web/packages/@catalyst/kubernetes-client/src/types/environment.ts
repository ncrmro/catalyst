/**
 * Environment CRD types
 *
 * API Group: catalyst.catalyst.dev/v1alpha1
 * Based on: operator/api/v1alpha1/environment_types.go
 */

import type { Condition, ListMeta, ObjectMeta } from "./common";

/**
 * CRD API constants
 */
export const ENVIRONMENT_API = {
  group: "catalyst.catalyst.dev",
  version: "v1alpha1",
  plural: "environments",
  kind: "Environment",
} as const;

/**
 * Reference to a parent Project
 */
export interface ProjectReference {
  name: string;
}

/**
 * Source configuration for the environment
 */
export interface EnvironmentSource {
  /** Name identifies the component (matches Project.Sources[].Name) */
  name: string;
  /** Git commit SHA to deploy */
  commitSha: string;
  /** Branch name */
  branch: string;
  /** Pull request number (optional) */
  prNumber?: number;
}

/**
 * Environment variable configuration
 */
export interface EnvVar {
  name: string;
  value: string;
}

/**
 * Environment-specific configuration overrides
 */
export interface EnvironmentConfig {
  /** Environment variables to inject */
  envVars?: EnvVar[];
  /** Container image to deploy (e.g., "ghcr.io/ncrmro/catalyst:latest") */
  image?: string;
}

/**
 * Environment type
 */
export type EnvironmentType = "development" | "deployment";

/**
 * Deployment mode specifies how the operator deploys the environment
 */
export type DeploymentMode = "production" | "development" | "workspace";

/**
 * Environment lifecycle phase
 */
export type EnvironmentPhase =
  | "Pending"
  | "Building"
  | "Deploying"
  | "Ready"
  | "Failed";

/**
 * Ingress TLS configuration
 */
export interface IngressTLSConfig {
  /** Enabled controls whether to enable TLS */
  enabled: boolean;
  /** Issuer is the cert-manager ClusterIssuer name */
  issuer?: string;
}

/**
 * Ingress configuration for exposing the environment
 */
export interface IngressConfig {
  /** Enabled controls whether to create an Ingress resource */
  enabled: boolean;
  /** Host is the hostname for the ingress */
  host?: string;
  /** TLS configuration for HTTPS */
  tls?: IngressTLSConfig;
}

/**
 * EnvironmentSpec defines the desired state of Environment
 */
export interface EnvironmentSpec {
  /** Reference to the parent Project */
  projectRef: ProjectReference;
  /** Type of environment */
  type: EnvironmentType;
  /** Deployment mode: "production", "development", or "workspace" (default) */
  deploymentMode?: DeploymentMode;
  /** Sources configuration for this specific environment */
  sources: EnvironmentSource[];
  /** Configuration overrides */
  config?: EnvironmentConfig;
  /** Ingress configuration for exposing the environment */
  ingress?: IngressConfig;
}

/**
 * EnvironmentStatus defines the observed state of Environment
 */
export interface EnvironmentStatus {
  /** Current lifecycle phase */
  phase?: EnvironmentPhase;
  /** Public URL if available */
  url?: string;
  /** Detailed conditions */
  conditions?: Condition[];
}

/**
 * Environment is the Schema for the environments API
 */
export interface Environment {
  apiVersion: "catalyst.catalyst.dev/v1alpha1";
  kind: "Environment";
  metadata: ObjectMeta;
  spec: EnvironmentSpec;
  status?: EnvironmentStatus;
}

/**
 * EnvironmentList contains a list of Environment
 */
export interface EnvironmentList {
  apiVersion: "catalyst.catalyst.dev/v1alpha1";
  kind: "EnvironmentList";
  metadata: ListMeta;
  items: Environment[];
}

/**
 * Input for creating an Environment (without status)
 */
export type EnvironmentInput = Omit<Environment, "status">;
