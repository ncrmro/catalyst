'use server';

import { getClusters as getKubeClusters, ClusterInfo } from '@/lib/k8s-client';
import { 
  isGitHubOIDCEnabled, 
  enableGitHubOIDC, 
  disableGitHubOIDC, 
  getClusterAudience,
  type GitHubOIDCResult 
} from '@/lib/k8s-github-oidc';

export type { ClusterInfo };

export async function getClusters(): Promise<ClusterInfo[]> {
  return getKubeClusters();
}

export async function getGitHubOIDCStatus(clusterName: string): Promise<boolean> {
  return isGitHubOIDCEnabled(clusterName);
}

export async function toggleGitHubOIDC(clusterName: string, enabled: boolean): Promise<GitHubOIDCResult> {
  if (enabled) {
    const clusterAudience = getClusterAudience(clusterName);
    return enableGitHubOIDC({ clusterAudience }, clusterName);
  } else {
    return disableGitHubOIDC(clusterName);
  }
}