// Kubernetes namespace management functions
import { KubeConfig, getCoreV1Api } from './k8s-client';

export interface NamespaceLabels {
  'catalyst/team': string;
  'catalyst/project': string;
  'catalyst/environment': string;
}

export interface CreateNamespaceOptions {
  team: string;
  project: string;
  environment: string;
}

export interface NamespaceResult {
  name: string;
  labels: NamespaceLabels;
  created: boolean;
}

/**
 * Generate namespace name from team, project, and environment
 * Format: team-project-environment
 */
export function generateNamespaceName(team: string, project: string, environment: string): string {
  // Sanitize inputs to be valid Kubernetes names (lowercase, alphanumeric, hyphens)
  const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  return `${sanitize(team)}-${sanitize(project)}-${sanitize(environment)}`;
}

/**
 * Create Kubernetes namespace with catalyst labels
 */
export async function createProjectNamespace(options: CreateNamespaceOptions): Promise<NamespaceResult> {
  const { team, project, environment } = options;
  
  // Initialize Kubernetes client
  const kc = new KubeConfig();
  await kc.loadFromDefault();
  
  const CoreV1Api = await getCoreV1Api();
  const k8sApi = kc.makeApiClient(CoreV1Api);

  const namespaceName = generateNamespaceName(team, project, environment);
  
  const labels: NamespaceLabels = {
    'catalyst/team': team,
    'catalyst/project': project,
    'catalyst/environment': environment
  };

  // Define the namespace
  const namespace = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespaceName,
      labels
    }
  };

  try {
    // Create the namespace
    await k8sApi.createNamespace({
      body: namespace
    });

    console.log(`Namespace created: ${namespaceName}`, { team, project, environment });

    return {
      name: namespaceName,
      labels,
      created: true
    };
  } catch (error) {
    // Check if namespace already exists
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log(`Namespace already exists: ${namespaceName}`);
      return {
        name: namespaceName,
        labels,
        created: false
      };
    }
    throw error;
  }
}

/**
 * Check if namespace exists
 */
export async function namespaceExists(namespaceName: string): Promise<boolean> {
  try {
    const kc = new KubeConfig();
    await kc.loadFromDefault();
    
    const CoreV1Api = await getCoreV1Api();
    const k8sApi = kc.makeApiClient(CoreV1Api);

    await k8sApi.readNamespace({ name: namespaceName });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return false;
    }
    throw error;
  }
}

/**
 * Delete namespace (for cleanup in tests)
 */
export async function deleteNamespace(namespaceName: string): Promise<void> {
  const kc = new KubeConfig();
  await kc.loadFromDefault();
  
  const CoreV1Api = await getCoreV1Api();
  const k8sApi = kc.makeApiClient(CoreV1Api);

  await k8sApi.deleteNamespace({ name: namespaceName });
}