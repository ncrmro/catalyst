import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
 * Handle MCP JSON-RPC requests directly
 */
async function handleMcpRequest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const server = createMcpServer();
  
  try {
    switch (body.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'catalyst-projects-server',
              version: '1.0.0'
            }
          },
          id: body.id
        };
        
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'get_projects',
                title: 'Get Projects',
                description: 'Retrieve all projects for the current user',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false
                }
              }
            ]
          },
          id: body.id
        };
        
      case 'tools/call':
        const params = body.params as Record<string, unknown> | undefined;
        if (params?.name === 'get_projects') {
          try {
            const projectsData = await fetchProjects();
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(projectsData, null, 2)
                  }
                ]
              },
              id: body.id
            };
          } catch (error) {
            return {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal error',
                data: error instanceof Error ? error.message : 'Unknown error'
              },
              id: body.id
            };
          }
        } else {
          return {
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Tool '${params?.name}' not found`
            },
            id: body.id
          };
        }
        
      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found',
            data: `Method '${body.method}' not supported`
          },
          id: body.id
        };
    }
  } finally {
    server.close();
  }
}

/**
 * Handle POST requests for MCP communication
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

    // Validate JSON-RPC request
    if (!body || body.jsonrpc !== '2.0' || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request'
          },
          id: body?.id || null
        },
        { status: 400 }
      );
    }

    // Handle the MCP request
    const response = await handleMcpRequest(body);
    
    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

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
 * Handle GET requests - provide server info
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

  return NextResponse.json({
    name: 'catalyst-projects-server',
    version: '1.0.0',
    protocol: 'Model Context Protocol',
    description: 'MCP server for Catalyst project data',
    tools: ['get_projects']
  });
}

/**
 * Handle DELETE requests - cleanup (no-op in stateless mode)
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
        message: 'Session cleanup not needed in stateless mode'
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