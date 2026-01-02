/**
 * Pod listing operations
 */

import type { KubeConfig } from "../config";
import { KubernetesError } from "../errors";
import { loadKubernetesClient } from "../loader";

/**
 * Container status information
 */
export interface ContainerInfo {
	name: string;
	image: string;
	ready: boolean;
	restartCount: number;
	state: "running" | "waiting" | "terminated";
	stateReason?: string;
}

/**
 * Pod information
 */
export interface PodInfo {
	name: string;
	namespace: string;
	status: "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown";
	phase: string;
	labels?: Record<string, string>;
	containers: ContainerInfo[];
	nodeName?: string;
	podIP?: string;
	hostIP?: string;
	startTime?: string;
	restartCount: number;
}

/**
 * Options for listing pods
 */
export interface ListPodsOptions {
	labelSelector?: string;
	fieldSelector?: string;
	limit?: number;
}

/**
 * List pods in a namespace
 */
export async function listPods(
	kubeConfig: KubeConfig,
	namespace: string,
	options?: ListPodsOptions,
): Promise<PodInfo[]> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		const response = await api.listNamespacedPod({
			namespace,
			labelSelector: options?.labelSelector,
			fieldSelector: options?.fieldSelector,
			limit: options?.limit,
		});

		const pods: PodInfo[] = [];

		for (const pod of response.items || []) {
			const containers: ContainerInfo[] = [];
			let totalRestarts = 0;

			// Process container statuses
			for (const containerStatus of pod.status?.containerStatuses || []) {
				const restartCount = containerStatus.restartCount || 0;
				totalRestarts += restartCount;

				let state: ContainerInfo["state"] = "waiting";
				let stateReason: string | undefined;

				if (containerStatus.state?.running) {
					state = "running";
				} else if (containerStatus.state?.terminated) {
					state = "terminated";
					stateReason = containerStatus.state.terminated.reason;
				} else if (containerStatus.state?.waiting) {
					state = "waiting";
					stateReason = containerStatus.state.waiting.reason;
				}

				containers.push({
					name: containerStatus.name,
					image: containerStatus.image || "",
					ready: containerStatus.ready || false,
					restartCount,
					state,
					stateReason,
				});
			}

			// Add init containers
			for (const containerStatus of pod.status?.initContainerStatuses || []) {
				const restartCount = containerStatus.restartCount || 0;

				let state: ContainerInfo["state"] = "waiting";
				let stateReason: string | undefined;

				if (containerStatus.state?.running) {
					state = "running";
				} else if (containerStatus.state?.terminated) {
					state = "terminated";
					stateReason = containerStatus.state.terminated.reason;
				} else if (containerStatus.state?.waiting) {
					state = "waiting";
					stateReason = containerStatus.state.waiting.reason;
				}

				containers.push({
					name: `init:${containerStatus.name}`,
					image: containerStatus.image || "",
					ready: containerStatus.ready || false,
					restartCount,
					state,
					stateReason,
				});
			}

			pods.push({
				name: pod.metadata?.name || "",
				namespace: pod.metadata?.namespace || namespace,
				status: (pod.status?.phase as PodInfo["status"]) || "Unknown",
				phase: pod.status?.phase || "Unknown",
				labels: pod.metadata?.labels,
				containers,
				nodeName: pod.spec?.nodeName,
				podIP: pod.status?.podIP,
				hostIP: pod.status?.hostIP,
				startTime: pod.status?.startTime?.toISOString(),
				restartCount: totalRestarts,
			});
		}

		return pods;
	} catch (error) {
		throw KubernetesError.fromApiError(error);
	}
}

/**
 * Get a specific pod by name
 */
export async function getPod(
	kubeConfig: KubeConfig,
	namespace: string,
	name: string,
): Promise<PodInfo | null> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		const pod = await api.readNamespacedPod({ namespace, name });

		const containers: ContainerInfo[] = [];
		let totalRestarts = 0;

		for (const containerStatus of pod.status?.containerStatuses || []) {
			const restartCount = containerStatus.restartCount || 0;
			totalRestarts += restartCount;

			let state: ContainerInfo["state"] = "waiting";
			let stateReason: string | undefined;

			if (containerStatus.state?.running) {
				state = "running";
			} else if (containerStatus.state?.terminated) {
				state = "terminated";
				stateReason = containerStatus.state.terminated.reason;
			} else if (containerStatus.state?.waiting) {
				state = "waiting";
				stateReason = containerStatus.state.waiting.reason;
			}

			containers.push({
				name: containerStatus.name,
				image: containerStatus.image || "",
				ready: containerStatus.ready || false,
				restartCount,
				state,
				stateReason,
			});
		}

		return {
			name: pod.metadata?.name || name,
			namespace: pod.metadata?.namespace || namespace,
			status: (pod.status?.phase as PodInfo["status"]) || "Unknown",
			phase: pod.status?.phase || "Unknown",
			labels: pod.metadata?.labels,
			containers,
			nodeName: pod.spec?.nodeName,
			podIP: pod.status?.podIP,
			hostIP: pod.status?.hostIP,
			startTime: pod.status?.startTime?.toISOString(),
			restartCount: totalRestarts,
		};
	} catch (error) {
		const k8sError = KubernetesError.fromApiError(error);
		if (KubernetesError.isNotFound(k8sError)) {
			return null;
		}
		throw k8sError;
	}
}
