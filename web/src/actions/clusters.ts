'use server';

import { KubeConfig } from '@/lib/k8s-client';

export interface ClusterInfo {
  name: string;
  endpoint: string;
  source: string; // Which environment variable it came from
}

export async function getClusters(): Promise<ClusterInfo[]> {
  const clusters: ClusterInfo[] = [];
  
  // List of environment variables to check for kubeconfig
  const envVars = ['KUBECONFIG_PRIMARY', 'KUBECONFIG_FOO', 'KUBECONFIG_BAR'];
  
  for (const envVar of envVars) {
    try {
      const kubeConfig = new KubeConfig();
      await kubeConfig.loadFromEnvVar(envVar);
      
      const clusterInfo = kubeConfig.getClusterInfo();
      clusters.push({
        name: clusterInfo.name,
        endpoint: clusterInfo.endpoint,
        source: envVar
      });
    } catch (error) {
      // Skip if environment variable doesn't exist or is invalid
      console.warn(`Failed to load kubeconfig from ${envVar}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // If no environment variables are set, try to load from default kubeconfig
  if (clusters.length === 0) {
    try {
      const kubeConfig = new KubeConfig();
      await kubeConfig.loadFromDefault();
      
      const clusterInfo = kubeConfig.getClusterInfo();
      clusters.push({
        name: clusterInfo.name,
        endpoint: clusterInfo.endpoint,
        source: 'default'
      });
    } catch (error) {
      console.warn('Failed to load default kubeconfig:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  return clusters;
}