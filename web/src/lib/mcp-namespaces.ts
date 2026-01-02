"use server";

import type { NamespaceInfo } from "@/actions/namespaces";
import { listNamespaces } from "@/lib/k8s-namespaces";

/**
 * System namespaces that are accessible to all authenticated users
 */
const SYSTEM_NAMESPACES = [
	"default",
	"kube-system",
	"kube-public",
	"kube-node-lease",
	"catalyst-system",
];

/**
 * Get namespaces that a specific user can access based on their team memberships
 */
export async function getNamespacesForUser(
	_userId: string,
	userTeamIds: string[],
	clusterName?: string,
): Promise<NamespaceInfo[]> {
	try {
		// Get all namespaces
		const allNamespaces = await listNamespaces(clusterName);

		// Filter namespaces based on user's team memberships
		const filteredNamespaces = allNamespaces.filter((ns) => {
			// Allow access to system namespaces
			if (SYSTEM_NAMESPACES.includes(ns.name)) {
				return true;
			}

			// Check for 'catalyst/team' label that matches user's team IDs
			const labels = ns.labels || {};
			const namespaceTeam = labels["catalyst/team"];

			return namespaceTeam && userTeamIds.includes(namespaceTeam);
		});

		return filteredNamespaces;
	} catch (error) {
		console.error("Error fetching namespaces for user:", error);
		throw error;
	}
}

/**
 * Get details for a specific namespace if user has access
 */
export async function getNamespaceDetails(
	namespace: string,
	userTeamIds: string[],
	_resources?: string[],
	clusterName?: string,
): Promise<NamespaceInfo | null> {
	try {
		// First check if user has access to this namespace
		const accessibleNamespaces = await getNamespacesForUser(
			"",
			userTeamIds,
			clusterName,
		);
		const hasAccess = accessibleNamespaces.some((ns) => ns.name === namespace);

		if (!hasAccess) {
			return null;
		}

		// Get all namespaces and find the specific one
		const allNamespaces = await listNamespaces(clusterName);
		const namespaceInfo = allNamespaces.find((ns) => ns.name === namespace);

		if (!namespaceInfo) {
			return null;
		}

		// For now, return basic namespace info
		// TODO: Implement resource details fetching based on the resources parameter
		return {
			...namespaceInfo,
			// Add additional details here based on resources parameter
		};
	} catch (error) {
		console.error("Error fetching namespace details:", error);
		throw error;
	}
}
