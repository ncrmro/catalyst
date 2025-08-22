import { POST } from '../../../src/app/api/kubernetes/namespaces/route';
import { NextRequest } from 'next/server';

// Mock the k8s-namespaces module
jest.mock('../../../src/lib/k8s-namespaces', () => ({
  createProjectNamespace: jest.fn()
}));

import { createProjectNamespace } from '../../../src/lib/k8s-namespaces';

const mockCreateProjectNamespace = createProjectNamespace as jest.MockedFunction<typeof createProjectNamespace>;

// Helper function to create mock NextRequest
function createMockRequest(body: any): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

describe('/api/kubernetes/namespaces - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/kubernetes/namespaces', () => {
    it('should create namespace successfully', async () => {
      // Mock successful namespace creation
      mockCreateProjectNamespace.mockResolvedValue({
        name: 'testteam-testproject-production',
        labels: {
          'catalyst/team': 'testteam',
          'catalyst/project': 'testproject',
          'catalyst/environment': 'production'
        },
        created: true
      });

      const req = createMockRequest({
        team: 'testteam',
        project: 'testproject',
        environment: 'production'
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Namespace created successfully',
        namespace: {
          name: 'testteam-testproject-production',
          labels: {
            'catalyst/team': 'testteam',
            'catalyst/project': 'testproject',
            'catalyst/environment': 'production'
          },
          created: true
        }
      });

      expect(mockCreateProjectNamespace).toHaveBeenCalledWith({
        team: 'testteam',
        project: 'testproject',
        environment: 'production'
      });
    });

    it('should handle existing namespace', async () => {
      // Mock namespace already exists
      mockCreateProjectNamespace.mockResolvedValue({
        name: 'testteam-testproject-staging',
        labels: {
          'catalyst/team': 'testteam',
          'catalyst/project': 'testproject',
          'catalyst/environment': 'staging'
        },
        created: false
      });

      const req = createMockRequest({
        team: 'testteam',
        project: 'testproject',
        environment: 'staging'
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Namespace already exists',
        namespace: {
          created: false
        }
      });
    });

    it('should validate required fields', async () => {
      const req = createMockRequest({
        team: 'testteam',
        // missing project and environment
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Missing required fields: team, project, environment'
      });

      expect(mockCreateProjectNamespace).not.toHaveBeenCalled();
    });

    it('should validate environment values', async () => {
      const req = createMockRequest({
        team: 'testteam',
        project: 'testproject',
        environment: 'invalid-env'
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Environment must be one of: production, staging, pr-1'
      });

      expect(mockCreateProjectNamespace).not.toHaveBeenCalled();
    });

    it('should handle Kubernetes connection errors', async () => {
      // Mock connection error
      mockCreateProjectNamespace.mockRejectedValue(new Error('connection refused'));

      const req = createMockRequest({
        team: 'testteam',
        project: 'testproject',
        environment: 'production'
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        success: false,
        error: 'Cannot connect to Kubernetes cluster'
      });
    });

    it('should handle unauthorized errors', async () => {
      // Mock unauthorized error
      mockCreateProjectNamespace.mockRejectedValue(new Error('Unauthorized'));

      const req = createMockRequest({
        team: 'testteam',
        project: 'testproject',
        environment: 'production'
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        success: false,
        error: 'Unauthorized to access Kubernetes cluster'
      });
    });

    it('should handle invalid JSON', async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      } as any;

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid request body'
      });
    });

    it('should accept all supported environments', async () => {
      const environments = ['production', 'staging', 'pr-1'];

      for (const environment of environments) {
        mockCreateProjectNamespace.mockResolvedValue({
          name: `testteam-testproject-${environment}`,
          labels: {
            'catalyst/team': 'testteam',
            'catalyst/project': 'testproject',
            'catalyst/environment': environment
          },
          created: true
        });

        const req = createMockRequest({
          team: 'testteam',
          project: 'testproject',
          environment
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.namespace.labels['catalyst/environment']).toBe(environment);
      }
    });
  });
});