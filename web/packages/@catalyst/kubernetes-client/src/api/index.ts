/**
 * Unified K8s API
 *
 * Provides a unified interface for K8s operations that can be used
 * by API endpoints. Auth-agnostic - expects KubeConfig from caller.
 */

export {
  handleK8sApiRequest,
  createLogStream,
  type CreateLogStreamOptions,
  type LogStreamController,
} from "./handler";

export {
  parseK8sApiRequest,
  type K8sResourceType,
  type K8sApiRequest,
  type K8sApiResponse,
  type PodsResponse,
  type LogsResponse,
  type StatusResponse,
  type LogStreamEvent,
} from "./types";
