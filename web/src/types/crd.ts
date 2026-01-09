export type EnvironmentType = "deployment" | "development";

// DeploymentMode specifies how the operator deploys the environment
export type DeploymentMode = "production" | "development" | "workspace";

export interface EnvironmentSource {
  name: string; // Identifies the component (e.g., "frontend", "backend")
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
  sources: EnvironmentSource[];
  config?: {
    envVars?: Array<{ name: string; value: string }>;
    image?: string; // Optional container image override
  };
  ingress?: {
    enabled: boolean;
    host?: string; // Custom hostname for this environment (e.g., env-preview-123.preview.example.com)
    tls?: {
      enabled: boolean;
      issuer?: string; // cert-manager ClusterIssuer name
    };
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

export interface SourceConfig {
  name: string; // Identifies this source component
  repositoryUrl: string;
  branch: string;
}

export interface ProjectCRSpec {
  sources: SourceConfig[];
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
