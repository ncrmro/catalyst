"use server";

import { listNamespaces } from "@/lib/k8s-namespaces";

export interface NamespaceInfo {
	name: string;
	labels?: { [key: string]: string };
	creationTimestamp?: string;
}

export async function getNamespaces(
	clusterName?: string,
): Promise<NamespaceInfo[]> {
	return listNamespaces(clusterName);
}
