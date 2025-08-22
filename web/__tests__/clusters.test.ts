// Mock the kubernetes client module
jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromString: jest.fn(),
    loadFromDefault: jest.fn(),
    getCurrentContext: jest.fn(() => 'test-context'),
    getCurrentCluster: jest.fn(() => ({ server: 'https://test-server:6443' })),
    makeApiClient: jest.fn()
  }))
}));

import { KubeConfig } from '@/lib/k8s-client';
import { getClusters } from '@/actions/clusters';

describe('Kubernetes Client Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load kubeconfig from environment variable', async () => {
    // Mock kubeconfig data
    const mockKubeConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [
        {
          name: 'test-cluster',
          cluster: {
            server: 'https://test-server:6443',
            'certificate-authority-data': 'dGVzdA=='
          }
        }
      ],
      contexts: [
        {
          name: 'test-context',
          context: {
            cluster: 'test-cluster',
            user: 'test-user'
          }
        }
      ],
      'current-context': 'test-context',
      users: [
        {
          name: 'test-user',
          user: {
            'client-certificate-data': 'dGVzdA==',
            'client-key-data': 'dGVzdA=='
          }
        }
      ]
    };

    // Set environment variable with base64 encoded kubeconfig
    const base64Config = Buffer.from(JSON.stringify(mockKubeConfig)).toString('base64');
    process.env.KUBECONFIG_PRIMARY = base64Config;

    const kubeConfig = new KubeConfig();
    
    // This should not throw an error for loading from env var
    await expect(kubeConfig.loadFromEnvVar('KUBECONFIG_PRIMARY')).resolves.not.toThrow();
    
    // Get cluster info should work after loading
    const clusterInfo = kubeConfig.getClusterInfo();
    expect(clusterInfo.name).toBe('test-context');
    expect(clusterInfo.endpoint).toBe('https://test-server:6443');
  });

  it('should handle missing environment variable', async () => {
    const kubeConfig = new KubeConfig();
    
    await expect(kubeConfig.loadFromEnvVar('KUBECONFIG_NONEXISTENT')).rejects.toThrow(
      'Environment variable KUBECONFIG_NONEXISTENT not found'
    );
  });

  it('should handle invalid base64 data', async () => {
    process.env.KUBECONFIG_INVALID = 'invalid-base64!@#';
    
    const kubeConfig = new KubeConfig();
    
    await expect(kubeConfig.loadFromEnvVar('KUBECONFIG_INVALID')).rejects.toThrow(
      /Failed to decode kubeconfig from KUBECONFIG_INVALID/
    );
  });

  it('should handle invalid JSON data', async () => {
    // Set environment variable with base64 encoded invalid JSON
    const invalidJson = Buffer.from('invalid json{').toString('base64');
    process.env.KUBECONFIG_INVALID_JSON = invalidJson;
    
    const kubeConfig = new KubeConfig();
    
    await expect(kubeConfig.loadFromEnvVar('KUBECONFIG_INVALID_JSON')).rejects.toThrow(
      /Failed to decode kubeconfig from KUBECONFIG_INVALID_JSON/
    );
  });

  it('getClusters should return clusters from environment variables', async () => {
    // Mock kubeconfig data for multiple clusters
    const primaryConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [{ name: 'primary-cluster', cluster: { server: 'https://primary:6443' } }],
      contexts: [{ name: 'primary-context', context: { cluster: 'primary-cluster', user: 'primary-user' } }],
      'current-context': 'primary-context',
      users: [{ name: 'primary-user', user: { 'client-certificate-data': 'dGVzdA==', 'client-key-data': 'dGVzdA==' } }]
    };

    const fooConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [{ name: 'foo-cluster', cluster: { server: 'https://foo:6443' } }],
      contexts: [{ name: 'foo-context', context: { cluster: 'foo-cluster', user: 'foo-user' } }],
      'current-context': 'foo-context',
      users: [{ name: 'foo-user', user: { 'client-certificate-data': 'dGVzdA==', 'client-key-data': 'dGVzdA==' } }]
    };

    // Set environment variables
    process.env.KUBECONFIG_PRIMARY = Buffer.from(JSON.stringify(primaryConfig)).toString('base64');
    process.env.KUBECONFIG_FOO = Buffer.from(JSON.stringify(fooConfig)).toString('base64');

    const clusters = await getClusters();
    
    // With our mocked KubeConfig, we should get 2 clusters with mocked data
    expect(clusters).toHaveLength(2);
    expect(clusters[0].name).toBe('test-context'); // This is what our mock returns
    expect(clusters[0].endpoint).toBe('https://test-server:6443'); // This is what our mock returns
    expect(clusters[0].source).toBe('KUBECONFIG_PRIMARY');
    
    expect(clusters[1].name).toBe('test-context'); // This is what our mock returns
    expect(clusters[1].endpoint).toBe('https://test-server:6443'); // This is what our mock returns
    expect(clusters[1].source).toBe('KUBECONFIG_FOO');
  });
});