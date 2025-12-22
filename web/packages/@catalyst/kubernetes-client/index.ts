/**
 * @catalyst/kubernetes-client
 *
 * TypeScript client for Catalyst Kubernetes CRDs (Environment, Project)
 * with exec/shell support.
 *
 * API Group: catalyst.catalyst.dev/v1alpha1
 */

// Configuration
export {
  getClusters,
  getClusterConfig,
  getAppsV1Api,
  getCoreV1Api,
  getCustomObjectsApi,
  KubeConfig,
  resetKubeConfigRegistry,
} from "./src/config";
export type { ClientOptions, ClusterInfo } from "./src/config";

// Errors
export {
  ConnectionError,
  ExecError,
  KubernetesError,
  WatchError,
} from "./src/errors";

// Loader (for advanced usage)
export { loadKubernetesClient, resetLoader } from "./src/loader";

// Types
export * from "./src/types/index";

// Environments client
export * from "./src/environments/index";

// Pods client
export * from "./src/pods/index";

// Exec client
export * from "./src/exec/index";

// Namespaces client
export * from "./src/namespaces/index";
