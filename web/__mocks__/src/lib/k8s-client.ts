// Mock implementation for k8s-client to avoid ES module issues in Jest

export interface ClusterInfo {
  name: string;
  endpoint: string;
  source: string;
}

export interface DeploymentResult {
  name: string;
  namespace: string;
  replicas: number;
  timestamp: number;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

// Mock implementation that returns success by default
export async function createDeployment(): Promise<DeploymentResult> {
  return {
    name: `nginx-deployment-${Date.now()}`,
    namespace: 'default',
    replicas: 1,
    timestamp: Date.now()
  };
}

export async function deleteDeployment(): Promise<DeleteResult> {
  return {
    success: true
  };
}

export async function getClusters(): Promise<ClusterInfo[]> {
  return [
    {
      name: 'test-cluster',
      endpoint: 'https://test-cluster.example.com',
      source: 'mock'
    }
  ];
}

// Mock KubeConfig class
export class KubeConfig {
  async loadFromDefault() {
    // Mock successful load
    return;
  }

  getCurrentContext() {
    return 'test-context';
  }

  getContexts() {
    return [
      {
        name: 'test-context',
        cluster: 'test-cluster',
        user: 'test-user'
      }
    ];
  }
}