// Kubernetes GitHub OIDC Authentication Configuration management functions
import { getClusterConfig, getCustomObjectsApi } from './k8s-client';

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

    // Create a custom API client for AuthenticationConfiguration
    // Since this is a beta API, we need to use the custom objects API
    const CustomObjectsApi = await getCustomObjectsApi();
    const customObjectsApi = kc.makeApiClient(CustomObjectsApi);

    const configName = 'github-oidc-auth';
    
    try {
      // Try to get the AuthenticationConfiguration resource
      await customObjectsApi.getClusterCustomObject(
        'authentication.k8s.io',
        'v1beta1',
        'authenticationconfigurations',
        configName
      );
      
      // If we get here without error, the configuration exists
      return true;
    } catch (error) {
      // If it's a 404 error, the resource doesn't exist
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
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
    // Check if the configuration already exists
    const exists = await isGitHubOIDCEnabled(clusterName);
    if (exists) {
      console.log(`GitHub OIDC AuthenticationConfiguration already exists: ${configName}`);
      return {
        name: configName,
        created: false,
        exists: true
      };
    }

    // Create a custom API client for AuthenticationConfiguration
    const CustomObjectsApi = await getCustomObjectsApi();
    const customObjectsApi = kc.makeApiClient(CustomObjectsApi);

    // Create the AuthenticationConfiguration resource
    const resource = {
      apiVersion: 'authentication.k8s.io/v1beta1',
      kind: 'AuthenticationConfiguration',
      metadata: {
        name: configName,
        labels: {
          'app.kubernetes.io/managed-by': 'catalyst-web-app',
          'catalyst/component': 'github-oidc-auth'
        }
      },
      ...authConfig
    };

    await customObjectsApi.createClusterCustomObject(
      'authentication.k8s.io',
      'v1beta1',
      'authenticationconfigurations',
      resource
    );

    console.log(`GitHub OIDC AuthenticationConfiguration created successfully: ${configName}`, {
      cluster: clusterName || 'default',
      audience: options.clusterAudience
    });

    return {
      name: configName,
      created: true,
      exists: false
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
    // Check if the configuration exists
    const exists = await isGitHubOIDCEnabled(clusterName);
    if (!exists) {
      console.log(`GitHub OIDC AuthenticationConfiguration does not exist: ${configName}`);
      return {
        name: configName,
        created: false,
        exists: false
      };
    }

    // Create a custom API client for AuthenticationConfiguration
    const CustomObjectsApi = await getCustomObjectsApi();
    const customObjectsApi = kc.makeApiClient(CustomObjectsApi);

    // Delete the AuthenticationConfiguration resource
    await customObjectsApi.deleteClusterCustomObject(
      'authentication.k8s.io',
      'v1beta1',
      'authenticationconfigurations',
      configName
    );

    console.log(`GitHub OIDC AuthenticationConfiguration deleted successfully: ${configName}`, {
      cluster: clusterName || 'default'
    });

    return {
      name: configName,
      created: false,
      exists: false
    };
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
  const envVar = clusterName ? `CLUSTER_OIDC_AUDIENCE_${clusterName.toUpperCase()}` : 'CLUSTER_OIDC_AUDIENCE';
  const configuredAudience = process.env[envVar];
  
  return configuredAudience || defaultAudience;
}