/**
 * @catalyst/kubernetes-client
 *
 * TypeScript client for Catalyst Kubernetes CRDs (Environment, Project)
 * with exec/shell support.
 *
 * API Group: catalyst.catalyst.dev/v1alpha1
 */

// Unified API handler
export * from "./src/api/index";
export type { ClientOptions, ClusterInfo } from "./src/config";
// Configuration
export {
	getAppsV1Api,
	getClusterConfig,
	getClusters,
	getCoreV1Api,
	getCustomObjectsApi,
	KubeConfig,
	resetKubeConfigRegistry,
} from "./src/config";
// Environments client
export * from "./src/environments/index";
// Errors
export {
	ConnectionError,
	ExecError,
	KubernetesError,
	WatchError,
} from "./src/errors";
// Exec client
export * from "./src/exec/index";
// Loader (for advanced usage)
export { loadKubernetesClient, resetLoader } from "./src/loader";
// Namespaces client
export * from "./src/namespaces/index";
// Pods client
export * from "./src/pods/index";
// Types
export * from "./src/types/index";
