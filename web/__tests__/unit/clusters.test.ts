import { vi } from 'vitest';

// Mock the kubernetes client module
vi.mock('@kubernetes/client-node', () => {
  return {
    KubeConfig: class {
      loadFromString = vi.fn();
      loadFromDefault = vi.fn();
      loadFromEnvVar = vi.fn(async (envVar) => {
        // Mock implementation of loadFromEnvVar logic if needed, 
        // or just rely on loadFromString if the real class calls it.
        // But since we are mocking the class, we need to replicate behavior or spy on it?
        // Wait, the test uses the REAL KubeConfig wrapper from @/lib/k8s-client?
        // Yes. So we are mocking the underlying @kubernetes/client-node library.
        // The real wrapper calls `new k8s.KubeConfig()`.
        // So we need to provide a class.
      });
      getCurrentContext = vi.fn(() => 'test-context');
      getCurrentCluster = vi.fn(() => ({ server: 'https://test-server:6443' }));
      makeApiClient = vi.fn();
    }
  };
});

import { KubeConfig, resetKubeConfigRegistry } from '@/lib/k8s-client';
import { getClusters } from '@/actions/clusters';

describe('Kubernetes Client Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear any existing KUBECONFIG_* variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('KUBECONFIG_')) {
        delete process.env[key];
      }
    });
    // Reset the registry for each test
    resetKubeConfigRegistry();
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

  it('getClusters should dynamically discover all KUBECONFIG_* environment variables', async () => {
    // Mock kubeconfig data for various clusters with different naming patterns
    const testConfigs = {
      KUBECONFIG_PRIMARY: {
        apiVersion: 'v1',
        kind: 'Config',
        clusters: [{ name: 'primary-cluster', cluster: { server: 'https://primary:6443' } }],
        contexts: [{ name: 'primary-context', context: { cluster: 'primary-cluster', user: 'primary-user' } }],
        'current-context': 'primary-context',
        users: [{ name: 'primary-user', user: { 'client-certificate-data': 'dGVzdA==', 'client-key-data': 'dGVzdA==' } }]
      },
      KUBECONFIG_STAGING: {
        apiVersion: 'v1',
        kind: 'Config',
        clusters: [{ name: 'staging-cluster', cluster: { server: 'https://staging:6443' } }],
        contexts: [{ name: 'staging-context', context: { cluster: 'staging-cluster', user: 'staging-user' } }],
        'current-context': 'staging-context',
        users: [{ name: 'staging-user', user: { 'client-certificate-data': 'dGVzdA==', 'client-key-data': 'dGVzdA==' } }]
      },
      KUBECONFIG_PRODUCTION: {
        apiVersion: 'v1',
        kind: 'Config',
        clusters: [{ name: 'production-cluster', cluster: { server: 'https://production:6443' } }],
        contexts: [{ name: 'production-context', context: { cluster: 'production-cluster', user: 'production-user' } }],
        'current-context': 'production-context',
        users: [{ name: 'production-user', user: { 'client-certificate-data': 'dGVzdA==', 'client-key-data': 'dGVzdA==' } }]
      }
    };

    // Set environment variables dynamically
    Object.entries(testConfigs).forEach(([envVar, config]) => {
      process.env[envVar] = Buffer.from(JSON.stringify(config)).toString('base64');
    });

    // Also set some non-KUBECONFIG variables to ensure they're ignored
    process.env.SOME_OTHER_VAR = 'should-be-ignored';
    process.env.KUBECONFIG = 'this-should-be-ignored-too';

    const clusters = await getClusters();
    
    // Should discover all 3 KUBECONFIG_* variables dynamically
    expect(clusters).toHaveLength(3);
    
    // Check that sources are properly identified with the suffix
    const sources = clusters.map(c => c.source).sort();
    expect(sources).toEqual(['KUBECONFIG_PRIMARY', 'KUBECONFIG_PRODUCTION', 'KUBECONFIG_STAGING']);
    
    // Each cluster should have the mocked data (our mock always returns the same values)
    clusters.forEach(cluster => {
      expect(cluster.name).toBe('test-context');
      expect(cluster.endpoint).toBe('https://test-server:6443');
    });
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
    
    // Check that we have both clusters (order determined by alphabetical sorting of env var names)
    const sources = clusters.map(c => c.source).sort();
    expect(sources).toEqual(['KUBECONFIG_FOO', 'KUBECONFIG_PRIMARY']);
    
    // Each cluster should have the mocked data (our mock always returns the same values)
    clusters.forEach(cluster => {
      expect(cluster.name).toBe('test-context');
      expect(cluster.endpoint).toBe('https://test-server:6443');
    });
  });
});