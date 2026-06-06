import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEnvironmentCR } from "@/lib/k8s-operator";

/**
 * Get Environment CR status directly from Kubernetes.
 *
 * MVP endpoint that bypasses the database and reads status directly from the
 * Environment CR. Used for polling environment status during deployment.
 *
 * The CR name is derived from the namespace: env-preview-{prNumber} -> preview-{prNumber}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ namespace: string }> },
) {
  const { namespace } = await params;

  // Authenticate the request
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Derive CR name from namespace
  // Namespace format (operator creates): {projectRef.name}-preview-{prNumber}
  // e.g., "catalyst-preview-336" -> CR name "preview-336"
  // Extract "preview-{prNumber}" from the end of the namespace
  const match = namespace.match(/preview-(\d+)$/);
  if (!match) {
    return NextResponse.json(
      {
        error:
          "Invalid namespace format. Expected: {project}-preview-{prNumber}",
      },
      { status: 400 },
    );
  }
  const crName = `preview-${match[1]}`;
  const crNamespace = "default";

  try {
    const cr = await getEnvironmentCR(crNamespace, crName);

    if (!cr) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }

    // Map CR phase to UI status
    const phase = cr.status?.phase || "Unknown";
    let status: "pending" | "deploying" | "running" | "failed" = "pending";

    switch (phase) {
      case "Ready":
        status = "running";
        break;
      case "Building":
      case "Deploying":
      case "Provisioning": // Operator uses this while setting up resources
        status = "deploying";
        break;
      case "Failed":
      case "Error":
        status = "failed";
        break;
      case "Pending":
      default:
        status = "pending";
    }

    return NextResponse.json({
      status,
      phase,
      url: cr.status?.url,
      namespace,
      crName,
      conditions: cr.status?.conditions,
    });
  } catch (error) {
    console.error("Failed to get Environment CR status:", error);
    return NextResponse.json(
      { error: "Failed to get environment status" },
      { status: 500 },
    );
  }
}
