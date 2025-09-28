/**
 * Unit tests for PR Pod Helm deployment functionality
 * 
 * This test validates:
 * 1. PR pod script includes Helm deployment logic when HELM_CHART_PATH is provided
 * 2. Correct environment variables are used for Helm deployment
 * 3. Ingress configuration is properly set in Helm values
 * 4. Helm release cleanup is properly configured
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPullRequestPodJob, cleanupPullRequestHelmRelease } from '../../../src/lib/k8s-pull-request-pod';

// Mock Kubernetes APIs with a more detailed mock structure
const mockCreateNamespacedJob = vi.fn(() => 
  Promise.resolve({ metadata: { name: 'test-job-123' } })
);

const mockBatchApi = {
  createNamespacedJob: mockCreateNamespacedJob,
  listNamespacedJob: vi.fn(() => Promise.resolve({ items: [] })),
  deleteNamespacedJob: vi.fn(() => Promise.resolve()),
  readNamespacedJob: vi.fn(() => Promise.resolve({ status: {} }))
};

const mockCoreApi = {
  createNamespacedServiceAccount: vi.fn((params) => Promise.resolve()),
  deleteNamespacedServiceAccount: vi.fn((params) => Promise.resolve()),
  createNamespacedSecret: vi.fn((params) => Promise.resolve()),
  readNamespacedSecret: vi.fn((params) => Promise.reject(new Error('Not found')))
};

const mockRbacApi = {
  createNamespacedRole: vi.fn((params) => Promise.resolve()),
  createNamespacedRoleBinding: vi.fn((params) => Promise.resolve()),
  deleteNamespacedRole: vi.fn((params) => Promise.resolve()),
  deleteNamespacedRoleBinding: vi.fn((params) => Promise.resolve())
};

const mockKubernetesConfig = {
  makeApiClient: vi.fn((apiClass) => {
    if (apiClass.name === 'BatchV1Api' || apiClass === 'BatchV1Api') {
      return mockBatchApi;
    } else if (apiClass.name === 'CoreV1Api' || apiClass === 'CoreV1Api') {
      return mockCoreApi;
    } else if (apiClass.name === 'RbacAuthorizationV1Api' || apiClass === 'RbacAuthorizationV1Api') {
      return mockRbacApi;
    }
    return mockBatchApi; // Default fallback
  })
};

// Mock the Kubernetes client
vi.mock('../../../src/lib/k8s-client', () => ({
  getClusterConfig: vi.fn(() => mockKubernetesConfig),
  getCoreV1Api: vi.fn(() => 'CoreV1Api'),
  getBatchV1Api: vi.fn(() => 'BatchV1Api'),
  getRbacAuthorizationV1Api: vi.fn(() => 'RbacAuthorizationV1Api')
}));

// Mock GitHub configuration
vi.mock('../../../src/lib/github', () => ({
  GITHUB_CONFIG: {
    PAT: 'mock-github-pat'
  }
}));

describe('PR Pod Helm Deployment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNamespacedJob.mockResolvedValue({ metadata: { name: 'test-job-123' } });
  });

  describe('createPullRequestPodJob with Helm deployment', () => {
    it('should include Helm deployment script when HELM_CHART_PATH is provided', async () => {
      const options = {
        name: 'test-pr-123',
        namespace: 'test-namespace',
        env: {
          REPO_URL: 'https://github.com/test/repo.git',
          PR_BRANCH: 'feature-branch',
          PR_NUMBER: '123',
          GITHUB_USER: 'testuser',
          IMAGE_NAME: 'test-repo/web',
          NEEDS_BUILD: 'true',
          HELM_CHART_PATH: '/charts/nextjs',
          PRIMARY_HOSTNAME: 'dev.example.com',
          PROJECT_NAME: 'test-repo',
          TARGET_NAMESPACE: 'test-namespace'
        }
      };

      const result = await createPullRequestPodJob(options);

      expect(result).toBeDefined();
      expect(result.jobName).toBe('test-job-123');
      expect(result.created).toBe(true);

      // Verify the job was created with the correct script
      expect(mockCreateNamespacedJob).toHaveBeenCalledWith({
        namespace: 'test-namespace',
        body: expect.objectContaining({
          spec: expect.objectContaining({
            template: expect.objectContaining({
              spec: expect.objectContaining({
                containers: expect.arrayContaining([
                  expect.objectContaining({
                    args: expect.arrayContaining([
                      expect.stringContaining('=== Helm Chart Deployment ===')
                    ])
                  })
                ])
              })
            })
          })
        })
      });
    });

    it('should skip Helm deployment when HELM_CHART_PATH is not provided', async () => {
      const options = {
        name: 'test-pr-456',
        namespace: 'test-namespace',
        env: {
          REPO_URL: 'https://github.com/test/repo.git',
          PR_BRANCH: 'feature-branch',
          PR_NUMBER: '456',
          GITHUB_USER: 'testuser',
          IMAGE_NAME: 'test-repo/web',
          NEEDS_BUILD: 'true',
          TARGET_NAMESPACE: 'test-namespace'
          // No HELM_CHART_PATH provided
        }
      };

      const result = await createPullRequestPodJob(options);

      expect(result).toBeDefined();
      expect(result.created).toBe(true);

      // Get the script content from the call
      const callArgs = mockCreateNamespacedJob.mock.calls[0][0];
      const scriptContent = callArgs.body.spec.template.spec.containers[0].args[1];
      
      expect(scriptContent).toContain('⏭ No HELM_CHART_PATH provided, skipping Helm deployment');
    });

    it('should generate correct ingress hostname pattern', async () => {
      const options = {
        name: 'test-pr-789',
        namespace: 'test-namespace',
        env: {
          REPO_URL: 'https://github.com/test/my-app.git',
          PR_BRANCH: 'feature-branch',
          PR_NUMBER: '789',
          GITHUB_USER: 'testuser',
          IMAGE_NAME: 'my-app/web',
          NEEDS_BUILD: 'true',
          HELM_CHART_PATH: '/charts/nextjs',
          PRIMARY_HOSTNAME: 'dev.catalyst.example.com',
          PROJECT_NAME: 'my-app',
          TARGET_NAMESPACE: 'test-namespace'
        }
      };

      await createPullRequestPodJob(options);

      const callArgs = mockCreateNamespacedJob.mock.calls[0][0];
      const scriptContent = callArgs.body.spec.template.spec.containers[0].args[1];
      
      // Check that the script includes the expected ingress hostname pattern
      expect(scriptContent).toContain('my-app-pr-789.dev.catalyst.example.com');
      expect(scriptContent).toContain('helm upgrade --install');
      expect(scriptContent).toContain('--set ingress.enabled=true');
      expect(scriptContent).toContain('--set ingress.className=nginx');
      expect(scriptContent).toContain('wildcard-tls-secret');
    });
  });

  describe('cleanupPullRequestHelmRelease', () => {
    it('should create cleanup job with correct Helm release name', async () => {
      await cleanupPullRequestHelmRelease('my-app', 123, 'test-namespace');

      expect(mockCreateNamespacedJob).toHaveBeenCalledWith({
        namespace: 'test-namespace',
        body: expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'cleanup-helm-pr-123-my-app'
          }),
          spec: expect.objectContaining({
            template: expect.objectContaining({
              spec: expect.objectContaining({
                containers: expect.arrayContaining([
                  expect.objectContaining({
                    args: expect.arrayContaining([
                      expect.stringContaining('helm uninstall pr-123-my-app')
                    ])
                  })
                ])
              })
            })
          })
        })
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock the API to throw an error
      mockCreateNamespacedJob.mockRejectedValueOnce(new Error('API Error'));

      // Should not throw - cleanup should be graceful
      await expect(cleanupPullRequestHelmRelease('my-app', 123, 'test-namespace')).resolves.toBeUndefined();
    });
  });

  describe('Helm deployment script validation', () => {
    it('should include all required Helm set parameters', async () => {
      const options = {
        name: 'test-pr-validation',
        namespace: 'test-namespace',
        env: {
          REPO_URL: 'https://github.com/test/repo.git',
          PR_BRANCH: 'main',
          PR_NUMBER: '42',
          GITHUB_USER: 'testuser',
          IMAGE_NAME: 'repo/web',
          HELM_CHART_PATH: '/charts/nextjs',
          PRIMARY_HOSTNAME: 'dev.example.com',
          PROJECT_NAME: 'repo',
          TARGET_NAMESPACE: 'test-namespace'
        }
      };

      await createPullRequestPodJob(options);

      const callArgs = mockCreateNamespacedJob.mock.calls[0][0];
      const scriptContent = callArgs.body.spec.template.spec.containers[0].args[1];
      
      // Verify all required Helm set parameters are present
      const requiredHelmSets = [
        '--set ingress.enabled=true',
        '--set ingress.className=nginx',
        '--set "ingress.annotations.nginx\\.ingress\\.kubernetes\\.io/force-ssl-redirect=true"',
        '--set "ingress.hosts[0].host=',
        '--set "ingress.hosts[0].paths[0].path=/"',
        '--set "ingress.hosts[0].paths[0].pathType=Prefix"',
        '--set "ingress.tls[0].secretName=wildcard-tls-secret"',
        '--set "ingress.tls[0].hosts[0]=',
        '--set "image.repository=',
        '--set "image.tag=pr-42"',
        '--timeout 10m',
        '--wait'
      ];

      requiredHelmSets.forEach(helmSet => {
        expect(scriptContent).toContain(helmSet);
      });
    });
  });
});