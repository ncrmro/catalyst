'use server';

import { createProjectNamespace, NamespaceResult } from '@/lib/k8s-namespaces';

export interface CreateNamespaceResponse {
  success: boolean;
  message?: string;
  error?: string;
  namespace?: NamespaceResult;
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

    // Validate environment is one of the supported values
    const supportedEnvironments = ['production', 'staging', 'pr-1'];
    if (!supportedEnvironments.includes(environment)) {
      return {
        success: false,
        error: `Environment must be one of: ${supportedEnvironments.join(', ')}`
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