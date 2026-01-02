/**
 * Namespace operations
 */

import type { KubeConfig } from "../config";
import { KubernetesError } from "../errors";
import { loadKubernetesClient } from "../loader";

/**
 * Namespace information
 */
export interface NamespaceInfo {
	name: string;
	status: "Active" | "Terminating";
	labels?: Record<string, string>;
	annotations?: Record<string, string>;
	creationTimestamp?: string;
}

/**
 * Options for creating a namespace
 */
export interface CreateNamespaceOptions {
	/** Labels to apply */
	labels?: Record<string, string>;
	/** Annotations to apply */
	annotations?: Record<string, string>;
}

/**
 * Check if a namespace exists
 */
export async function namespaceExists(
	kubeConfig: KubeConfig,
	name: string,
): Promise<boolean> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		await api.readNamespace({ name });
		return true;
	} catch (error) {
		const k8sError = KubernetesError.fromApiError(error);
		if (KubernetesError.isNotFound(k8sError)) {
			return false;
		}
		throw k8sError;
	}
}

/**
 * Get namespace information
 */
export async function getNamespace(
	kubeConfig: KubeConfig,
	name: string,
): Promise<NamespaceInfo | null> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		const ns = await api.readNamespace({ name });
		return {
			name: ns.metadata?.name || name,
			status: (ns.status?.phase as NamespaceInfo["status"]) || "Active",
			labels: ns.metadata?.labels,
			annotations: ns.metadata?.annotations,
			creationTimestamp: ns.metadata?.creationTimestamp?.toISOString(),
		};
	} catch (error) {
		const k8sError = KubernetesError.fromApiError(error);
		if (KubernetesError.isNotFound(k8sError)) {
			return null;
		}
		throw k8sError;
	}
}

/**
 * List all namespaces
 */
export async function listNamespaces(
	kubeConfig: KubeConfig,
	labelSelector?: string,
): Promise<NamespaceInfo[]> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		const response = await api.listNamespace({ labelSelector });
		return (response.items || []).map((ns) => ({
			name: ns.metadata?.name || "",
			status: (ns.status?.phase as NamespaceInfo["status"]) || "Active",
			labels: ns.metadata?.labels,
			annotations: ns.metadata?.annotations,
			creationTimestamp: ns.metadata?.creationTimestamp?.toISOString(),
		}));
	} catch (error) {
		throw KubernetesError.fromApiError(error);
	}
}

/**
 * Create a namespace
 */
export async function createNamespace(
	kubeConfig: KubeConfig,
	name: string,
	options?: CreateNamespaceOptions,
): Promise<NamespaceInfo> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		const ns = await api.createNamespace({
			body: {
				apiVersion: "v1",
				kind: "Namespace",
				metadata: {
					name,
					labels: options?.labels,
					annotations: options?.annotations,
				},
			},
		});

		return {
			name: ns.metadata?.name || name,
			status: (ns.status?.phase as NamespaceInfo["status"]) || "Active",
			labels: ns.metadata?.labels,
			annotations: ns.metadata?.annotations,
			creationTimestamp: ns.metadata?.creationTimestamp?.toISOString(),
		};
	} catch (error) {
		throw KubernetesError.fromApiError(error);
	}
}

/**
 * Delete a namespace
 */
export async function deleteNamespace(
	kubeConfig: KubeConfig,
	name: string,
): Promise<void> {
	const k8s = await loadKubernetesClient();
	const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

	try {
		await api.deleteNamespace({ name });
	} catch (error) {
		const k8sError = KubernetesError.fromApiError(error);
		// Ignore not found errors on delete
		if (!KubernetesError.isNotFound(k8sError)) {
			throw k8sError;
		}
	}
}

/**
 * Ensure a namespace exists (create if not)
 */
export async function ensureNamespace(
	kubeConfig: KubeConfig,
	name: string,
	options?: CreateNamespaceOptions,
): Promise<NamespaceInfo> {
	const existing = await getNamespace(kubeConfig, name);
	if (existing) {
		return existing;
	}
	return createNamespace(kubeConfig, name, options);
}

/**
 * Generate a DNS-safe namespace name
 *
 * Kubernetes namespace names must:
 * - Be at most 63 characters
 * - Contain only lowercase letters, numbers, and hyphens
 * - Start and end with alphanumeric characters
 */
export function sanitizeNamespaceName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with hyphens
		.replace(/-+/g, "-") // Collapse multiple hyphens
		.replace(/^-|-$/g, "") // Remove leading/trailing hyphens
		.slice(0, 63); // Truncate to max length
}
