/**
 * Unified K8s API
 *
 * Provides a unified interface for K8s operations that can be used
 * by API endpoints. Auth-agnostic - expects KubeConfig from caller.
 */

export {
	type CreateLogStreamOptions,
	createLogStream,
	handleK8sApiRequest,
	type LogStreamController,
} from "./handler";

export {
	type K8sApiRequest,
	type K8sApiResponse,
	type K8sResourceType,
	type LogStreamEvent,
	type LogsResponse,
	type PodsResponse,
	parseK8sApiRequest,
	type StatusResponse,
} from "./types";
