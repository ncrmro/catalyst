import { 
  generateGitHubOIDCConfig, 
  getClusterAudience, 
  isGitHubOIDCEnabled,
  enableGitHubOIDC,
  disableGitHubOIDC
} from '../../src/lib/k8s-github-oidc';

// Mock the k8s-client module
jest.mock('../../src/lib/k8s-client', () => ({
  getClusterConfig: jest.fn(),
  getCustomObjectsApi: jest.fn(),
}));

import { getClusterConfig, getCustomObjectsApi } from '../../src/lib/k8s-client';
const mockGetClusterConfig = getClusterConfig as jest.MockedFunction<typeof getClusterConfig>;
const mockGe

describe('k8s-github-oidc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      jest.resetModules();
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
    it('should return false when no cluster config available', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      const enabled = await isGitHubOIDCEnabled();
      expect(enabled).toBe(false);
    });

    it('should return false when configuration does not exist', async () => {
      const mockKubeConfig = { makeApiClient: jest.fn() };
      const mockCustomObjectsApi = {
        getClusterCustomObject: jest.fn().mockRejectedValue({ code: 404 }),
      };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCustomObjectsApi.mockResolvedValue(() => mockCustomObjectsApi);
      mockKubeConfig.makeApiClient.mockReturnValue(mockCustomObjectsApi);
      
      const enabled = await isGitHubOIDCEnabled('test-cluster');
      expect(enabled).toBe(false);
    });

    it('should return true when configuration exists', async () => {
      const mockKubeConfig = { makeApiClient: jest.fn() };
      const mockCustomObjectsApi = {
        getClusterCustomObject: jest.fn().mockResolvedValue({}),
      };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCustomObjectsApi.mockResolvedValue(() => mockCustomObjectsApi);
      mockKubeConfig.makeApiClient.mockReturnValue(mockCustomObjectsApi);
      
      const enabled = await isGitHubOIDCEnabled('test-cluster');
      expect(enabled).toBe(true);
    });
    it('should return false for specific cluster', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      const enabled = await isGitHubOIDCEnabled('test-cluster');
      expect(enabled).toBe(false);
    });
  });

  describe('enableGitHubOIDC', () => {
    it('should return success result', async () => {
      const mockKubeConfig = { makeApiClient: jest.fn() };
      const mockCustomObjectsApi = {
        getClusterCustomObject: jest.fn().mockRejectedValue({ code: 404 }),
        createClusterCustomObject: jest.fn().mockResolvedValue({}),
      };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCustomObjectsApi.mockResolvedValue(() => mockCustomObjectsApi);
      mockKubeConfig.makeApiClient.mockReturnValue(mockCustomObjectsApi);
      
      const result = await enableGitHubOIDC({
        clusterAudience: 'https://test.cluster.example.com'
      });

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: true,
        exists: false
      });
    });

    it('should return exists result if configuration already exists', async () => {
      const mockKubeConfig = { makeApiClient: jest.fn() };
      const mockCustomObjectsApi = {
        getClusterCustomObject: jest.fn().mockResolvedValue({}),
      };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCustomObjectsApi.mockResolvedValue(() => mockCustomObjectsApi);
      mockKubeConfig.makeApiClient.mockReturnValue(mockCustomObjectsApi);
      
      const result = await enableGitHubOIDC({
        clusterAudience: 'https://test.cluster.example.com'
      });

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: false,
        exists: true
      });
    });

    it('should throw error when no cluster config available', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      
      await expect(enableGitHubOIDC({
        clusterAudience: 'https://test.cluster.example.com'
      })).rejects.toThrow('Kubernetes cluster configuration not found. No clusters available.');
    });
  });

  describe('disableGitHubOIDC', () => {
    it('should return success result', async () => {
      const mockKubeConfig = { makeApiClient: jest.fn() };
      const mockCustomObjectsApi = {
        getClusterCustomObject: jest.fn().mockResolvedValue({}),
        deleteClusterCustomObject: jest.fn().mockResolvedValue({}),
      };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCustomObjectsApi.mockResolvedValue(() => mockCustomObjectsApi);
      mockKubeConfig.makeApiClient.mockReturnValue(mockCustomObjectsApi);
      
      const result = await disableGitHubOIDC();

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: false,
        exists: false
      });
    });

    it('should return not exists result if configuration does not exist', async () => {
      const mockKubeConfig = { makeApiClient: jest.fn() };
      const mockCustomObjectsApi = {
        getClusterCustomObject: jest.fn().mockRejectedValue({ code: 404 }),
      };
      
      mockGetClusterConfig.mockResolvedValue(mockKubeConfig as any);
      mockGetCustomObjectsApi.mockResolvedValue(() => mockCustomObjectsApi);
      mockKubeConfig.makeApiClient.mockReturnValue(mockCustomObjectsApi);
      
      const result = await disableGitHubOIDC();

      expect(result).toEqual({
        name: 'github-oidc-auth',
        created: false,
        exists: false
      });
    });

    it('should throw error when no cluster config available', async () => {
      mockGetClusterConfig.mockResolvedValue(null);
      
      await expect(disableGitHubOIDC()).rejects.toThrow('Kubernetes cluster configuration not found. No clusters available.');
    });
  });
});