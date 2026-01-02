import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPodsInNamespace } from "@/lib/k8s-pods";

/**
 * GET /api/environments/[namespace]/pods
 *
 * Fetches pods for an environment namespace.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ namespace: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { namespace } = await params;

	try {
		const pods = await listPodsInNamespace(namespace);
		return NextResponse.json({ pods });
	} catch (error) {
		console.error("Error fetching pods:", error);
		return NextResponse.json(
			{ error: "Failed to fetch pods", pods: [] },
			{ status: 200 }, // Return 200 with empty pods to handle gracefully
		);
	}
}
