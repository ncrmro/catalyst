'use server';

import { listPodsInNamespace, PodInfo } from '@/lib/k8s-pods';

export async function getPodsInNamespace(namespaceName: string, clusterName?: string): Promise<PodInfo[]> {
  return listPodsInNamespace(namespaceName, clusterName);
}

export type { PodInfo } from '@/lib/k8s-pods';