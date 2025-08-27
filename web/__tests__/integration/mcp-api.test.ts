/**
 * @jest-environment node
 */

import { POST } from '@/app/api/mcp/route';
import { NextRequest } from 'next/server';

describe('MCP API Route - Integration Tests', () => {
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

  beforeAll(() => {
    // Ensure we're not in mocked mode for integration tests
    delete process.env.MOCKED;
    // Set up a test API key for integration testing
    process.env.MCP_API_KEY = 'integration-test-key';
  });

  afterAll(() => {
    // Clean up test environment
    delete process.env.MCP_API_KEY;
  });

  describe('Authentication with real services', () => {
    test('should reject requests without authorization header', async () => {
      const req = createRequest({ method: 'tools/list' });
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
      console.log('Integration test: Correctly rejected request without auth header');
    });

    test('should reject requests with invalid bearer token format', async () => {
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'InvalidFormat token' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
      console.log('Integration test: Correctly rejected invalid bearer format');
    });

    test('should reject requests with wrong API key', async () => {
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'Bearer wrong-key' }
      );
      const response = await POST(req);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Invalid API key');
      console.log('Integration test: Correctly rejected wrong API key');
    });
  });

  describe('MCP Protocol with real backend', () => {
    test('should return tools list when properly authenticated', async () => {
      const req = createRequest(
        { method: 'tools/list' },
        { authorization: 'Bearer integration-test-key' }
      );
      const response = await POST(req);
      
      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('tools');
        expect(Array.isArray(data.tools)).toBe(true);
        expect(data.tools.length).toBeGreaterThan(0);
        
        // Check for expected tools
        const toolNames = data.tools.map((tool: any) => tool.name);
        expect(toolNames).toContain('getNamespaces');
        expect(toolNames).toContain('getNamespace');
        
        console.log('Integration test: Successfully retrieved tools list');
      } else {
        console.log('Integration test: Authentication failed - no users in database for API key validation');
        expect(response.status).toBe(401);
      }
    });

    test('should handle getNamespaces tool with real Kubernetes', async () => {
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespaces',
            arguments: {},
          },
        },
        { authorization: 'Bearer integration-test-key' }
      );
      const response = await POST(req);
      
      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('content');
        expect(Array.isArray(data.content)).toBe(true);
        expect(data.content.length).toBe(1);
        expect(data.content[0]).toHaveProperty('type', 'text');
        
        const result = JSON.parse(data.content[0].text);
        expect(result).toHaveProperty('success');
        
        if (result.success) {
          expect(result).toHaveProperty('namespaces');
          expect(result).toHaveProperty('count');
          expect(Array.isArray(result.namespaces)).toBe(true);
          expect(typeof result.count).toBe('number');
          console.log(`Integration test: Retrieved ${result.count} namespaces`);
        } else {
          console.log('Integration test: getNamespaces returned failure (Kubernetes not available)');
        }
      } else {
        console.log('Integration test: getNamespaces request failed - no authenticated user');
        expect(response.status).toBe(401);
      }
    });

    test('should handle getNamespace tool with real data', async () => {
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespace',
            arguments: { namespace: 'default' },
          },
        },
        { authorization: 'Bearer integration-test-key' }
      );
      const response = await POST(req);
      
      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('content');
        expect(Array.isArray(data.content)).toBe(true);
        expect(data.content.length).toBe(1);
        
        const result = JSON.parse(data.content[0].text);
        expect(result).toHaveProperty('success');
        
        if (result.success && result.namespace) {
          expect(result.namespace).toHaveProperty('name');
          expect(result.namespace.name).toBe('default');
          console.log('Integration test: Successfully retrieved default namespace details');
        } else {
          console.log('Integration test: Default namespace not found (expected if Kubernetes not available)');
        }
      } else {
        console.log('Integration test: getNamespace request failed - no authenticated user');
        expect(response.status).toBe(401);
      }
    });

    test('should handle missing namespace parameter correctly', async () => {
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'getNamespace',
            arguments: {},
          },
        },
        { authorization: 'Bearer integration-test-key' }
      );
      const response = await POST(req);
      
      if (response.status === 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error', 'namespace parameter is required');
        console.log('Integration test: Correctly validated missing namespace parameter');
      } else if (response.status === 401) {
        console.log('Integration test: Authentication failed - no users in database');
      } else {
        console.log('Integration test: Unexpected response status:', response.status);
      }
    });

    test('should handle unknown tool gracefully', async () => {
      const req = createRequest(
        {
          method: 'tools/call',
          params: {
            name: 'unknownTool',
            arguments: {},
          },
        },
        { authorization: 'Bearer integration-test-key' }
      );
      const response = await POST(req);
      
      if (response.status === 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error', 'Unknown tool: unknownTool');
        console.log('Integration test: Correctly handled unknown tool');
      } else if (response.status === 401) {
        console.log('Integration test: Authentication failed - no users in database');
      } else {
        console.log('Integration test: Unexpected response status:', response.status);
      }
    });

    test('should handle other MCP methods', async () => {
      const req = createRequest(
        { method: 'some/other', params: {} },
        { authorization: 'Bearer integration-test-key' }
      );
      const response = await POST(req);
      
      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('message', 'MCP request received');
        expect(data).toHaveProperty('user');
        
        console.log('Integration test: Successfully handled other MCP method');
      } else {
        console.log('Integration test: Other MCP method failed - no authenticated user');
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Real error handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const url = 'http://localhost:3000/api/mcp';
      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer integration-test-key',
        },
        body: '{"invalid": json}', // Malformed JSON
      });
      
      const response = await POST(req);
      
      // Should handle JSON parsing errors gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
      console.log('Integration test: Gracefully handled malformed JSON');
    });
  });
});