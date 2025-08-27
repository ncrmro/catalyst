import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock the dependencies before importing the handler
jest.mock('@/lib/mcp-auth', () => ({
  validateApiKey: jest.fn(),
}));

jest.mock('@/lib/mcp-namespaces', () => ({
  getNamespacesForUser: jest.fn(),
  getNamespaceDetails: jest.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/mcp/route';

const mockValidateApiKey = jest.fn();
const mockGetNamespacesForUser = jest.fn();
const mockGetNamespaceDetails = jest.fn();

// Replace the mocked functions
jest.doMock('@/lib/mcp-auth', () => ({
  validateApiKey: mockValidateApiKey,
}));

jest.doMock('@/lib/mcp-namespaces', () => ({
  getNamespacesForUser: mockGetNamespacesForUser,
  getNamespaceDetails: mockGetNamespaceDetails,
}));

describe('/api/mcp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const req = createRequest({ method: 'tools/list' });
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should reject requests with invalid bearer token format', async () => {
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'InvalidFormat token' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should reject requests with invalid API key', async () => {
      mockValidateApiKey.mockResolvedValue(null);
      
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
    beforeEach(() => {
      mockValidateApiKey.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should return list of available tools', async () => {
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
    beforeEach(() => {
      mockValidateApiKey.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should call getNamespaces without cluster name', async () => {
      const mockNamespaces = [
        { name: 'default', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
        { name: 'kube-system', labels: {}, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];
      mockGetNamespacesForUser.mockResolvedValue(mockNamespaces);

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
      
      expect(mockGetNamespacesForUser).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should call getNamespaces with cluster name', async () => {
      const mockNamespaces = [
        { name: 'production-ns', labels: { environment: 'production' }, creationTimestamp: '2023-01-01T00:00:00Z' },
      ];
      mockGetNamespacesForUser.mockResolvedValue(mockNamespaces);

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
      
      expect(mockGetNamespacesForUser).toHaveBeenCalledWith('user-1', 'production');
    });
  });

  describe('tools/call - getNamespace', () => {
    beforeEach(() => {
      mockValidateApiKey.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should return error if namespace parameter is missing', async () => {
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
      const mockNamespaceDetails = {
        name: 'test-namespace',
        labels: { environment: 'test' },
        creationTimestamp: '2023-01-01T00:00:00Z',
      };
      mockGetNamespaceDetails.mockResolvedValue(mockNamespaceDetails);

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
      
      expect(mockGetNamespaceDetails).toHaveBeenCalledWith('test-namespace', undefined, undefined);
    });

    it('should return error when namespace does not exist', async () => {
      mockGetNamespaceDetails.mockResolvedValue(null);

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
      
      expect(mockGetNamespaceDetails).toHaveBeenCalledWith('non-existent', undefined, undefined);
    });

    it('should handle optional resources and cluster name parameters', async () => {
      const mockNamespaceDetails = {
        name: 'test-namespace',
        labels: { environment: 'test' },
        creationTimestamp: '2023-01-01T00:00:00Z',
        requestedResources: ['pods', 'services'],
        message: 'Resource details not implemented yet',
      };
      mockGetNamespaceDetails.mockResolvedValue(mockNamespaceDetails);

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
        ['pods', 'services'],
        'test-cluster'
      );
    });
  });

  describe('Unknown tools', () => {
    beforeEach(() => {
      mockValidateApiKey.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should return error for unknown tool', async () => {
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
    beforeEach(() => {
      mockValidateApiKey.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should handle other MCP methods', async () => {
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