// KEEP IN SYNC: This definition must match the CRD in operator/api/v1alpha1/environment_types.go
// If the CRD changes, update this file.

export type EnvironmentType = "deployment" | "development";

// DeploymentMode specifies how the operator deploys the environment
export type DeploymentMode = "production" | "development" | "workspace";

export interface EnvironmentSource {
  name: string;
  commitSha: string;
  branch: string;
  prNumber?: number;
}

export interface EnvironmentCRSpec {
  projectRef: {
    name: string;
  };
  type: EnvironmentType;
  // DeploymentMode: "production" | "development" | "workspace" (default)
  deploymentMode?: DeploymentMode;
  sources?: EnvironmentSource[];
  config?: {
    envVars?: Array<{ name: string; value: string }>;
  };
}

export interface EnvironmentCR {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
  };
  spec: EnvironmentCRSpec;
  status?: {
    phase?: string;
    url?: string;
    conditions?: Array<{ type: string; status: string }>;
  };
}

// KEEP IN SYNC: This definition must match operator/api/v1alpha1/project_types.go
export interface SourceConfig {
  name: string;
  repositoryUrl: string;
  branch: string;
}

export interface BuildSpec {
  name: string;
  sourceRef: string;
  path?: string;
  dockerfile?: string;
  resources?: {
    limits?: { cpu?: string; memory?: string };
    requests?: { cpu?: string; memory?: string };
  };
}

export interface EnvironmentTemplate {
  sourceRef: string;
  type: "helm" | "manifest" | "kustomize" | "docker-compose";
  path: string;
  builds?: BuildSpec[];
  values?: Record<string, unknown>;
}

export interface ProjectCRSpec {
  sources: SourceConfig[];
  githubInstallationId?: string;
  templates?: Record<string, EnvironmentTemplate>;
  resources?: {
    defaultQuota?: {
      cpu?: string;
      memory?: string;
    };
  };
}
