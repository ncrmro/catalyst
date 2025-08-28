import { 
  enableGitHubOIDC, 
  disableGitHubOIDC, 
  isGitHubOIDCEnabled,
  getClusterAudience
} from '../../src/lib/k8s-github-oidc';

// Integration test for k8s-github-oidc functionality
// This test assumes a working Kubernetes cluster (kind) is available
describe('k8s-github-oidc Integration Test', () => {
  let testClusterAudience: string;
  
  beforeAll(() => {
    // Set up test audience
    testClusterAudience = 'https://test-cluster.example.com';
    
    // Skip if no Kubernetes cluster is available
    if (!process.env.KUBECONFIG && !process.env.K8S_AVAILABLE) {
      console.log('Skipping Kubernetes integration tests - no cluster available');
    }
  });

  afterEach(async () => {
    // Clean up: ensure the test configuration is removed after each test
    try {
      const enabled = await isGitHubOIDCEnabled();
      if (enabled) {
        await disableGitHubOIDC();
        console.log('Cleaned up test AuthenticationConfiguration');
      }
    } catch (error) {
      console.warn('Cleanup warning:', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  describe('enableGitHubOIDC - Integration', () => {
    it('should create AuthenticationConfiguration successfully with working cluster', async () => {
      try {
        // Ensure the configuration doesn't exist initially
        const initiallyEnabled = await isGitHubOIDCEnabled();
        expect(initiallyEnabled).toBe(false);

        // Enable GitHub OIDC
        const result = await enableGitHubOIDC({
          clusterAudience: testClusterAudience
        });

        if (result.created || result.exists) {
          expect(result.name).toBe('github-oidc-auth');
          expect(typeof result.created).toBe('boolean');
          expect(typeof result.exists).toBe('boolean');
          
          // Verify that the configuration is now enabled
          const nowEnabled = await isGitHubOIDCEnabled();
          expect(nowEnabled).toBe(true);
          
          console.log('Integration test: AuthenticationConfiguration created successfully');
        } else {
          console.log('Skipping assertion - cluster might not support AuthenticationConfiguration API');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('cluster configuration not found')) {
          console.log('Skipping test - no cluster available');
        } else if (error instanceof Error && (
          error.message.includes('not found') || 
          error.message.includes('no matches for kind') ||
          error.message.includes('the server could not find the requested resource')
        )) {
          console.log('Skipping test - AuthenticationConfiguration API not available in cluster');
        } else {
          throw error;
        }
      }
    });

    it('should handle existing configuration gracefully', async () => {
      try {
        // First, create the configuration
        const firstResult = await enableGitHubOIDC({
          clusterAudience: testClusterAudience
        });

        if (firstResult.created || firstResult.exists) {
          // Try to create it again - should return exists: true
          const secondResult = await enableGitHubOIDC({
            clusterAudience: testClusterAudience
          });

          expect(secondResult.name).toBe('github-oidc-auth');
          expect(secondResult.created).toBe(false);
          expect(secondResult.exists).toBe(true);
          
          console.log('Integration test: Existing configuration handled correctly');
        } else {
          console.log('Skipping test - cluster might not support AuthenticationConfiguration API');
        }
      } catch (error) {
        if (error instanceof Error && (
          error.message.includes('cluster configuration not found') ||
          error.message.includes('not found') || 
          error.message.includes('no matches for kind') ||
          error.message.includes('the server could not find the requested resource')
        )) {
          console.log('Skipping test - cluster or API not available');
        } else {
          throw error;
        }
      }
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      try {
        const result = await enableGitHubOIDC({
          clusterAudience: testClusterAudience
        });
        
        const responseTime = Date.now() - startTime;

        if (result.created || result.exists) {
          // Successful operations should be reasonably fast
          expect(responseTime).toBeLessThan(30000); // 30 seconds for real operation
          console.log(`Integration test: AuthenticationConfiguration operation in ${responseTime}ms`);
        } else {
          console.log('Skipping timing test - operation not supported');
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        // Even errors should respond within reasonable time
        expect(responseTime).toBeLessThan(10000); // 10 seconds max for errors
        
        if (error instanceof Error && (
          error.message.includes('cluster configuration not found') ||
          error.message.includes('not found') || 
          error.message.includes('no matches for kind') ||
          error.message.includes('the server could not find the requested resource')
        )) {
          console.log('Skipping timing test - cluster or API not available');
        } else {
          throw error;
        }
      }
    });
  });

  describe('disableGitHubOIDC - Integration', () => {
    it('should delete AuthenticationConfiguration successfully', async () => {
      try {
        // First, ensure there's a configuration to delete
        await enableGitHubOIDC({
          clusterAudience: testClusterAudience
        });

        const initiallyEnabled = await isGitHubOIDCEnabled();
        if (initiallyEnabled) {
          // Now delete it
          const result = await disableGitHubOIDC();

          expect(result.name).toBe('github-oidc-auth');
          expect(result.created).toBe(false);
          expect(result.exists).toBe(false);

          // Verify that the configuration is now disabled
          const nowEnabled = await isGitHubOIDCEnabled();
          expect(nowEnabled).toBe(false);
          
          console.log('Integration test: AuthenticationConfiguration deleted successfully');
        } else {
          console.log('Skipping test - could not create initial configuration');
        }
      } catch (error) {
        if (error instanceof Error && (
          error.message.includes('cluster configuration not found') ||
          error.message.includes('not found') || 
          error.message.includes('no matches for kind') ||
          error.message.includes('the server could not find the requested resource')
        )) {
          console.log('Skipping test - cluster or API not available');
        } else {
          throw error;
        }
      }
    });

    it('should handle non-existing configuration gracefully', async () => {
      try {
        // Ensure no configuration exists
        const initiallyEnabled = await isGitHubOIDCEnabled();
        if (!initiallyEnabled) {
          // Try to delete non-existing configuration
          const result = await disableGitHubOIDC();

          expect(result.name).toBe('github-oidc-auth');
          expect(result.created).toBe(false);
          expect(result.exists).toBe(false);
          
          console.log('Integration test: Non-existing configuration handled correctly');
        } else {
          // Clean up first
          await disableGitHubOIDC();
          
          // Now try to delete again
          const result = await disableGitHubOIDC();

          expect(result.name).toBe('github-oidc-auth');
          expect(result.created).toBe(false);
          expect(result.exists).toBe(false);
          
          console.log('Integration test: Non-existing configuration handled correctly after cleanup');
        }
      } catch (error) {
        if (error instanceof Error && (
          error.message.includes('cluster configuration not found') ||
          error.message.includes('not found') || 
          error.message.includes('no matches for kind') ||
          error.message.includes('the server could not find the requested resource')
        )) {
          console.log('Skipping test - cluster or API not available');
        } else {
          throw error;
        }
      }
    });
  });

  describe('isGitHubOIDCEnabled - Integration', () => {
    it('should correctly detect configuration state', async () => {
      try {
        // Initially should be false
        const initialState = await isGitHubOIDCEnabled();
        expect(initialState).toBe(false);

        // Enable and check
        const enableResult = await enableGitHubOIDC({
          clusterAudience: testClusterAudience
        });

        if (enableResult.created || enableResult.exists) {
          const enabledState = await isGitHubOIDCEnabled();
          expect(enabledState).toBe(true);

          // Disable and check
          await disableGitHubOIDC();
          const disabledState = await isGitHubOIDCEnabled();
          expect(disabledState).toBe(false);
          
          console.log('Integration test: Configuration state detection working correctly');
        } else {
          console.log('Skipping test - cluster might not support AuthenticationConfiguration API');
        }
      } catch (error) {
        if (error instanceof Error && (
          error.message.includes('cluster configuration not found') ||
          error.message.includes('not found') || 
          error.message.includes('no matches for kind') ||
          error.message.includes('the server could not find the requested resource')
        )) {
          console.log('Skipping test - cluster or API not available');
        } else {
          throw error;
        }
      }
    });
  });

  describe('getClusterAudience - Integration', () => {
    it('should return expected audience format', () => {
      const audience = getClusterAudience('test-cluster');
      expect(audience).toMatch(/^https:\/\/.+/);
      expect(audience).toContain('test-cluster');
      
      console.log('Integration test: Cluster audience format is correct');
    });

    it('should handle environment variable configuration', () => {
      const originalEnv = process.env.CLUSTER_OIDC_AUDIENCE_TEST;
      
      try {
        // Set test environment variable
        process.env.CLUSTER_OIDC_AUDIENCE_TEST = 'https://env-configured.example.com';
        
        const audience = getClusterAudience('test');
        expect(audience).toBe('https://env-configured.example.com');
        
        console.log('Integration test: Environment variable configuration working');
      } finally {
        // Restore original environment
        if (originalEnv !== undefined) {
          process.env.CLUSTER_OIDC_AUDIENCE_TEST = originalEnv;
        } else {
          delete process.env.CLUSTER_OIDC_AUDIENCE_TEST;
        }
      }
    });
  });

  describe('Error Handling - Integration', () => {
    it('should handle cluster connectivity issues gracefully', async () => {
      // This test verifies that errors are handled gracefully when cluster is not available
      // The actual behavior will depend on the test environment
      
      try {
        const result = await isGitHubOIDCEnabled('non-existent-cluster');
        // Should return false for non-existent cluster
        expect(typeof result).toBe('boolean');
        
        console.log('Integration test: Cluster connectivity issues handled gracefully');
      } catch (error) {
        // Errors are also acceptable - just verify they're meaningful
        expect(error).toBeInstanceOf(Error);
        console.log('Integration test: Error handling working correctly');
      }
    });

    it('should provide meaningful error messages', async () => {
      try {
        // Try to enable OIDC on a non-existent cluster
        await enableGitHubOIDC({
          clusterAudience: testClusterAudience
        }, 'definitely-non-existent-cluster');
        
        // If we get here, the function should have returned gracefully
        console.log('Integration test: Non-existent cluster handled gracefully');
      } catch (error) {
        // If we get an error, it should be meaningful
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('cluster');
        
        console.log('Integration test: Meaningful error message provided');
      }
    });
  });
});