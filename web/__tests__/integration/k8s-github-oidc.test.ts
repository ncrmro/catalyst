/**
 * Integration test for GitHub OIDC Authentication Configuration using the PRIMARY Kubernetes cluster
 * 
 * This test verifies that we can create, read, update, and delete AuthenticationConfiguration
 * ConfigMaps in a real Kubernetes cluster to simulate GitHub OIDC functionality.
 * 
 * Note: This test requires a valid Kubernetes configuration available in the
 * KUBECONFIG_PRIMARY environment variable or from the default kubeconfig.
 */

import { 
  generateGitHubOIDCConfig,
  isGitHubOIDCEnabled,
  enableGitHubOIDC,
  disableGitHubOIDC,
  getClusterAudience
} from '../../src/lib/k8s-github-oidc';
import { getClusterConfig, getCoreV1Api } from '../../src/lib/k8s-client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

describe('GitHub OIDC Integration Tests', () => {
  const testClusterName = 'PRIMARY';
  const testAudience = 'https://test-integration.example.com';
  
  beforeAll(() => {
    // Verify KUBECONFIG_PRIMARY is set - test will fail if it's not defined
    expect(process.env.KUBECONFIG_PRIMARY).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup: Ensure the test ConfigMap is removed
    try {
      await disableGitHubOIDC(testClusterName);
    } catch (error) {
      // Ignore errors during cleanup
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Real Kubernetes API Integration', () => {
    it('should generate a valid AuthenticationConfiguration', () => {
      const config = generateGitHubOIDCConfig({
        clusterAudience: testAudience
      });

      expect(config).toBeDefined();
      expect(config.apiVersion).toBe('authentication.k8s.io/v1beta1');
      expect(config.kind).toBe('AuthenticationConfiguration');
      expect(config.jwt).toHaveLength(1);
      expect(config.jwt[0].issuer.url).toBe('https://token.actions.githubusercontent.com');
      expect(config.jwt[0].issuer.audiences).toContain(testAudience);
    });

    it('should check that GitHub OIDC is initially disabled', async () => {
      const enabled = await isGitHubOIDCEnabled(testClusterName);
      
      // Should be false initially (no ConfigMap exists)
      expect(enabled).toBe(false);
    });

    it('should enable GitHub OIDC by creating ConfigMap', async () => {
      const result = await enableGitHubOIDC({
        clusterAudience: testAudience
      }, testClusterName);

      expect(result).toBeDefined();
      expect(result.name).toBe('github-oidc-auth');
      expect(result.created).toBe(true);
      expect(result.exists).toBe(false);
    });

    it('should detect that GitHub OIDC is now enabled', async () => {
      const enabled = await isGitHubOIDCEnabled(testClusterName);
      
      // Should be true now (ConfigMap exists)
      expect(enabled).toBe(true);
    });

    it('should verify ConfigMap contains correct data', async () => {
      const kc = await getClusterConfig(testClusterName);
      expect(kc).not.toBeNull();

      const CoreV1Api = await getCoreV1Api();
      const k8sApi = kc!.makeApiClient(CoreV1Api);

      const response = await k8sApi.readNamespacedConfigMap({
        name: 'github-oidc-auth-config',
        namespace: 'kube-system'
      });

      expect(response).toBeDefined();
      expect(response.metadata?.name).toBe('github-oidc-auth-config');
      expect(response.metadata?.namespace).toBe('kube-system');
      expect(response.metadata?.labels?.['app.kubernetes.io/name']).toBe('github-oidc-auth');
      expect(response.metadata?.labels?.['app.kubernetes.io/managed-by']).toBe('catalyst');
      
      // Verify data contains our configuration
      expect(response.data?.['cluster-audience']).toBe(testAudience);
      expect(response.data?.['enabled']).toBe('true');
      expect(response.data?.['authentication-config.yaml']).toBeDefined();
      expect(response.data?.['created-at']).toBeDefined();
      
      // Verify the YAML configuration is valid
      const yamlContent = response.data?.['authentication-config.yaml'];
      expect(yamlContent).toContain('authentication.k8s.io/v1beta1');
      expect(yamlContent).toContain('AuthenticationConfiguration');
      expect(yamlContent).toContain('https://token.actions.githubusercontent.com');
      expect(yamlContent).toContain(testAudience);
    });

    it('should update existing ConfigMap when enabled again', async () => {
      const newAudience = 'https://updated-test.example.com';
      
      const result = await enableGitHubOIDC({
        clusterAudience: newAudience
      }, testClusterName);

      expect(result).toBeDefined();
      expect(result.name).toBe('github-oidc-auth');
      expect(result.created).toBe(false); // Not created, updated
      expect(result.exists).toBe(true);   // Already existed
      
      // Verify the ConfigMap was updated with new audience
      const kc = await getClusterConfig(testClusterName);
      const CoreV1Api = await getCoreV1Api();
      const k8sApi = kc!.makeApiClient(CoreV1Api);

      const response = await k8sApi.readNamespacedConfigMap({
        name: 'github-oidc-auth-config',
        namespace: 'kube-system'
      });

      expect(response.data?.['cluster-audience']).toBe(newAudience);
      
      // Verify YAML content was updated
      const yamlContent = response.data?.['authentication-config.yaml'];
      expect(yamlContent).toContain(newAudience);
    });

    it('should disable GitHub OIDC by deleting ConfigMap', async () => {
      const result = await disableGitHubOIDC(testClusterName);

      expect(result).toBeDefined();
      expect(result.name).toBe('github-oidc-auth');
      expect(result.created).toBe(false);
      expect(result.exists).toBe(false);
    });

    it('should confirm GitHub OIDC is disabled after deletion', async () => {
      const enabled = await isGitHubOIDCEnabled(testClusterName);
      
      // Should be false again (ConfigMap deleted)
      expect(enabled).toBe(false);
    });

    it('should handle disabling when already disabled', async () => {
      // Try to disable again when already disabled
      const result = await disableGitHubOIDC(testClusterName);

      expect(result).toBeDefined();
      expect(result.name).toBe('github-oidc-auth');
      expect(result.created).toBe(false);
      expect(result.exists).toBe(false);
      
      // Should not throw an error
    });

    it('should verify ConfigMap no longer exists', async () => {
      const kc = await getClusterConfig(testClusterName);
      const CoreV1Api = await getCoreV1Api();
      const k8sApi = kc!.makeApiClient(CoreV1Api);

      await expect(
        k8sApi.readNamespacedConfigMap({
          name: 'github-oidc-auth-config',
          namespace: 'kube-system'
        })
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cluster configuration gracefully', async () => {
      await expect(
        enableGitHubOIDC({
          clusterAudience: testAudience
        }, 'NONEXISTENT')
      ).rejects.toThrow('Kubernetes cluster "NONEXISTENT" not found');
    });

    it('should handle cluster config check for non-existent cluster', async () => {
      await expect(
        isGitHubOIDCEnabled('NONEXISTENT')
      ).rejects.toThrow('Kubernetes cluster "NONEXISTENT" not found');
    });
  });

  describe('Cluster Audience Configuration', () => {
    it('should use environment variable for cluster audience', () => {
      const originalEnv = process.env.CLUSTER_OIDC_AUDIENCE_PRIMARY;
      
      try {
        process.env.CLUSTER_OIDC_AUDIENCE_PRIMARY = 'https://env-configured.example.com';
        
        const audience = getClusterAudience('PRIMARY');
        expect(audience).toBe('https://env-configured.example.com');
      } finally {
        if (originalEnv) {
          process.env.CLUSTER_OIDC_AUDIENCE_PRIMARY = originalEnv;
        } else {
          delete process.env.CLUSTER_OIDC_AUDIENCE_PRIMARY;
        }
      }
    });

    it('should fall back to default audience pattern', () => {
      const audience = getClusterAudience('test-cluster');
      expect(audience).toBe('https://test-cluster.example.com');
    });
  });
});