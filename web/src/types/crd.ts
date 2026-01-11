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

export interface ProjectCRSpec {
  source: {
    repositoryUrl: string;
    branch: string;
  };
  deployment: {
    type: string;
    path: string;
    values?: Record<string, unknown>;
  };
  resources?: {
    defaultQuota?: {
      cpu?: string;
      memory?: string;
    };
  };
}
