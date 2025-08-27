import { POST, GET, DELETE, OPTIONS } from '../../../src/app/api/mcp/route';
import { NextRequest } from 'next/server';

// Mock the fetchProjects function
jest.mock('../../../src/actions/projects', () => ({
  fetchProjects: jest.fn().mockResolvedValue({
    projects: [
      {
        id: 'test-project-1',
        name: 'test-project',
        full_name: 'testuser/test-project',
        description: 'A test project',
        owner: {
          login: 'testuser',
          type: 'User',
          avatar_url: 'https://github.com/identicons/testuser.png'
        },
        repositories: [],
        environments: [],
        preview_environments_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ],
    total_count: 1
  })
}));

function createMockRequest(options: {
  method: string;
  headers?: Record<string, string>;
  body?: any;
}): NextRequest {
  const url = 'http://localhost:3000/api/mcp';
  const headers = new Headers(options.headers || {});
  
  const req = new NextRequest(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return req;
}

describe('/api/mcp', () => {
  const validApiKey = process.env.MCP_API_KEY || 'catalyst-mcp-key-2024';

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          jsonrpc: '2.0',
          method: 'initialize',
          id: 1
        }
      });

      const response = await POST(req);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error.message).toContain('Unauthorized');
    });

    it('should reject requests with invalid API key', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key'
        },
        body: {
          jsonrpc: '2.0',
          method: 'initialize',
          id: 1
        }
      });

      const response = await POST(req);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error.message).toContain('Unauthorized');
    });

    it('should accept requests with valid API key', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`
        },
        body: {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          },
          id: 1
        }
      });

      const response = await POST(req);
      
      // Should not be unauthorized
      expect(response.status).not.toBe(401);
    });
  });

  describe('MCP Protocol', () => {
    it('should handle initialize request', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${validApiKey}`
        },
        body: {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          },
          id: 1
        }
      });

      const response = await POST(req);
      const responseText = await response.text();
      
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      expect(response.status).toBe(200);
      expect(responseText).toBeTruthy();
      
      // Try to parse as JSON to ensure it's valid JSON-RPC
      const result = JSON.parse(responseText);
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('id', 1);
    });

    it('should list tools including get_projects', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${validApiKey}`
        },
        body: {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2
        }
      });

      const response = await POST(req);
      const responseText = await response.text();
      
      expect(response.status).toBe(200);
      
      const result = JSON.parse(responseText);
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('id', 2);
      
      if (result.result && result.result.tools) {
        const getProjectsTool = result.result.tools.find((tool: any) => tool.name === 'get_projects');
        expect(getProjectsTool).toBeDefined();
        expect(getProjectsTool).toHaveProperty('title', 'Get Projects');
      }
    });
  });

  describe('HTTP Methods', () => {
    it('should handle OPTIONS request', async () => {
      const response = await OPTIONS();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should handle GET request with authentication', async () => {
      const req = createMockRequest({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validApiKey}`
        }
      });

      const response = await GET(req);
      
      expect(response.status).toBe(405); // Method not allowed in stateless mode
    });

    it('should handle DELETE request with authentication', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${validApiKey}`
        }
      });

      const response = await DELETE(req);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.result.message).toContain('stateless mode');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const url = 'http://localhost:3000/api/mcp';
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`
      });
      
      const req = new NextRequest(url, {
        method: 'POST',
        headers,
        body: 'invalid json',
      });

      const response = await POST(req);
      const result = await response.json();
      
      expect(response.status).toBe(500);
      expect(result.error.code).toBe(-32603);
    });
  });
});