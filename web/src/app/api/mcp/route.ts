import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getAuthenticatedUser, type McpUser } from '@/lib/mcp-auth';
import { getNamespacesForUser, getNamespaceDetails } from '@/lib/mcp-namespaces';
import { fetchProjects } from '@/actions/projects';

/**
 * Simple middleware to handle authentication and user context
 */
async function withAuth(request: NextRequest, handler: (user: McpUser) => Promise<NextResponse>): Promise<NextResponse> {
  // Check API key authentication
  const authHeader = request.headers.get('authorization');
  if (!validateApiKey(authHeader)) {
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

  // Get authenticated user with teams and projects
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Authentication required'
        },
        id: null
      },
      { status: 401 }
    );
  }

  return handler(user);
}

/**
 * Handle MCP JSON-RPC requests with user context
 */
async function handleMcpRequest(body: Record<string, unknown>, user: McpUser): Promise<Record<string, unknown>> {
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
              name: 'catalyst-mcp-server',
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
              },
              {
                name: 'getNamespaces',
                title: 'Get Namespaces',
                description: 'Get all namespaces that the user can access',
                inputSchema: {
                  type: 'object',
                  properties: {
                    clusterName: {
                      type: 'string',
                      description: 'Optional cluster name to filter namespaces',
                    },
                  },
                  required: [],
                }
              },
              {
                name: 'getNamespace',
                title: 'Get Namespace',
                description: 'Get details for a specific namespace with optional resource information',
                inputSchema: {
                  type: "object",
                  properties: {
                    namespace: {
                      type: "string",
                      description: "The namespace name to retrieve details for"
                    },
                    resources: {
                      type: "array",
                      items: { type: "string" },
                      description: "Optional list of resource types to include in the response"
                    },
                    clusterName: {
                      type: "string",
                      description: "Optional cluster name"
                    }
                  },
                  required: ["namespace"]
                }
              }
            ]
          },
          id: body.id
        };
        
      case 'tools/call':
        const params = body.params as Record<string, unknown> | undefined;
        const toolName = params?.name as string;
        const toolArgs = params?.arguments as Record<string, unknown> || {};
        
        switch (toolName) {
          case 'get_projects':
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

          case 'getNamespaces':
            try {
              const { clusterName } = toolArgs;
              const userTeamIds = user.teams.map(team => team.id);
              const namespaces = await getNamespacesForUser(user.id, userTeamIds, clusterName as string);
              
              return {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        success: true,
                        namespaces,
                        count: namespaces.length,
                      }, null, 2),
                    },
                  ],
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

          case 'getNamespace':
            try {
              const { namespace, resources, clusterName } = toolArgs;
              const userTeamIds = user.teams.map(team => team.id);
              const namespaceDetails = await getNamespaceDetails(
                namespace as string,
                userTeamIds,
                resources as string[],
                clusterName as string
              );

              if (!namespaceDetails) {
                return {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify({
                          success: false,
                          error: `Namespace '${namespace}' not found or access denied`,
                        }, null, 2),
                      },
                    ],
                  },
                  id: body.id
                };
              }

              return {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        success: true,
                        namespace: namespaceDetails,
                      }, null, 2),
                    },
                  ],
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

          default:
            return {
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: 'Method not found',
                data: `Tool '${toolName}' not found`
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
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: body.id
    };
  }
}

/**
 * Handle POST requests for MCP communication
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
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

      // Handle the MCP request with user context
      const response = await handleMcpRequest(body, user);
      
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
  });
}

/**
 * Handle GET requests - provide server info
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    return NextResponse.json({
      name: 'catalyst-mcp-server',
      version: '1.0.0',
      protocol: 'Model Context Protocol',
      description: 'MCP server for Catalyst project and namespace data',
      tools: ['get_projects', 'getNamespaces', 'getNamespace'],
      user: {
        id: user.id,
        email: user.email,
        teams: user.teams.length,
        projects: user.projects.length
      }
    });
  });
}

/**
 * Handle DELETE requests - cleanup (no-op in stateless mode)
 */
export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        result: {
          message: 'Session cleanup not needed in stateless mode'
        },
        id: null
      }
    );
  });
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