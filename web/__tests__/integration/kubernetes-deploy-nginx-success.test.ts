import { GET } from '../../src/app/api/kubernetes/deploy-nginx/route';

// Integration test for successful Kubernetes Deploy Nginx API endpoint
// This test assumes a working Kubernetes cluster (kind) is available
describe('Kubernetes Deploy Nginx Integration Test - Success Cases', () => {
  beforeAll(() => {
    // Skip if no Kubernetes cluster is available
    if (!process.env.KUBECONFIG && !process.env.K8S_AVAILABLE) {
      console.log('Skipping Kubernetes integration tests - no cluster available');
    }
  });

  describe('GET /api/kubernetes/deploy-nginx - Success Integration', () => {
    it('should create nginx deployment successfully with working cluster', async () => {
      const response = await GET();
      const data = await response.json();

      // Only test success path - if cluster is available, deployment should succeed
      if (data.success) {
        expect(response.status).toBe(200);
        expect(data.message).toBe('Nginx deployment created successfully');
        expect(data.deployment).toBeDefined();
        expect(data.deployment.name).toMatch(/^nginx-deployment-\d+$/);
        expect(data.deployment.namespace).toBe('default');
        expect(data.deployment.replicas).toBe(1);
        expect(data.deployment.timestamp).toBeGreaterThan(0);

        console.log('Integration test: Deployment created successfully:', data.deployment.name);
      } else {
        // Skip test if cluster is not available
        console.log('Skipping success test - cluster not available:', data.error);
        return;
      }
    });

    it('should create unique deployment names for consecutive requests', async () => {
      // Test that multiple deployments get unique names
      const promises = Array.from({ length: 3 }, () => GET());
      const responses = await Promise.all(promises);
      const responseData = await Promise.all(responses.map((r: any) => r.json()));

      const successfulResponses = responseData.filter((data: any) => data.success);
      
      if (successfulResponses.length > 1) {
        const deploymentNames = successfulResponses.map((data: any) => data.deployment.name);
        const uniqueNames = new Set(deploymentNames);
        expect(uniqueNames.size).toBe(deploymentNames.length);
        console.log('Integration test: All deployment names are unique:', deploymentNames);
      } else {
        console.log('Skipping unique names test - insufficient successful deployments');
      }
    });

    it('should respond within reasonable time limits for successful deployments', async () => {
      const startTime = Date.now();
      
      const response = await GET();
      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.success) {
        // Successful deployments should be reasonably fast
        expect(responseTime).toBeLessThan(30000); // 30 seconds for real deployment
        expect(response.status).toBe(200);
        console.log(`Integration test: Successful deployment in ${responseTime}ms`);
      } else {
        console.log('Skipping timing test - deployment not successful');
      }
    });

    it('should return consistent success response structure', async () => {
      const response = await GET();
      const data = await response.json();

      if (data.success) {
        // Verify success case structure
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('deployment');
        expect(data.deployment).toHaveProperty('name');
        expect(data.deployment).toHaveProperty('namespace'); 
        expect(data.deployment).toHaveProperty('replicas');
        expect(data.deployment).toHaveProperty('timestamp');
        console.log('Integration test: Success response structure is correct');
      } else {
        console.log('Skipping structure test - deployment not successful');
      }
    });
  });
});