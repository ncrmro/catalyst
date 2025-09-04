import { 
  generateGitHubOIDCConfig, 
  getClusterAudience, 
  isGitHubOIDCEnabled,
  enableGitHubOIDC,
  disableGitHubOIDC
} from '../../src/lib/k8s-github-oidc';
import { vi } from 'vitest';

// Mock the k8s-client module
vi.mock('../../src/lib/k8s-client', () => ({
  getClusterConfig: vi.fn(),
  getCoreV1Api: vi.fn(),
}));

import { getClusterConfig, getCoreV1Api } from '../../src/lib/k8s-client';
const mockGetClusterConfig = getClusterConfig as ReturnType<typeof vi.fn>;
const mockGetCoreV1Api = getCoreV1Api as ReturnType<typeof vi.fn>;

describe('k8s-github-oidc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('generateGitHubOIDCConfig', () => {
    it('should generate a valid AuthenticationConfiguration', () => {
      const config = generateGitHubOIDCConfig({
        clusterAudience: 'https://test.cluster.example.com'
      });

      expect(config).toEqual({
        apiVersion: 'authentication.k8s.io/v1beta1',
        kind: 'AuthenticationConfiguration',
        jwt: [
          {
            issuer: {
              url: 'https://token.actions.githubusercontent.com',
              audiences: ['https://test.cluster.example.com'],
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
      });
    });
  });

  describe('getClusterAudience', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default audience for cluster', () => {
      const audience = getClusterAudience('test-cluster');
      expect(audience).toBe('https://test-cluster.example.com');
    });

    it('should return configured audience from environment variable', () => {
      process.env.CLUSTER_OIDC_AUDIENCE_TEST = 'https://configured.audience.com';
      const audience = getClusterAudience('test');
      expect(audience).toBe('https://configured.audience.com');
    });

    it('should return default audience when no cluster name provided', () => {
      const audience = getClusterAudience();
      expect(audience).toBe('https://cluster.example.com');
    });
  });

  describe('isGitHubOIDCEnabled', () => {
    it('should return false by default', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      const enabled = await isGitHubOIDCEnabled();
      expect(enabled).toBe(false);
    });

    it('should return false for specific cluster', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      const enabled = await isGitHubOIDCEnabled('test-cluster');
      expect(enabled).toBe(false);
    });

    it('should return true when ConfigMap exists', async () => {
      const mockK8sApi = {
        readNamespacedConfigMap: vi.fn().mockResolvedValue({ metadata: { name: 'github-oidc-auth-config' } }),
      };
      const mockKubeConfig = { makeApiClient: vi.fn().mockReturnValue(mockK8sApi) };
      const mockCoreV1Api = function() { return mockK8sApi; };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCoreV1Api.mockResolvedValue(mockCoreV1Api);
      
      const enabled = await isGitHubOIDCEnabled('test-cluster');
      expect(enabled).toBe(true);
      
      expect(mockK8sApi.readNamespacedConfigMap).toHaveBeenCalledWith({
        name: 'github-oidc-auth-config',
        namespace: 'kube-system'
      });
    });

    it('should return false when ConfigMap does not exist', async () => {
      const mockK8sApi = {
        readNamespacedConfigMap: vi.fn().mockRejectedValue({ code: 404 }),
      };
      const mockKubeConfig = { makeApiClient: vi.fn().mockReturnValue(mockK8sApi) };
      const mockCoreV1Api = function() { return mockK8sApi; };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCoreV1Api.mockResolvedValue(mockCoreV1Api);
      
      const enabled = await isGitHubOIDCEnabled('test-cluster');
      expect(enabled).toBe(false);
    });
  });

  describe('enableGitHubOIDC', () => {
    it('should return success result', async () => {
      const mockK8sApi = {
        readNamespacedConfigMap: vi.fn().mockRejectedValue({ code: 404 }),
        createNamespacedConfigMap: vi.fn().mockResolvedValue({}),
      };
      const mockKubeConfig = { makeApiClient: vi.fn().mockReturnValue(mockK8sApi) };
      const mockCoreV1Api = function() { return mockK8sApi; };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCoreV1Api.mockResolvedValue(mockCoreV1Api);
      
      const result = await enableGitHubOIDC({
        clusterAudience: 'https://test.cluster.example.com'
      });

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: true,
        exists: false
      });
      
      expect(mockK8sApi.createNamespacedConfigMap).toHaveBeenCalledWith({
        namespace: 'kube-system',
        body: expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'github-oidc-auth-config'
          })
        })
      });
    });

    it('should throw error when no cluster config available', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      
      await expect(enableGitHubOIDC({
        clusterAudience: 'https://test.cluster.example.com'
      })).rejects.toThrow('Kubernetes cluster configuration not found. No clusters available.');
    });

    it('should update existing ConfigMap when it already exists', async () => {
      const mockK8sApi = {
        readNamespacedConfigMap: vi.fn().mockResolvedValue({ metadata: { name: 'github-oidc-auth-config' } }),
        replaceNamespacedConfigMap: vi.fn().mockResolvedValue({}),
      };
      const mockKubeConfig = { makeApiClient: vi.fn().mockReturnValue(mockK8sApi) };
      const mockCoreV1Api = function() { return mockK8sApi; };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCoreV1Api.mockResolvedValue(mockCoreV1Api);
      
      const result = await enableGitHubOIDC({
        clusterAudience: 'https://test.cluster.example.com'
      });

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: false,
        exists: true
      });
      
      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalled();
    });
  });

  describe('disableGitHubOIDC', () => {
    it('should return success result', async () => {
      const mockK8sApi = {
        deleteNamespacedConfigMap: vi.fn().mockResolvedValue({}),
      };
      const mockKubeConfig = { makeApiClient: vi.fn().mockReturnValue(mockK8sApi) };
      const mockCoreV1Api = function() { return mockK8sApi; };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCoreV1Api.mockResolvedValue(mockCoreV1Api);
      
      const result = await disableGitHubOIDC();

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: false,
        exists: false
      });
      
      expect(mockK8sApi.deleteNamespacedConfigMap).toHaveBeenCalledWith({
        name: 'github-oidc-auth-config',
        namespace: 'kube-system'
      });
    });

    it('should throw error when no cluster config available', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      
      await expect(disableGitHubOIDC()).rejects.toThrow('Kubernetes cluster configuration not found. No clusters available.');
    });

    it('should handle ConfigMap already deleted', async () => {
      const mockK8sApi = {
        deleteNamespacedConfigMap: vi.fn().mockRejectedValue({ code: 404 }),
      };
      const mockKubeConfig = { makeApiClient: vi.fn().mockReturnValue(mockK8sApi) };
      const mockCoreV1Api = function() { return mockK8sApi; };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCoreV1Api.mockResolvedValue(mockCoreV1Api);
      
      const result = await disableGitHubOIDC();

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: false,
        exists: false
      });
    });
  });
});