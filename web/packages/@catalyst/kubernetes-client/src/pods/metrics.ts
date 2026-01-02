/**
 * Pod metrics operations
 */

import type { KubeConfig } from "../config";
import { KubernetesError } from "../errors";
import { loadKubernetesClient } from "../loader";

/**
 * Container resource usage
 */
export interface ContainerMetrics {
	name: string;
	/** CPU usage in millicores */
	cpuMillicores: number;
	/** Memory usage in MiB */
	memoryMiB: number;
}

/**
 * Pod resource usage
 */
export interface PodMetrics {
	name: string;
	namespace: string;
	containers: ContainerMetrics[];
	/** Total CPU usage in millicores */
	totalCpuMillicores: number;
	/** Total memory usage in MiB */
	totalMemoryMiB: number;
	/** Timestamp of the metrics */
	timestamp?: string;
}

/**
 * Parse Kubernetes resource value to number
 *
 * Handles formats like:
 * - CPU: "100m", "0.5", "1"
 * - Memory: "128Mi", "1Gi", "500000Ki"
 */
function parseResourceValue(value: string, type: "cpu" | "memory"): number {
	if (!value) return 0;

	if (type === "cpu") {
		// CPU values
		if (value.endsWith("m")) {
			return parseInt(value.slice(0, -1), 10);
		}
		if (value.endsWith("n")) {
			return Math.round(parseInt(value.slice(0, -1), 10) / 1000000);
		}
		// Plain number is in cores, convert to millicores
		return Math.round(parseFloat(value) * 1000);
	}

	// Memory values
	const units: Record<string, number> = {
		Ki: 1 / 1024,
		Mi: 1,
		Gi: 1024,
		Ti: 1024 * 1024,
		K: 1 / 1024,
		M: 1,
		G: 1024,
		T: 1024 * 1024,
	};

	for (const [suffix, multiplier] of Object.entries(units)) {
		if (value.endsWith(suffix)) {
			const numValue = parseFloat(value.slice(0, -suffix.length));
			return Math.round(numValue * multiplier);
		}
	}

	// Plain bytes, convert to MiB
	return Math.round(parseFloat(value) / (1024 * 1024));
}

/**
 * Get resource metrics for a pod
 *
 * Requires metrics-server to be installed in the cluster.
 */
export async function getPodMetrics(
	kubeConfig: KubeConfig,
	namespace: string,
	podName: string,
): Promise<PodMetrics | null> {
	const k8s = await loadKubernetesClient();
	const customApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi);

	try {
		const response = await customApi.getNamespacedCustomObject({
			group: "metrics.k8s.io",
			version: "v1beta1",
			namespace,
			plural: "pods",
			name: podName,
		});

		const metrics = response as {
			metadata?: { name?: string; namespace?: string };
			timestamp?: string;
			containers?: Array<{
				name: string;
				usage: { cpu?: string; memory?: string };
			}>;
		};

		const containers: ContainerMetrics[] = [];
		let totalCpu = 0;
		let totalMemory = 0;

		for (const container of metrics.containers || []) {
			const cpuMillicores = parseResourceValue(
				container.usage?.cpu || "0",
				"cpu",
			);
			const memoryMiB = parseResourceValue(
				container.usage?.memory || "0",
				"memory",
			);

			totalCpu += cpuMillicores;
			totalMemory += memoryMiB;

			containers.push({
				name: container.name,
				cpuMillicores,
				memoryMiB,
			});
		}

		return {
			name: metrics.metadata?.name || podName,
			namespace: metrics.metadata?.namespace || namespace,
			containers,
			totalCpuMillicores: totalCpu,
			totalMemoryMiB: totalMemory,
			timestamp: metrics.timestamp,
		};
	} catch (error: unknown) {
		const k8sError = KubernetesError.fromApiError(error);
		// Handle 404 (not found) or 503 (metrics server not available)
		if (k8sError.code === 404 || k8sError.code === 503) {
			return null;
		}
		throw k8sError;
	}
}

/**
 * Get resource metrics for all pods in a namespace
 */
export async function listPodMetrics(
	kubeConfig: KubeConfig,
	namespace: string,
): Promise<PodMetrics[]> {
	const k8s = await loadKubernetesClient();
	const customApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi);

	try {
		const response = await customApi.listNamespacedCustomObject({
			group: "metrics.k8s.io",
			version: "v1beta1",
			namespace,
			plural: "pods",
		});

		const metricsList = response as {
			items?: Array<{
				metadata?: { name?: string; namespace?: string };
				timestamp?: string;
				containers?: Array<{
					name: string;
					usage: { cpu?: string; memory?: string };
				}>;
			}>;
		};

		const results: PodMetrics[] = [];

		for (const metrics of metricsList.items || []) {
			const containers: ContainerMetrics[] = [];
			let totalCpu = 0;
			let totalMemory = 0;

			for (const container of metrics.containers || []) {
				const cpuMillicores = parseResourceValue(
					container.usage?.cpu || "0",
					"cpu",
				);
				const memoryMiB = parseResourceValue(
					container.usage?.memory || "0",
					"memory",
				);

				totalCpu += cpuMillicores;
				totalMemory += memoryMiB;

				containers.push({
					name: container.name,
					cpuMillicores,
					memoryMiB,
				});
			}

			results.push({
				name: metrics.metadata?.name || "",
				namespace: metrics.metadata?.namespace || namespace,
				containers,
				totalCpuMillicores: totalCpu,
				totalMemoryMiB: totalMemory,
				timestamp: metrics.timestamp,
			});
		}

		return results;
	} catch (error) {
		const k8sError = KubernetesError.fromApiError(error);
		// Return empty array if metrics server not available
		if (k8sError.code === 404 || k8sError.code === 503) {
			return [];
		}
		throw k8sError;
	}
}
