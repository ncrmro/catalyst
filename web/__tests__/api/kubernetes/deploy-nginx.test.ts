import { createMocks } from 'node-mocks-http';
import { GET } from '../../../src/app/api/kubernetes/deploy-nginx/route';

// Use the manual mock
const k8s = require('@kubernetes/client-node');

describe('/api/kubernetes/deploy-nginx', () => {
  let mockKubeConfig: any;
  let mockK8sApi: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock implementations
    mockK8sApi = {
      createNamespacedDeployment: jest.fn(),
    };

    mockKubeConfig = {
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn().mockReturnValue(mockK8sApi),
    };

    // Mock the constructor to return our mock
    k8s.KubeConfig.mockImplementation(() => mockKubeConfig);
  });

  describe('GET', () => {
    it('should successfully create nginx deployment', async () => {
      // Mock successful Kubernetes API response
      const mockResponse = {
        metadata: {
          name: 'nginx-deployment-123456789',
          namespace: 'default'
        },
        spec: {
          replicas: 1
        }
      };

      mockK8sApi.createNamespacedDeployment.mockResolvedValue(mockResponse as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Nginx deployment created successfully');
      expect(data.deployment).toMatchObject({
        namespace: 'default',
        replicas: 1
      });
      expect(data.deployment.name).toMatch(/^nginx-deployment-\d+$/);
      expect(data.deployment.timestamp).toBeGreaterThan(0);

      // Verify Kubernetes API was called correctly
      expect(mockKubeConfig.loadFromDefault).toHaveBeenCalledTimes(1);
      expect(mockKubeConfig.makeApiClient).toHaveBeenCalledWith(k8s.AppsV1Api);
      expect(mockK8sApi.createNamespacedDeployment).toHaveBeenCalledTimes(1);
      
      const [requestParams] = mockK8sApi.createNamespacedDeployment.mock.calls[0];
      expect(requestParams.namespace).toBe('default');
      expect(requestParams.body.metadata?.name).toMatch(/^nginx-deployment-\d+$/);
      expect(requestParams.body.metadata?.labels?.app).toBe('nginx');
      expect(requestParams.body.metadata?.labels?.['created-by']).toBe('catalyst-web-app');
      expect(requestParams.body.spec?.replicas).toBe(1);
      expect(requestParams.body.spec?.template?.spec?.containers?.[0]?.image).toBe('nginx:1.25');
    });

    it('should handle Kubernetes config loading failure', async () => {
      mockKubeConfig.loadFromDefault.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to load Kubernetes configuration');
      expect(data.message).toBe('Make sure kubeconfig is properly configured or running in a Kubernetes cluster');

      // API should not be called if config loading fails
      expect(mockK8sApi.createNamespacedDeployment).not.toHaveBeenCalled();
    });

    it('should handle unauthorized error', async () => {
      const unauthorizedError = new Error('Unauthorized: User cannot create deployments');
      mockK8sApi.createNamespacedDeployment.mockRejectedValue(unauthorizedError);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized to access Kubernetes cluster');

      expect(mockKubeConfig.loadFromDefault).toHaveBeenCalledTimes(1);
      expect(mockK8sApi.createNamespacedDeployment).toHaveBeenCalledTimes(1);
    });

    it('should handle connection refused error', async () => {
      const connectionError = new Error('connect ECONNREFUSED connection refused');
      mockK8sApi.createNamespacedDeployment.mockRejectedValue(connectionError);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot connect to Kubernetes cluster');

      expect(mockKubeConfig.loadFromDefault).toHaveBeenCalledTimes(1);
      expect(mockK8sApi.createNamespacedDeployment).toHaveBeenCalledTimes(1);
    });

    it('should handle generic deployment creation error', async () => {
      const genericError = new Error('Something went wrong');
      mockK8sApi.createNamespacedDeployment.mockRejectedValue(genericError);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Something went wrong');

      expect(mockKubeConfig.loadFromDefault).toHaveBeenCalledTimes(1);
      expect(mockK8sApi.createNamespacedDeployment).toHaveBeenCalledTimes(1);
    });

    it('should create deployment with correct specifications', async () => {
      const mockResponse = {
        metadata: {
          name: 'nginx-deployment-123456789',
          namespace: 'default'
        },
        spec: {
          replicas: 1
        }
      };

      mockK8sApi.createNamespacedDeployment.mockResolvedValue(mockResponse as any);

      await GET();

      const [requestParams] = mockK8sApi.createNamespacedDeployment.mock.calls[0];
      
      // Verify deployment specification
      expect(requestParams.body.apiVersion).toBe('apps/v1');
      expect(requestParams.body.kind).toBe('Deployment');
      expect(requestParams.body.metadata?.namespace).toBe('default');
      expect(requestParams.body.spec?.replicas).toBe(1);
      
      // Verify container specification
      const container = requestParams.body.spec?.template?.spec?.containers?.[0];
      expect(container?.name).toBe('nginx');
      expect(container?.image).toBe('nginx:1.25');
      expect(container?.ports?.[0]?.containerPort).toBe(80);
      
      // Verify resource specifications
      expect(container?.resources?.requests?.memory).toBe('64Mi');
      expect(container?.resources?.requests?.cpu).toBe('50m');
      expect(container?.resources?.limits?.memory).toBe('128Mi');
      expect(container?.resources?.limits?.cpu).toBe('100m');

      // Verify labels
      expect(requestParams.body.metadata?.labels?.app).toBe('nginx');
      expect(requestParams.body.metadata?.labels?.['created-by']).toBe('catalyst-web-app');
      expect(requestParams.body.spec?.selector?.matchLabels?.app).toBe('nginx');
      expect(requestParams.body.spec?.template?.metadata?.labels?.app).toBe('nginx');
    });
  });
});