import { NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
  getAuthenticatedUser,
  type McpUser,
} from "@/lib/mcp-auth";
import {
  getNamespacesForUser,
  getNamespaceDetails,
} from "@/lib/mcp-namespaces";
import { fetchProjects } from "@/actions/projects";
import {
  listActivePreviewPodsWithMetrics,
  getPreviewDeploymentStatusFull,
  getPreviewDeploymentLogs,
  deletePreviewDeploymentOrchestrated,
  retryFailedDeployment,
  userHasAccessToPod,
  type PreviewPodWithMetrics,
} from "@/models/preview-environments";

/**
 * Simple middleware to handle authentication and user context
 */
async function withAuth(
  request: NextRequest,
  handler: (user: McpUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  // Check API key authentication
  const authHeader = request.headers.get("authorization");
  if (!validateApiKey(authHeader)) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Missing or invalid API key",
        },
        id: null,
      },
      { status: 401 },
    );
  }

  // Get authenticated user with teams and projects
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Authentication required",
        },
        id: null,
      },
      { status: 401 },
    );
  }

  return handler(user);
}

/**
 * Handle MCP JSON-RPC requests with user context
 */
async function handleMcpRequest(
  body: Record<string, unknown>,
  user: McpUser,
): Promise<Record<string, unknown>> {
  try {
    switch (body.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "catalyst-mcp-server",
              version: "1.0.0",
            },
          },
          id: body.id,
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          result: {
            tools: [
              {
                name: "get_projects",
                title: "Get Projects",
                description: "Retrieve all projects for the current user",
                inputSchema: {
                  type: "object",
                  properties: {},
                  additionalProperties: false,
                },
              },
              {
                name: "getNamespaces",
                title: "Get Namespaces",
                description: "Get all namespaces that the user can access",
                inputSchema: {
                  type: "object",
                  properties: {
                    clusterName: {
                      type: "string",
                      description: "Optional cluster name to filter namespaces",
                    },
                  },
                  required: [],
                },
              },
              {
                name: "getNamespace",
                title: "Get Namespace",
                description:
                  "Get details for a specific namespace with optional resource information",
                inputSchema: {
                  type: "object",
                  properties: {
                    namespace: {
                      type: "string",
                      description: "The namespace name to retrieve details for",
                    },
                    resources: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Optional list of resource types to include in the response",
                    },
                    clusterName: {
                      type: "string",
                      description: "Optional cluster name",
                    },
                  },
                  required: ["namespace"],
                },
              },
              // Preview Environment Tools
              {
                name: "list_preview_environments",
                title: "List Preview Environments",
                description:
                  "List all active preview environments with resource usage metrics",
                inputSchema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["pending", "deploying", "running", "failed"],
                      description: "Filter by status",
                    },
                    includeMetrics: {
                      type: "boolean",
                      description: "Include CPU/memory metrics (default: true)",
                    },
                  },
                  required: [],
                },
              },
              {
                name: "get_preview_environment",
                title: "Get Preview Environment",
                description:
                  "Get detailed status of a preview environment including K8s status",
                inputSchema: {
                  type: "object",
                  properties: {
                    podId: {
                      type: "string",
                      description: "The preview environment pod ID",
                    },
                  },
                  required: ["podId"],
                },
              },
              {
                name: "get_preview_logs",
                title: "Get Preview Logs",
                description: "Get container logs from a preview environment",
                inputSchema: {
                  type: "object",
                  properties: {
                    podId: {
                      type: "string",
                      description: "The preview environment pod ID",
                    },
                    tailLines: {
                      type: "number",
                      description: "Number of lines to return (default: 100)",
                    },
                    timestamps: {
                      type: "boolean",
                      description: "Include timestamps (default: true)",
                    },
                  },
                  required: ["podId"],
                },
              },
              {
                name: "delete_preview_environment",
                title: "Delete Preview Environment",
                description:
                  "Delete a preview environment and clean up K8s resources",
                inputSchema: {
                  type: "object",
                  properties: {
                    podId: {
                      type: "string",
                      description: "The preview environment pod ID to delete",
                    },
                  },
                  required: ["podId"],
                },
              },
              {
                name: "retry_preview_deployment",
                title: "Retry Preview Deployment",
                description: "Retry a failed preview environment deployment",
                inputSchema: {
                  type: "object",
                  properties: {
                    podId: {
                      type: "string",
                      description:
                        "The preview environment pod ID to retry (must be in failed status)",
                    },
                  },
                  required: ["podId"],
                },
              },
            ],
          },
          id: body.id,
        };

      case "tools/call":
        const params = body.params as Record<string, unknown> | undefined;
        const toolName = params?.name as string;
        const toolArgs = (params?.arguments as Record<string, unknown>) || {};

        switch (toolName) {
          case "get_projects":
            try {
              const projectsData = await fetchProjects();
              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(projectsData, null, 2),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          case "getNamespaces":
            try {
              const { clusterName } = toolArgs;
              const userTeamIds = user.teams.map((team) => team.id);
              const namespaces = await getNamespacesForUser(
                user.id,
                userTeamIds,
                clusterName as string,
              );

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: true,
                          namespaces,
                          count: namespaces.length,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          case "getNamespace":
            try {
              const { namespace, resources, clusterName } = toolArgs;
              const userTeamIds = user.teams.map((team) => team.id);
              const namespaceDetails = await getNamespaceDetails(
                namespace as string,
                userTeamIds,
                resources as string[],
                clusterName as string,
              );

              if (!namespaceDetails) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: `Namespace '${namespace}' not found or access denied`,
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: true,
                          namespace: namespaceDetails,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          // Preview Environment Tools
          case "list_preview_environments":
            try {
              const { status, includeMetrics } = toolArgs;
              const statusFilter = status
                ? [status as "pending" | "deploying" | "running" | "failed"]
                : undefined;

              const result = await listActivePreviewPodsWithMetrics(user.id, {
                includeMetrics: includeMetrics !== false,
                statusFilter,
              });

              if (!result.success) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error:
                              result.error ||
                              "Failed to list preview environments",
                            code: "SERVER_ERROR",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: true,
                          environments: result.pods?.map(
                            (p: PreviewPodWithMetrics) => ({
                              id: p.pod.id,
                              namespace: p.pod.namespace,
                              status: p.pod.status,
                              publicUrl: p.pod.publicUrl,
                              branch: p.pod.branch,
                              commitSha: p.pod.commitSha,
                              ageDays: p.ageDays,
                              isExceedingQuota: p.isExceedingQuota,
                              resourceUsage: p.resourceUsage,
                              pullRequest: {
                                id: p.pullRequest.id,
                                number: p.pullRequest.number,
                              },
                              repo: {
                                id: p.repo.id,
                                name: p.repo.name,
                              },
                            }),
                          ),
                          count: result.pods?.length || 0,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          case "get_preview_environment":
            try {
              const { podId } = toolArgs;
              if (!podId) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "podId is required",
                            code: "INVALID_INPUT",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              // Check access
              const hasAccess = await userHasAccessToPod(
                user.id,
                podId as string,
              );
              if (!hasAccess) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "Access denied or pod not found",
                            code: "UNAUTHORIZED",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              const result = await getPreviewDeploymentStatusFull(
                podId as string,
              );

              if (!result.success) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error:
                              result.error ||
                              "Failed to get preview environment",
                            code: "NOT_FOUND",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: true,
                          environment: result.status,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          case "get_preview_logs":
            try {
              const { podId, tailLines, timestamps } = toolArgs;
              if (!podId) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "podId is required",
                            code: "INVALID_INPUT",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              // Check access
              const hasLogAccess = await userHasAccessToPod(
                user.id,
                podId as string,
              );
              if (!hasLogAccess) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "Access denied or pod not found",
                            code: "UNAUTHORIZED",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              const logsResult = await getPreviewDeploymentLogs(
                podId as string,
                {
                  tailLines: (tailLines as number) || 100,
                  timestamps: timestamps !== false,
                },
              );

              if (!logsResult.success) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: logsResult.error || "Failed to get logs",
                            code: "SERVER_ERROR",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: true,
                          logs: logsResult.logs,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          case "delete_preview_environment":
            try {
              const { podId } = toolArgs;
              if (!podId) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "podId is required",
                            code: "INVALID_INPUT",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              // Check access
              const hasDeleteAccess = await userHasAccessToPod(
                user.id,
                podId as string,
              );
              if (!hasDeleteAccess) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "Access denied or pod not found",
                            code: "UNAUTHORIZED",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              const deleteResult = await deletePreviewDeploymentOrchestrated({
                podId: podId as string,
              });

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: deleteResult.success,
                          error: deleteResult.error,
                          code: deleteResult.success
                            ? undefined
                            : "SERVER_ERROR",
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          case "retry_preview_deployment":
            try {
              const { podId } = toolArgs;
              if (!podId) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "podId is required",
                            code: "INVALID_INPUT",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              // Check access
              const hasRetryAccess = await userHasAccessToPod(
                user.id,
                podId as string,
              );
              if (!hasRetryAccess) {
                return {
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            success: false,
                            error: "Access denied or pod not found",
                            code: "UNAUTHORIZED",
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                  },
                  id: body.id,
                };
              }

              const retryResult = await retryFailedDeployment(podId as string);

              return {
                jsonrpc: "2.0",
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: retryResult.success,
                          error: retryResult.error,
                          code: retryResult.success
                            ? undefined
                            : "SERVER_ERROR",
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                },
                id: body.id,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                error: {
                  code: -32603,
                  message: "Internal error",
                  data:
                    error instanceof Error ? error.message : "Unknown error",
                },
                id: body.id,
              };
            }

          default:
            return {
              jsonrpc: "2.0",
              error: {
                code: -32601,
                message: "Method not found",
                data: `Tool '${toolName}' not found`,
              },
              id: body.id,
            };
        }

      default:
        return {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found",
            data: `Method '${body.method}' not supported`,
          },
          id: body.id,
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
      id: body.id,
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
      if (!body || body.jsonrpc !== "2.0" || !body.method) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request",
            },
            id: body?.id || null,
          },
          { status: 400 },
        );
      }

      // Handle the MCP request with user context
      const response = await handleMcpRequest(body, user);

      return NextResponse.json(response, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("MCP server error:", error);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
          id: null,
        },
        { status: 500 },
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
      name: "catalyst-mcp-server",
      version: "1.0.0",
      protocol: "Model Context Protocol",
      description: "MCP server for Catalyst project and namespace data",
      tools: [
        "get_projects",
        "getNamespaces",
        "getNamespace",
        "list_preview_environments",
        "get_preview_environment",
        "get_preview_logs",
        "delete_preview_environment",
        "retry_preview_deployment",
      ],
      user: {
        id: user.id,
        email: user.email,
        teams: user.teams.length,
        projects: user.projects.length,
      },
    });
  });
}

/**
 * Handle DELETE requests - cleanup (no-op in stateless mode)
 */
export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    return NextResponse.json({
      jsonrpc: "2.0",
      result: {
        message: "Session cleanup not needed in stateless mode",
      },
      id: null,
    });
  });
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, mcp-session-id",
      "Access-Control-Expose-Headers": "mcp-session-id",
    },
  });
}
