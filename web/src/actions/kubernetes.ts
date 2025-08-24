'use server';

import { createProjectNamespace, deleteNamespace, generateNamespaceName, NamespaceResult } from '@/lib/k8s-namespaces';

export interface CreateNamespaceResponse {
  success: boolean;
  message?: string;
  error?: string;
  namespace?: NamespaceResult;
}

export interface DeleteNamespaceResponse {
  success: boolean;
  message?: string;
  error?: string;
  namespaceName?: string;
}

/**
 * Server action to create a Kubernetes namespace for a project environment
 */
export async function createKubernetesNamespace(
  team: string,
  project: string,
  environment: string
): Promise<CreateNamespaceResponse> {
  try {
    // Validate required fields
    if (!team || !project || !environment) {
      return {
        success: false,
        error: 'Missing required fields: team, project, environment'
      };
    }

    // Validate environment is one of the supported values or follows a PR pattern
    const supportedEnvironments = ['production', 'staging'];
    const isPrEnvironment = /^(pr-\d+|gh-pr-\d+)$/.test(environment);
    
    if (!supportedEnvironments.includes(environment) && !isPrEnvironment) {
      return {
        success: false,
        error: `Environment must be one of: ${supportedEnvironments.join(', ')} or follow pattern pr-NUMBER or gh-pr-NUMBER`
      };
    }

    try {
      const result = await createProjectNamespace({ team, project, environment });

      return {
        success: true,
        message: result.created ? 'Namespace created successfully' : 'Namespace already exists',
        namespace: result
      };

    } catch (kubeError) {
      console.error('Kubernetes namespace creation error:', kubeError);
      
      let errorMessage = 'Failed to create namespace';
      
      if (kubeError instanceof Error) {
        errorMessage = kubeError.message;
        
        // Handle specific Kubernetes API errors
        if (kubeError.message.includes('Unauthorized')) {
          errorMessage = 'Unauthorized to access Kubernetes cluster';
        } else if (kubeError.message.includes('connection refused')) {
          errorMessage = 'Cannot connect to Kubernetes cluster';
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }

  } catch (error) {
    console.error('Error processing namespace creation request:', error);
    return {
      success: false,
      error: 'Invalid request parameters'
    };
  }
}

/**
 * Server action to delete a Kubernetes namespace for a project environment
 */
export async function deleteKubernetesNamespace(
  team: string,
  project: string,
  environment: string
): Promise<DeleteNamespaceResponse> {
  try {
    // Validate required fields
    if (!team || !project || !environment) {
      return {
        success: false,
        error: 'Missing required fields: team, project, environment'
      };
    }

    // Validate environment is one of the supported values or follows a PR pattern
    const supportedEnvironments = ['production', 'staging'];
    const isPrEnvironment = /^(pr-\d+|gh-pr-\d+)$/.test(environment);
    
    if (!supportedEnvironments.includes(environment) && !isPrEnvironment) {
      return {
        success: false,
        error: `Environment must be one of: ${supportedEnvironments.join(', ')} or follow pattern pr-NUMBER or gh-pr-NUMBER`
      };
    }

    try {
      const namespaceName = generateNamespaceName(team, project, environment);
      await deleteNamespace(namespaceName);

      return {
        success: true,
        message: 'Namespace deleted successfully',
        namespaceName
      };

    } catch (kubeError) {
      console.error('Kubernetes namespace deletion error:', kubeError);
      
      let errorMessage = 'Failed to delete namespace';
      
      if (kubeError instanceof Error) {
        errorMessage = kubeError.message;
        
        // Handle specific Kubernetes API errors
        // Check for 404 status code or "not found" in the error
        const errorString = JSON.stringify(kubeError);
        const hasCode404 = 'code' in kubeError && kubeError.code === 404;
        if (kubeError.message.includes('not found') || 
            errorString.includes('not found') || 
            errorString.includes('"code":404') ||
            hasCode404) {
          // Namespace doesn't exist, consider this a success
          const namespaceName = generateNamespaceName(team, project, environment);
          return {
            success: true,
            message: 'Namespace not found (already deleted)',
            namespaceName
          };
        } else if (kubeError.message.includes('Unauthorized')) {
          errorMessage = 'Unauthorized to access Kubernetes cluster';
        } else if (kubeError.message.includes('connection refused')) {
          errorMessage = 'Cannot connect to Kubernetes cluster';
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }

  } catch (error) {
    console.error('Error processing namespace deletion request:', error);
    return {
      success: false,
      error: 'Invalid request parameters'
    };
  }
}