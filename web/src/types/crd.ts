export interface EnvironmentCRSpec {
  projectRef: {
    name: string;
  };
  type: string;
  source: {
    commitSha: string;
    branch: string;
    prNumber?: number;
  };
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
