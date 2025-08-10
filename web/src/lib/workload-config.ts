/**
 * Configuration for mapping GitHub repositories and branches to Kubernetes workloads
 */

export interface WorkloadConfig {
  repository: string;
  branch: string;
  chartPath: string;
  namespace?: string;
  releaseName: string;
  values?: Record<string, unknown>;
  enableTests?: boolean;
  testCommand?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface DeploymentResult {
  success: boolean;
  releaseName: string;
  namespace: string;
  url?: string;
  error?: string;
}

/**
 * Default workload configurations
 * In a real environment, this would be loaded from a database or configuration service
 */
export const DEFAULT_WORKLOAD_CONFIGS: WorkloadConfig[] = [
  {
    repository: '*', // Wildcard for any repository
    branch: 'main',
    chartPath: 'charts/nextjs',
    namespace: 'production',
    releaseName: 'main-release',
    environment: 'production',
    enableTests: true,
    testCommand: 'npm run test:e2e',
    values: {
      image: {
        tag: 'latest'
      },
      ingress: {
        enabled: true,
        hosts: [{
          host: 'app.example.com',
          paths: [{ path: '/', pathType: 'ImplementationSpecific' }]
        }]
      }
    }
  },
  {
    repository: '*',
    branch: 'develop',
    chartPath: 'charts/nextjs',
    namespace: 'staging',
    releaseName: 'staging-release',
    environment: 'staging',
    enableTests: true,
    testCommand: 'npm run test:integration',
    values: {
      image: {
        tag: 'develop'
      },
      ingress: {
        enabled: true,
        hosts: [{
          host: 'staging.example.com',
          paths: [{ path: '/', pathType: 'ImplementationSpecific' }]
        }]
      }
    }
  }
];

/**
 * Find workload configuration for a given repository and branch
 */
export function findWorkloadConfig(
  repository: string, 
  branch: string
): WorkloadConfig | null {
  // First try exact repository match
  let config = DEFAULT_WORKLOAD_CONFIGS.find(
    config => config.repository === repository && config.branch === branch
  );
  
  // Fall back to wildcard repository match
  if (!config) {
    config = DEFAULT_WORKLOAD_CONFIGS.find(
      config => config.repository === '*' && config.branch === branch
    );
  }
  
  return config || null;
}

/**
 * Check if a branch should trigger a deployment
 */
export function shouldTriggerDeployment(branch: string): boolean {
  const releaseBranches = ['main', 'master', 'develop', 'staging'];
  return releaseBranches.includes(branch) || branch.startsWith('release/');
}

/**
 * Generate a unique release name for PR environments
 */
export function generatePRReleaseName(repository: string, prNumber: number): string {
  const repoName = repository.split('/').pop() || 'app';
  return `pr-${repoName}-${prNumber}`.toLowerCase();
}

/**
 * Generate namespace for PR environments
 */
export function generatePRNamespace(prNumber: number): string {
  return `pr-${prNumber}`;
}

/**
 * Create workload configuration for a pull request
 */
export function createPRWorkloadConfig(
  repository: string,
  prNumber: number,
  baseConfig?: WorkloadConfig
): WorkloadConfig {
  const releaseName = generatePRReleaseName(repository, prNumber);
  const namespace = generatePRNamespace(prNumber);
  
  return {
    repository,
    branch: `pr-${prNumber}`,
    chartPath: baseConfig?.chartPath || 'charts/nextjs',
    namespace,
    releaseName,
    environment: 'development',
    enableTests: true,
    testCommand: 'npm run test:pr',
    values: {
      ...baseConfig?.values,
      image: {
        tag: `pr-${prNumber}`
      },
      ingress: {
        enabled: true,
        hosts: [{
          host: `pr-${prNumber}.preview.example.com`,
          paths: [{ path: '/', pathType: 'ImplementationSpecific' }]
        }]
      },
      resources: {
        limits: {
          cpu: '200m',
          memory: '256Mi'
        },
        requests: {
          cpu: '100m',
          memory: '128Mi'
        }
      }
    }
  };
}