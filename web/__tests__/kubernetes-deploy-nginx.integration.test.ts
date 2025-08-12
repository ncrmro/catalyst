import { GET } from '../src/app/api/kubernetes/deploy-nginx/route';

// Integration test for Kubernetes Deploy Nginx API endpoint
// This integration test imports and calls the actual route handler
// Unlike unit tests, this doesn't mock the Kubernetes client and tests real error handling
describe('Kubernetes Deploy Nginx Integration Test', () => {

  describe('GET /api/kubernetes/deploy-nginx - Integration Test', () => {
    it('should respond with proper JSON structure regardless of success or failure', async () => {
      const response = await GET();
      const data = await response.json();

      // The response should have a proper JSON structure
      expect(data).toBeDefined();
      expect(typeof data.success).toBe('boolean');

      if (data.success) {
        // If successful (unlikely in CI but possible in dev environments with k8s)
        expect(response.status).toBe(200);
        expect(data.message).toBe('Nginx deployment created successfully');
        expect(data.deployment).toBeDefined();
        expect(data.deployment.name).toMatch(/^nginx-deployment-\d+$/);
        expect(data.deployment.namespace).toBe('default');
        expect(data.deployment.replicas).toBe(1);
        expect(data.deployment.timestamp).toBeGreaterThan(0);

        console.log('Integration test: Deployment created successfully:', data.deployment.name);
      } else {
        // Expected behavior in CI environments without Kubernetes
        expect(response.status).toBeGreaterThanOrEqual(401);
        expect(data.error).toBeDefined();

        // Common expected error messages when k8s is not available
        const expectedErrorTypes = [
          'Failed to load Kubernetes configuration',
          'Cannot connect to Kubernetes cluster', 
          'Unauthorized to access Kubernetes cluster',
          'ECONNREFUSED',
          'ENOTFOUND'
        ];

        const hasExpectedError = expectedErrorTypes.some(errorType => 
          data.error.includes(errorType)
        );

        expect(hasExpectedError).toBe(true);
        console.log('Integration test: Expected Kubernetes unavailable error:', data.error);
      }
    });

    it('should handle multiple consecutive requests properly', async () => {
      // Test that the endpoint can handle multiple requests
      const promises = Array.from({ length: 3 }, () => GET());

      const responses = await Promise.all(promises);
      const responseData = await Promise.all(responses.map((r: any) => r.json()));

      responseData.forEach((data, index) => {
        expect(data).toBeDefined();
        expect(typeof data.success).toBe('boolean');
        
        if (data.success) {
          // Each deployment should have a unique name with different timestamps
          expect(data.deployment.name).toMatch(/^nginx-deployment-\d+$/);
          console.log(`Request ${index + 1}: Deployment created:`, data.deployment.name);
        } else {
          // All should fail with similar errors in CI
          expect(data.error).toBeDefined();
          console.log(`Request ${index + 1}: Expected error:`, data.error);
        }
      });

      // If successful, verify that deployment names are unique
      const successfulResponses = responseData.filter((data: any) => data.success);
      if (successfulResponses.length > 1) {
        const deploymentNames = successfulResponses.map((data: any) => data.deployment.name);
        const uniqueNames = new Set(deploymentNames);
        expect(uniqueNames.size).toBe(deploymentNames.length);
        console.log('Integration test: All deployment names are unique:', deploymentNames);
      }
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await GET();
      const data = await response.json();

      const responseTime = Date.now() - startTime;

      // API should respond within 10 seconds even in error cases
      expect(responseTime).toBeLessThan(10000);
      expect(data).toBeDefined();
      expect(typeof data.success).toBe('boolean');

      console.log(`Integration test: API responded in ${responseTime}ms`);
    });

    it('should maintain consistent response format across different scenarios', async () => {
      const response = await GET();
      const data = await response.json();

      // Verify consistent response structure
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.success) {
        // Success case structure
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('deployment');
        expect(data.deployment).toHaveProperty('name');
        expect(data.deployment).toHaveProperty('namespace'); 
        expect(data.deployment).toHaveProperty('replicas');
        expect(data.deployment).toHaveProperty('timestamp');
      } else {
        // Error case structure
        expect(data).toHaveProperty('error');
        expect(data.error).toBeTruthy();
        expect(typeof data.error).toBe('string');
      }

      console.log('Integration test: Response structure is consistent');
    });
  });
});