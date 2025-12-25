export type EnvironmentType = "deployment" | "development";

/**
 * Ingress configuration for preview environments.
 * All fields are optional - if not specified, defaults from environment variables are used.
 */
export interface IngressConfig {
  /** Custom domain for preview URLs (e.g., "preview.mycompany.com") */
  domain?: string;
  /** TLS cluster issuer for cert-manager (e.g., "letsencrypt-prod") */
  tlsClusterIssuer?: string;
  /** Ingress class name (e.g., "nginx", "traefik") */
  ingressClassName?: string;
}

export interface EnvironmentCRSpec {
  projectRef: {
    name: string;
  };
  type: EnvironmentType;
  source: {
    commitSha: string;
    branch: string;
    prNumber?: number;
  };
  config?: {
    envVars?: Array<{ name: string; value: string }>;
  };
  /** Ingress configuration for this environment */
  ingress?: IngressConfig;
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
