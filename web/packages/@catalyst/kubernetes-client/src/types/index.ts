/**
 * Type exports for @catalyst/kubernetes-client
 */

// Common types
export type {
  Condition,
  ListMeta,
  ListOptions,
  ObjectMeta,
  OwnerReference,
  WatchEvent,
  WatchEventType,
  WatchHandle,
  WatchOptions,
} from "./common";

// Environment types
export type {
  Environment,
  EnvironmentConfig,
  EnvironmentInput,
  EnvironmentList,
  EnvironmentPhase,
  EnvironmentSource,
  EnvironmentSpec,
  EnvironmentStatus,
  EnvironmentType,
  EnvVar,
  ProjectReference,
} from "./environment";
export { ENVIRONMENT_API } from "./environment";

// Project types
export type {
  DeploymentConfig,
  DeploymentType,
  Project,
  ProjectInput,
  ProjectList,
  ProjectSpec,
  ProjectStatus,
  QuotaSpec,
  ResourceConfig,
  SourceConfig,
} from "./project";
export { PROJECT_API } from "./project";
