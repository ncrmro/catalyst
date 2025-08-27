import { GET } from '../../src/app/api/kubernetes/deploy-nginx/route';

// Integration test for successful Kubernetes Deploy Nginx API endpoint
describe('Kubernetes Deploy Nginx Integration Test - Success Cases', () => {
  // Mock kubernetes client - we'll force success responses for these tests
  beforeEach(() => {
    // Set environment variables to indicate a working cluster
    process.env.K8S_AVAILABLE = 'true';
    
    // Mock Kubernetes client responses in the route handler
    jest.mock('../../src/lib/k8s-client', () => ({
      createDeployment: jest.fn().mockResolvedValue({
        name: 'nginx-deployment-12345',
        namespace: 'default',
        replicas: 1,
        timestamp: Date.now()
      })
    }));
  });

  afterEach(() => {
    // Clean up mocks and environment variables
    delete process.env.K8S_AVAILABLE;
    jest.resetModules();
    jest.resetAllMocks();
  });

  describe('GET /api/kubernetes/deploy-nginx - Success Integration', () => {
    it('should create nginx deployment successfully', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Nginx deployment created successfully');
      expect(data.deployment).toBeDefined();
      expect(data.deployment.name).toMatch(/^nginx-deployment-\d+$/);
      expect(data.deployment.namespace).toBe('default');
      expect(data.deployment.replicas).toBe(1);
      expect(data.deployment.timestamp).toBeGreaterThan(0);
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await GET();
      await response.json();
      
      const responseTime = Date.now() - startTime;

      // Successful deployments should be reasonably fast
      expect(responseTime).toBeLessThan(30000); // 30 seconds max
      expect(response.status).toBe(200);
    });

    it('should return consistent success response structure', async () => {
      const response = await GET();
      const data = await response.json();

      // Verify success case structure
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('deployment');
      expect(data.deployment).toHaveProperty('name');
      expect(data.deployment).toHaveProperty('namespace'); 
      expect(data.deployment).toHaveProperty('replicas');
      expect(data.deployment).toHaveProperty('timestamp');
      expect(data).not.toHaveProperty('error');
    });
    
    it('should create unique deployment names for each request', async () => {
      // Generate unique timestamps for each mock
      const mockK8sClient = require('../../src/lib/k8s-client');
      mockK8sClient.createDeployment
        .mockResolvedValueOnce({
          name: 'nginx-deployment-1001',
          namespace: 'default',
          replicas: 1,
          timestamp: Date.now()
        })
        .mockResolvedValueOnce({
          name: 'nginx-deployment-1002', 
          namespace: 'default',
          replicas: 1,
          timestamp: Date.now()
        })
        .mockResolvedValueOnce({
          name: 'nginx-deployment-1003',
          namespace: 'default',
          replicas: 1,
          timestamp: Date.now()
        });
      
      // Make three requests
      const response1 = await GET();
      const response2 = await GET();
      const response3 = await GET();
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();
      
      // Verify unique names
      const deploymentNames = [
        data1.deployment.name,
        data2.deployment.name,
        data3.deployment.name
      ];
      
      const uniqueNames = new Set(deploymentNames);
      expect(uniqueNames.size).toBe(deploymentNames.length);
    });
  });
});