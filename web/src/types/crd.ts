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

// K8s-native types (mirrors Kubernetes API types)

export interface ContainerPort {
  name?: string;
  containerPort: number;
  protocol?: "TCP" | "UDP" | "SCTP";
}

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: {
      name: string;
      key: string;
    };
    configMapKeyRef?: {
      name: string;
      key: string;
    };
  };
}

export interface ResourceRequirements {
  requests?: Record<string, string>;
  limits?: Record<string, string>;
}

export interface HTTPGetAction {
  path: string;
  port: number;
  scheme?: string;
}

export interface TCPSocketAction {
  port: number;
}

export interface ExecAction {
  command: string[];
}

export interface Probe {
  httpGet?: HTTPGetAction;
  tcpSocket?: TCPSocketAction;
  exec?: ExecAction;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  failureThreshold?: number;
  successThreshold?: number;
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  subPath?: string;
  readOnly?: boolean;
}

export interface InitContainerSpec {
  name: string;
  image?: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  env?: EnvVar[];
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMount[];
}

export interface ManagedServiceContainer {
  image: string;
  ports?: ContainerPort[];
  env?: EnvVar[];
  resources?: ResourceRequirements;
}

export interface PersistentVolumeClaimSpec {
  resources: {
    requests: {
      storage: string;
    };
  };
  accessModes?: string[];
}

export interface ManagedServiceSpec {
  name: string;
  container: ManagedServiceContainer;
  storage?: PersistentVolumeClaimSpec;
  database?: string;
}

export interface VolumeSpec {
  name: string;
  persistentVolumeClaim?: PersistentVolumeClaimSpec;
}

// EnvironmentConfig uses K8s-native types (FR-ENV-026)
export interface EnvironmentConfig {
  // Legacy fields (backward compatibility)
  envVars?: Array<{ name: string; value: string }>;

  // Curated corev1.Container fields
  image?: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  ports?: ContainerPort[];
  env?: EnvVar[];
  resources?: ResourceRequirements;
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  volumeMounts?: VolumeMount[];

  // Init containers (FR-ENV-031)
  initContainers?: InitContainerSpec[];

  // Managed services (FR-ENV-028)
  services?: ManagedServiceSpec[];

  // Volumes (FR-ENV-032)
  volumes?: VolumeSpec[];
}

export interface EnvironmentCRSpec {
  projectRef: {
    name: string;
  };
  type: EnvironmentType;
  // DeploymentMode: "production" | "development" | "workspace" (default)
  deploymentMode?: DeploymentMode;
  sources?: EnvironmentSource[];
  config?: EnvironmentConfig;
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
  resources?: ResourceRequirements;
}

export interface EnvironmentTemplate {
  sourceRef: string;
  type: "helm" | "manifest" | "kustomize" | "docker-compose";
  path: string;
  builds?: BuildSpec[];
  values?: Record<string, unknown>;
  // Config provides template-level defaults for managed deployments (FR-ENV-027, FR-ENV-029)
  config?: EnvironmentConfig;
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
