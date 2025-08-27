import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { fetchProjects } from '@/actions/projects';

// Static API key for authorization
const STATIC_API_KEY = process.env.MCP_API_KEY || 'catalyst-mcp-key-2024';

/**
 * Check if request contains proper authentication
 */
function isAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === STATIC_API_KEY;
}

/**
 * Create and configure the MCP server
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'catalyst-projects-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
    }
  });

  // Register the get_projects tool
  server.registerTool(
    'get_projects',
    {
      title: 'Get Projects',
      description: 'Retrieve all projects for the current user',
      inputSchema: {}
    },
    async () => {
      try {
        const projectsData = await fetchProjects();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projectsData, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching projects:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch projects',
                message: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2)
            }
          ]
        };
      }
    }
  );

  return server;
}

/**
 * Handle POST requests for MCP communication (stateless mode)
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    if (!isAuthenticated(req)) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Unauthorized: Missing or invalid API key'
          },
          id: null
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Create a new instance for each request (stateless mode)
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Disable session management for stateless mode
    });

    // Connect the server to the transport
    await server.connect(transport);

    // Simulate the Node.js request/response objects
    const nodeReq = {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
      body,
    };

    let responseData = '';
    let responseStatus = 200;
    const responseHeaders: Record<string, string> = {};

    const nodeRes = {
      writeHead(status: number, headers?: Record<string, string>) {
        responseStatus = status;
        if (headers) {
          Object.assign(responseHeaders, headers);
        }
        return this;
      },
      setHeader(name: string, value: string) {
        responseHeaders[name] = value;
      },
      write(chunk: string) {
        responseData += chunk;
      },
      end(data?: string) {
        if (data) {
          responseData += data;
        }
      },
      headersSent: false,
    };

    try {
      // Handle the request - using any types for Node.js interface mocking
      /* eslint-disable @typescript-eslint/no-explicit-any */
      await transport.handleRequest(
        nodeReq as any,
        nodeRes as any,
        body
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */

      // Clean up
      await transport.close();
      server.close();

      // Return the response
      return new NextResponse(responseData, {
        status: responseStatus,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error('Transport error:', error);
      
      // Clean up on error
      await transport.close();
      server.close();

      throw error;
    }

  } catch (error) {
    console.error('MCP server error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: null
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests - not supported in stateless mode
 */
export async function GET(req: NextRequest) {
  // Check authentication
  if (!isAuthenticated(req)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid API key'
        },
        id: null
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed in stateless mode'
      },
      id: null
    },
    { status: 405 }
  );
}

/**
 * Handle DELETE requests - not needed in stateless mode
 */
export async function DELETE(req: NextRequest) {
  // Check authentication
  if (!isAuthenticated(req)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid API key'
        },
        id: null
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      jsonrpc: '2.0',
      result: {
        message: 'Session termination not needed in stateless mode'
      },
      id: null
    }
  );
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
      'Access-Control-Expose-Headers': 'mcp-session-id',
    },
  });
}