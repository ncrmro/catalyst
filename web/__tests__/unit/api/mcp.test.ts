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
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('id', 1);
      expect(result.result).toHaveProperty('serverInfo');
      expect(result.result.serverInfo.name).toBe('catalyst-projects-server');
    });

    it('should list tools including get_projects', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`
        },
        body: {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2
        }
      });

      const response = await POST(req);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('id', 2);
      expect(result.result).toHaveProperty('tools');
      
      const getProjectsTool = result.result.tools.find((tool: any) => tool.name === 'get_projects');
      expect(getProjectsTool).toBeDefined();
      expect(getProjectsTool).toHaveProperty('title', 'Get Projects');
      expect(getProjectsTool).toHaveProperty('description', 'Retrieve all projects for the current user');
    });

    it('should call get_projects tool and return project data', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`
        },
        body: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'get_projects',
            arguments: {}
          },
          id: 3
        }
      });

      const response = await POST(req);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('id', 3);
      expect(result.result).toHaveProperty('content');
      expect(result.result.content).toHaveLength(1);
      expect(result.result.content[0]).toHaveProperty('type', 'text');
      
      // Parse the project data
      const projectData = JSON.parse(result.result.content[0].text);
      expect(projectData).toHaveProperty('projects');
      expect(projectData).toHaveProperty('total_count');
      expect(projectData.projects).toHaveLength(1);
      expect(projectData.projects[0]).toHaveProperty('id', 'test-project-1');
      expect(projectData.projects[0]).toHaveProperty('name', 'test-project');
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
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('name', 'catalyst-projects-server');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('tools');
      expect(result.tools).toContain('get_projects');
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
      expect(result.result.message).toContain('Session cleanup not needed in stateless mode');
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