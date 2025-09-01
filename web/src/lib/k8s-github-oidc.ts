// Kubernetes GitHub OIDC Authentication Configuration management functions
import { getClusterConfig, getCoreV1Api } from './k8s-client';
import yaml from 'js-yaml';

export interface GitHubOIDCOptions {
  clusterAudience: string; // e.g., "https://your.cluster.aud"
}

export interface GitHubOIDCResult {
  name: string;
  created: boolean;
  exists: boolean;
}

export interface AuthenticationConfiguration {
  apiVersion: string;
  kind: string;
  jwt: Array<{
    issuer: {
      url: string;
      audiences: string[];
      audienceMatchPolicy: string;
    };
    claimMappings: {
      username: {
        claim: string;
        prefix: string;
      };
    };
  }>;
}

/**
 * Generate AuthenticationConfiguration for GitHub OIDC
 */
export function generateGitHubOIDCConfig(options: GitHubOIDCOptions): AuthenticationConfiguration {
  return {
    apiVersion: 'authentication.k8s.io/v1beta1',
    kind: 'AuthenticationConfiguration',
    jwt: [
      {
        issuer: {
          url: 'https://token.actions.githubusercontent.com',
          audiences: [options.clusterAudience],
          audienceMatchPolicy: 'MatchAny'
        },
        claimMappings: {
          username: {
            claim: 'sub',
            prefix: 'github:'
          }
        }
      }
    ]
  };
}

/**
 * Check if GitHub OIDC is enabled for a cluster
 */
export async function isGitHubOIDCEnabled(clusterName?: string): Promise<boolean> {
  try {
    const kc = await getClusterConfig(clusterName);
    if (!kc) {
      return false;
    }

    // Check for the ConfigMap that stores our AuthenticationConfiguration
    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    
    const configMapName = 'github-oidc-auth-config';
    const namespace = 'kube-system'; // Store in kube-system namespace
    
    try {
      await k8sApi.readNamespacedConfigMap({
        name: configMapName,
        namespace: namespace
      });
      return true; // ConfigMap exists, so GitHub OIDC is "enabled"
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        return false; // ConfigMap doesn't exist
      }
      throw error; // Re-throw other errors
    }
  } catch (error) {
    // If the error is about cluster not found, re-throw it
    if (error instanceof Error && error.message.includes('Kubernetes cluster') && error.message.includes('not found')) {
      throw error;
    }
    console.warn('Failed to check GitHub OIDC status:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Enable GitHub OIDC for a cluster
 */
export async function enableGitHubOIDC(options: GitHubOIDCOptions, clusterName?: string): Promise<GitHubOIDCResult> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const configName = 'github-oidc-auth';
  const authConfig = generateGitHubOIDCConfig(options);

  try {
    // Create a ConfigMap to store the AuthenticationConfiguration
    // In a real implementation, this would be applied to the API server configuration
    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    
    const configMapName = 'github-oidc-auth-config';
    const namespace = 'kube-system';
    
    // Convert the AuthenticationConfiguration to YAML
    const authConfigYaml = yaml.dump(authConfig);
    
    const configMapManifest = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: configMapName,
        namespace: namespace,
        labels: {
          'app.kubernetes.io/name': 'github-oidc-auth',
          'app.kubernetes.io/component': 'authentication',
          'app.kubernetes.io/managed-by': 'catalyst'
        }
      },
      data: {
        'authentication-config.yaml': authConfigYaml,
        'cluster-audience': options.clusterAudience,
        'enabled': 'true',
        'created-at': new Date().toISOString()
      }
    };

    // Check if ConfigMap already exists
    let exists = false;
    try {
      await k8sApi.readNamespacedConfigMap({
        name: configMapName,
        namespace: namespace
      });
      exists = true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 404) {
        throw error;
      }
    }

    if (exists) {
      // Update existing ConfigMap
      await k8sApi.replaceNamespacedConfigMap({
        name: configMapName,
        namespace: namespace,
        body: configMapManifest
      });
      console.log('GitHub OIDC AuthenticationConfiguration updated:', {
        name: configName,
        config: authConfig,
        cluster: clusterName || 'default'
      });
    } else {
      // Create new ConfigMap
      await k8sApi.createNamespacedConfigMap({
        namespace: namespace,
        body: configMapManifest
      });
      console.log('GitHub OIDC AuthenticationConfiguration created:', {
        name: configName,
        config: authConfig,
        cluster: clusterName || 'default'
      });
    }

    return {
      name: configName,
      created: !exists,
      exists: exists
    };
  } catch (error) {
    console.error('Failed to enable GitHub OIDC:', error);
    throw error;
  }
}

/**
 * Disable GitHub OIDC for a cluster
 */
export async function disableGitHubOIDC(clusterName?: string): Promise<GitHubOIDCResult> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : '. No clusters available.'}`);
  }

  const configName = 'github-oidc-auth';

  try {
    // Delete the ConfigMap that stores our AuthenticationConfiguration
    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    
    const configMapName = 'github-oidc-auth-config';
    const namespace = 'kube-system';
    
    try {
      await k8sApi.deleteNamespacedConfigMap({
        name: configMapName,
        namespace: namespace
      });
      
      console.log('GitHub OIDC AuthenticationConfiguration removed:', {
        name: configName,
        cluster: clusterName || 'default'
      });
      
      return {
        name: configName,
        created: false,
        exists: false
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        // ConfigMap doesn't exist, which means it's already "disabled"
        return {
          name: configName,
          created: false,
          exists: false
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to disable GitHub OIDC:', error);
    throw error;
  }
}

/**
 * Get cluster audience URL for GitHub OIDC
 * This would typically be configured per cluster
 */
export function getClusterAudience(clusterName?: string): string {
  // In a real implementation, this would be retrieved from cluster configuration
  // or environment variables specific to each cluster
  const defaultAudience = `https://${clusterName || 'cluster'}.example.com`;
  
  // Check for environment variable first
  const envVar = clusterName
    ? `CLUSTER_OIDC_AUDIENCE_${clusterName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    : 'CLUSTER_OIDC_AUDIENCE';
  const configuredAudience = process.env[envVar];
  
  return configuredAudience || defaultAudience;
}