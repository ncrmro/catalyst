import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getClusterConfig,
  handleK8sApiRequest,
  createLogStream,
  parseK8sApiRequest,
  type K8sApiRequest,
  type LogStreamEvent,
} from "@catalyst/kubernetes-client";

/**
 * Unified K8s API endpoint
 *
 * GET /api/k8s?resource=<type>&namespace=<ns>&...
 *
 * Resources:
 * - pods: List pods in namespace
 * - logs: Get logs (one-shot, supports pod filter)
 * - logs:stream: Stream logs via SSE
 * - status: Get deployment status
 *
 * Query params:
 * - resource (required): Resource type
 * - namespace (required): K8s namespace
 * - pod (optional): Pod name for single-pod operations
 * - container (optional): Container name
 * - tailLines (optional): Number of log lines (default: 100)
 * - follow (optional): Follow log stream (for logs:stream)
 * - timestamps (optional): Include timestamps in logs
 * - labelSelector (optional): Label selector for filtering
 */
export async function GET(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request params
  const searchParams = request.nextUrl.searchParams;
  const parsedRequest = parseK8sApiRequest(searchParams);

  if ("error" in parsedRequest) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  // Get cluster config
  const kubeConfig = await getClusterConfig();
  if (!kubeConfig) {
    return NextResponse.json(
      { error: "Kubernetes cluster not configured" },
      { status: 503 },
    );
  }

  // Handle streaming logs
  if (parsedRequest.resource === "logs:stream") {
    return handleLogStream(
      kubeConfig,
      parsedRequest as typeof parsedRequest & { resource: "logs:stream" },
    );
  }

  // Handle non-streaming requests
  try {
    const result = await handleK8sApiRequest(kubeConfig, parsedRequest);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("K8s API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * Handle SSE log streaming
 */
function handleLogStream(
  kubeConfig: NonNullable<Awaited<ReturnType<typeof getClusterConfig>>>,
  request: K8sApiRequest & { resource: "logs:stream" },
) {
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: LogStreamEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendError = (error: string) => {
        const data = `data: ${JSON.stringify({ error })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        const streamController = await createLogStream(kubeConfig!, request, {
          onData: sendEvent,
          onError: (error) => {
            sendError(error.message);
          },
          onEnd: () => {
            controller.close();
          },
        });

        // Send initial connection event
        const initEvent = `data: ${JSON.stringify({ connected: true, pods: streamController.pods })}\n\n`;
        controller.enqueue(encoder.encode(initEvent));

        // Handle client disconnect
        // Note: The stream controller will be cleaned up when the connection closes
      } catch (error) {
        sendError(error instanceof Error ? error.message : "Stream error");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
