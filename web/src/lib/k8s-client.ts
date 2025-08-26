// Kubernetes client wrapper to handle ESM issues with Jest
// This module provides a CommonJS interface to the ESM Kubernetes client

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let k8s: any;

// Dynamic import to handle ESM module
async function loadKubernetesClient() {
  if (!k8s) {
    k8s = await import('@kubernetes/client-node');
  }
  return k8s;
}

export interface ClusterInfo {
  name: string;
  endpoint: string;
  source: string; // Which environment variable it came from
}

// Global registry for initialized kubeconfigs
class KubeConfigRegistry {
  private configs: Map<string, KubeConfig> = new Map();
  private initialized = false;

  reset() {
    this.configs.clear();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Find all environment variables starting with KUBECONFIG_
    const kubeConfigEnvs = Object.keys(process.env).filter(key => 
      key.startsWith('KUBECONFIG_') && process.env[key]
    );

    for (const envVar of kubeConfigEnvs) {
      try {
        const kubeConfig = new KubeConfig();
        await kubeConfig.loadFromEnvVar(envVar);
        
        // Extract suffix from environment variable name (e.g., KUBECONFIG_PRIMARY -> PRIMARY)
        const suffix = envVar.replace('KUBECONFIG_', '');
        this.configs.set(suffix, kubeConfig);
      } catch (error) {
        console.warn(`Failed to load kubeconfig from ${envVar}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // If no environment variables are set, try to load from default kubeconfig
    if (this.configs.size === 0) {
      try {
        const kubeConfig = new KubeConfig();
        await kubeConfig.loadFromDefault();
        this.configs.set('default', kubeConfig);
      } catch (error) {
        console.warn('Failed to load default kubeconfig:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    this.initialized = true;
  }

  async getConfigs(): Promise<Map<string, KubeConfig>> {
    await this.initialize();
    return this.configs;
  }

  async getConfigForCluster(clusterName: string): Promise<KubeConfig | null> {
    await this.initialize();
    
    // First try to find by exact cluster name
    for (const [source, kubeConfig] of this.configs) {
      try {
        const clusterInfo = kubeConfig.getClusterInfo();
        if (clusterInfo.name === clusterName) {
          return kubeConfig;
        }
      } catch (error) {
        console.warn(`Failed to get cluster info for ${source}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // If not found by exact name, try by source name
    const config = this.configs.get(clusterName) || this.configs.get(clusterName.replace('KUBECONFIG_', ''));
    return config || null;
  }

  async getClusters(): Promise<ClusterInfo[]> {
    await this.initialize();
    const clusters: ClusterInfo[] = [];

    for (const [source, kubeConfig] of this.configs) {
      try {
        const clusterInfo = kubeConfig.getClusterInfo();
        clusters.push({
          name: clusterInfo.name,
          endpoint: clusterInfo.endpoint,
          source: source === 'default' ? 'default' : `KUBECONFIG_${source}`
        });
      } catch (error) {
        console.warn(`Failed to get cluster info for ${source}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return clusters;
  }
}

// Global instance
const kubeConfigRegistry = new KubeConfigRegistry();

export class KubeConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _kc: any;

  constructor() {
    // Will be initialized when needed
  }

  /**
   * Configure TLS settings based on cluster type and environment
   */
  private configureTLS() {
    if (!this._kc) {
      return;
    }

    try {
      const cluster = this._kc.getCurrentCluster();
      if (!cluster) {
        return;
      }

      const serverUrl = cluster.server;
      
      // Detect local development environments
      const isLocalCluster = 
        serverUrl?.includes('localhost') ||
        serverUrl?.includes('127.0.0.1') ||
        serverUrl?.includes('kind-') ||
        serverUrl?.startsWith('http://') ||
        process.env.NODE_ENV === 'development';

      // Check for explicit environment variable override
      const skipTLSVerifyEnv = process.env.KUBE_SKIP_TLS_VERIFY;
      let skipTLSVerify = false;

      if (skipTLSVerifyEnv !== undefined) {
        // Explicit override from environment
        skipTLSVerify = skipTLSVerifyEnv.toLowerCase() === 'true';
      } else if (isLocalCluster) {
        // Auto-detect for local clusters
        skipTLSVerify = true;
      }

      if (skipTLSVerify && cluster) {
        // Disable TLS verification for local/development clusters
        cluster.skipTLSVerify = true;
        console.log('TLS verification disabled for local Kubernetes cluster');
      } else {
        console.log('TLS verification enabled for Kubernetes cluster');
      }
    } catch (error) {
      console.warn('Failed to configure TLS settings:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async loadFromDefault() {
    const k8sModule = await loadKubernetesClient();
    this._kc = new k8sModule.KubeConfig();
    this._kc.loadFromDefault();
    this.configureTLS();
    return this._kc;
  }

  async loadFromString(kubeConfigString: string) {
    const k8sModule = await loadKubernetesClient();
    this._kc = new k8sModule.KubeConfig();
    this._kc.loadFromString(kubeConfigString);
    this.configureTLS();
    return this._kc;
  }

  async loadFromEnvVar(envVarName: string) {
    const envValue = process.env[envVarName];
    if (!envValue) {
      throw new Error(`Environment variable ${envVarName} not found`);
    }
    
    let kubeConfigString: string;
    try {
      // Decode base64 and parse JSON
      const decoded = Buffer.from(envValue, 'base64').toString('utf-8');
      const kubeConfigObj = JSON.parse(decoded);
      kubeConfigString = JSON.stringify(kubeConfigObj);
    } catch (error) {
      throw new Error(`Failed to decode kubeconfig from ${envVarName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.loadFromString(kubeConfigString);
  }

  getClusterInfo() {
    if (!this._kc) {
      throw new Error('KubeConfig not initialized. Call a load method first.');
    }
    
    const currentContext = this._kc.getCurrentContext();
    const cluster = this._kc.getCurrentCluster();
    
    return {
      name: currentContext || 'unknown',
      endpoint: cluster?.server || 'unknown',
      cluster: cluster
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeApiClient(apiClass: any) {
    if (!this._kc) {
      throw new Error('KubeConfig not initialized. Call a load method first.');
    }
    return this._kc.makeApiClient(apiClass);
  }
}

export async function getAppsV1Api() {
  const k8sModule = await loadKubernetesClient();
  return k8sModule.AppsV1Api;
}

export async function getCoreV1Api() {
  const k8sModule = await loadKubernetesClient();
  return k8sModule.CoreV1Api;
}

export async function getClusters(): Promise<ClusterInfo[]> {
  return kubeConfigRegistry.getClusters();
}

export async function getClusterConfig(clusterName?: string): Promise<KubeConfig> {
  if (clusterName) {
    // Try to get config for specific cluster
    const clusterConfig = await kubeConfigRegistry.getConfigForCluster(clusterName);
    if (clusterConfig) {
      return clusterConfig;
    } else {
      throw new Error(`Cluster config not found for: ${clusterName}`);
    }
  } else {
    // Try to find any configured cluster, prioritizing production environments
    const clusters = await getClusters();
    let selectedConfig: KubeConfig | null = null;
    
    if (clusters.length > 0) {
      // Look for production-like cluster names first
      const productionClusterNames = ['PRODUCTION', 'PROD', 'PRIMARY', 'MAIN'];
      for (const prodName of productionClusterNames) {
        selectedConfig = await kubeConfigRegistry.getConfigForCluster(prodName);
        if (selectedConfig) break;
      }
      
      // If no production cluster found, use the first available cluster
      if (!selectedConfig && clusters.length > 0) {
        const firstCluster = clusters[0];
        const clusterKey = firstCluster.source.replace('KUBECONFIG_', '');
        selectedConfig = await kubeConfigRegistry.getConfigForCluster(clusterKey);
      }
    }
    
    if (selectedConfig) {
      return selectedConfig;
    } else {
      // Fallback to creating a new config if no registered configs exist
      const kc = new KubeConfig();
      await kc.loadFromDefault();
      return kc;
    }
  }
}

// For testing purposes
export function resetKubeConfigRegistry() {
  kubeConfigRegistry.reset();
}