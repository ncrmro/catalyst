import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateApiKey, McpUser } from '@/lib/mcp-auth';
import { getNamespacesForUser, getNamespaceDetails } from '@/lib/mcp-namespaces';
import { z } from 'zod';

// Create MCP Server instance
const server = new McpServer({
  name: 'catalyst-mcp-server',
  version: '1.0.0',
});

// Register getNamespaces tool
server.registerTool(
  'getNamespaces',
  {
    title: 'Get Namespaces',
    description: 'Get all namespaces that the user can access',
    inputSchema: {
      clusterName: z.string().optional().describe('Optional cluster name to filter namespaces'),
    },
  },
  async (args, context) => {
    // Get user from context (we'll pass it through)
    const user = (context as { user?: McpUser })?.user;
    if (!user) {
      throw new Error('Authentication required');
    }

    const { clusterName } = args;
    const namespaces = await getNamespacesForUser(user, clusterName);

    return {
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
    };
  }
);

// Register getNamespace tool
server.registerTool(
  'getNamespace',
  {
    title: 'Get Namespace',
    description: 'Get details for a specific namespace with optional resource information',
    inputSchema: {
      namespace: z.string().describe('The namespace name to retrieve details for'),
      resources: z.array(z.string()).optional().describe('Optional list of resource types to include in the response'),
      clusterName: z.string().optional().describe('Optional cluster name'),
    },
  },
  async (args, context) => {
    // Get user from context
    const user = (context as { user?: McpUser })?.user;
    if (!user) {
      throw new Error('Authentication required');
    }

    const { namespace, resources, clusterName } = args;
    const namespaceDetails = await getNamespaceDetails(namespace, user, resources, clusterName);

    if (!namespaceDetails) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Namespace '${namespace}' not found`,
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            namespace: namespaceDetails,
          }, null, 2),
        },
      ],
    };
  }
);

/**
 * Simple middleware to handle authentication and user context
 */
async function withAuth(request: NextRequest, handler: (user: McpUser) => Promise<Response>) {
  // Extract Bearer token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const apiKey = authHeader.substring('Bearer '.length);
  const user = await validateApiKey(apiKey);

  if (!user) {
    return new NextResponse('Invalid API key', { status: 401 });
  }

  console.log(`MCP Server: Authenticated user ${user.email} (${user.id})`);
  return handler(user);
}

/**
 * POST endpoint for handling MCP requests
 * This is a simple implementation - for production use, consider using the provided transports
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();

      // Handle tools/list request
      if (body.method === 'tools/list') {
        return NextResponse.json({
          tools: [
            {
              name: 'getNamespaces',
              description: 'Get all namespaces that the user can access',
              inputSchema: {
                type: 'object',
                properties: {
                  clusterName: {
                    type: 'string',
                    description: 'Optional cluster name to filter namespaces',
                  },
                },
              },
            },
            {
              name: 'getNamespace',
              description: 'Get details for a specific namespace with optional resource information',
              inputSchema: {
                type: 'object',
                properties: {
                  namespace: {
                    type: 'string',
                    description: 'The namespace name to retrieve details for',
                  },
                  resources: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'Optional list of resource types to include in the response',
                  },
                  clusterName: {
                    type: 'string',
                    description: 'Optional cluster name',
                  },
                },
                required: ['namespace'],
              },
            },
          ],
        });
      }

      // Handle tools/call request
      if (body.method === 'tools/call') {
        const { name, arguments: args } = body.params;

        switch (name) {
          case 'getNamespaces': {
            const { clusterName } = args || {};
            const namespaces = await getNamespacesForUser(user, clusterName);

            return NextResponse.json({
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
            });
          }

          case 'getNamespace': {
            const { namespace, resources, clusterName } = args || {};

            if (!namespace) {
              return NextResponse.json({
                error: 'namespace parameter is required',
              }, { status: 400 });
            }

            const namespaceDetails = await getNamespaceDetails(namespace, user, resources, clusterName);

            if (!namespaceDetails) {
              return NextResponse.json({
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: `Namespace '${namespace}' not found`,
                    }, null, 2),
                  },
                ],
              });
            }

            return NextResponse.json({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    namespace: namespaceDetails,
                  }, null, 2),
                },
              ],
            });
          }

          default:
            return NextResponse.json({
              error: `Unknown tool: ${name}`,
            }, { status: 400 });
        }
      }

      // Handle other MCP requests
      return NextResponse.json({
        success: true,
        message: 'MCP request received',
        user: user.email || 'unknown',
        request: body,
      });
    } catch (error) {
      console.error('MCP Server POST error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}