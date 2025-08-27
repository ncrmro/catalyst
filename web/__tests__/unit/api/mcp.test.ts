import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('MCP API Route - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    const url = 'http://localhost:3000/api/mcp';
    const req = new NextRequest(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return req;
  };

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: jest.fn(),
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest({ method: 'tools/list' });
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should reject requests with invalid bearer token format', async () => {
      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: jest.fn(),
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'InvalidFormat token' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should reject requests with invalid API key', async () => {
      const mockValidateApiKey = jest.fn().mockResolvedValue(null);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'Bearer invalid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Invalid API key');
      expect(mockValidateApiKey).toHaveBeenCalledWith('invalid-key');
    });
  });

  describe('tools/list', () => {
    it('should return list of available tools', async () => {
      const mockValidateApiKey = jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.tools).toHaveLength(2);
      expect(data.tools[0].name).toBe('getNamespaces');
      expect(data.tools[1].name).toBe('getNamespace');
      expect(mockValidateApiKey).toHaveBeenCalledWith('valid-key');
    });
  });

  describe('tools/call - getNamespaces', () => {
    it('should call getNamespaces without cluster name', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'kube-system', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);
      const mockGetNamespacesForUser = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: mockGetNamespacesForUser,
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespaces',
            arguments: {},
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.content).toHaveLength(1);
      expect(data.content[0].type).toBe('text');
      
      const result = JSON.parse(data.content[0].text);
      expect(result.success).toBe(true);
      expect(result.namespaces).toEqual(mockNamespaces);
      expect(result.count).toBe(2);
      
      expect(mockGetNamespacesForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }),
        undefined
      );
    });

    it('should call getNamespaces with cluster name', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockNamespaces = [
        { name: 'production-ns', labels: { environment: 'production' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);
      const mockGetNamespacesForUser = jest.fn().mockResolvedValue(mockNamespaces);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: mockGetNamespacesForUser,
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespaces',
            arguments: { clusterName: 'production' },
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const result = JSON.parse(data.content[0].text);
      expect(result.success).toBe(true);
      expect(result.namespaces).toEqual(mockNamespaces);
      expect(result.count).toBe(1);
      
      expect(mockGetNamespacesForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }),
        'production'
      );
    });
  });

  describe('tools/call - getNamespace', () => {
    it('should return error if namespace parameter is missing', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespace',
            arguments: {},
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('namespace parameter is required');
    });

    it('should return namespace details when namespace exists', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockNamespaceDetails = {
        name: 'test-namespace',
        labels: { environment: 'test' },
        creationTimestamp: '2023-01-01T00:00:00Z',
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);
      const mockGetNamespaceDetails = jest.fn().mockResolvedValue(mockNamespaceDetails);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: mockGetNamespaceDetails,
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespace',
            arguments: { namespace: 'test-namespace' },
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.content).toHaveLength(1);
      const result = JSON.parse(data.content[0].text);
      expect(result.success).toBe(true);
      expect(result.namespace).toEqual(mockNamespaceDetails);
      
      expect(mockGetNamespaceDetails).toHaveBeenCalledWith(
        'test-namespace',
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }),
        undefined,
        undefined
      );
    });

    it('should return error when namespace does not exist', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);
      const mockGetNamespaceDetails = jest.fn().mockResolvedValue(null);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: mockGetNamespaceDetails,
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespace',
            arguments: { namespace: 'non-existent' },
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const result = JSON.parse(data.content[0].text);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Namespace 'non-existent' not found");
      
      expect(mockGetNamespaceDetails).toHaveBeenCalledWith(
        'non-existent',
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }),
        undefined,
        undefined
      );
    });

    it('should handle optional resources and cluster name parameters', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockNamespaceDetails = {
        name: 'test-namespace',
        labels: { environment: 'test' },
        creationTimestamp: '2023-01-01T00:00:00Z',
        requestedResources: ['pods', 'services'],
        message: 'Resource details not implemented yet',
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);
      const mockGetNamespaceDetails = jest.fn().mockResolvedValue(mockNamespaceDetails);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: mockGetNamespaceDetails,
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespace',
            arguments: {
              namespace: 'test-namespace',
              resources: ['pods', 'services'],
              clusterName: 'test-cluster',
            },
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const result = JSON.parse(data.content[0].text);
      expect(result.success).toBe(true);
      expect(result.namespace).toEqual(mockNamespaceDetails);
      
      expect(mockGetNamespaceDetails).toHaveBeenCalledWith(
        'test-namespace',
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User'
        }),
        ['pods', 'services'],
        'test-cluster'
      );
    });
  });

  describe('Unknown tools', () => {
    it('should return error for unknown tool', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'unknownTool',
            arguments: {},
          },
        },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Unknown tool: unknownTool');
    });
  });

  describe('Other MCP requests', () => {
    it('should handle other MCP methods', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(mockUser);

      jest.doMock('@/lib/mcp-auth', () => ({
        validateApiKey: mockValidateApiKey,
      }));

      jest.doMock('@/lib/mcp-namespaces', () => ({
        getNamespacesForUser: jest.fn(),
        getNamespaceDetails: jest.fn(),
      }));

      const { POST } = await import('@/app/api/mcp/route');
      const req = createRequest(
        { method: 'some/other', params: {} },
        { authorization: 'Bearer valid-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toBe('MCP request received');
      expect(data.user).toBe('test@example.com');
    });
  });
});