"use server";

import type { ClusterInfo } from "@/lib/k8s-client";
import { getClusters as getKubeClusters } from "@/lib/k8s-client";
import {
	disableGitHubOIDC,
	enableGitHubOIDC,
	type GitHubOIDCResult,
	getClusterAudience,
	isGitHubOIDCEnabled,
} from "@/lib/k8s-github-oidc";

export async function getClusters(): Promise<ClusterInfo[]> {
	return getKubeClusters();
}

export async function getGitHubOIDCStatus(
	clusterName: string,
): Promise<boolean> {
	return isGitHubOIDCEnabled(clusterName);
}

export async function toggleGitHubOIDC(
	clusterName: string,
	enabled: boolean,
): Promise<GitHubOIDCResult> {
	if (enabled) {
		const clusterAudience = getClusterAudience(clusterName);
		return enableGitHubOIDC({ clusterAudience }, clusterName);
	} else {
		return disableGitHubOIDC(clusterName);
	}
}
