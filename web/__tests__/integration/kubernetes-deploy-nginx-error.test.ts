import { GET } from '../../src/app/api/kubernetes/deploy-nginx/route';

// Integration test for error cases in Kubernetes Deploy Nginx API endpoint
// This test focuses on testing error handling when Kubernetes is not available
describe('Kubernetes Deploy Nginx Integration Test - Error Cases', () => {
  let originalKubeconfig;

  beforeEach(() => {
    // Save original kubeconfig
    originalKubeconfig = process.env.KUBECONFIG;
    
    // Force error by setting invalid kubeconfig
    process.env.KUBECONFIG = '/invalid/path/to/kubeconfig';
  });

  afterEach(() => {
    // Restore original environment after each test
    if (originalKubeconfig) {
      process.env.KUBECONFIG = originalKubeconfig;
    } else {
      delete process.env.KUBECONFIG;
    }
  });

  describe('GET /api/kubernetes/deploy-nginx - Error Integration', () => {
    it('should handle kubernetes client errors gracefully', async () => {
      const response = await GET();
      const data = await response.json();

      // Always test error conditions
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });

    it('should return consistent error response structure', async () => {
      const response = await GET();
      const data = await response.json();

      // Verify error response structure
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('string');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should respond within reasonable time limits for errors', async () => {
      const startTime = Date.now();
      
      const response = await GET();
      await response.json();
      
      const responseTime = Date.now() - startTime;

      // Errors should respond quickly
      expect(responseTime).toBeLessThan(10000); // 10 seconds max for errors
    });

    it('should include error details in response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error.length).toBeGreaterThan(0);
      expect(data).not.toHaveProperty('deployment');
    });
  });
});