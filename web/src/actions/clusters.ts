'use server';

import { getClusters as getKubeClusters, ClusterInfo } from '@/lib/k8s-client';

export type { ClusterInfo };

export async function getClusters(): Promise<ClusterInfo[]> {
  return getKubeClusters();
}