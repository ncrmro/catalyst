import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
	getPreviewDeploymentStatusFull,
	userHasAccessToPod,
} from "@/models/preview-environments";

/**
 * SSE endpoint for streaming preview environment status updates.
 *
 * Streams real-time status updates during deployment.
 * Closes connection when deployment reaches terminal state (running/failed).
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: podId } = await params;

	// Authenticate the request
	const session = await auth();
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Check authorization
	const hasAccess = await userHasAccessToPod(session.user.id, podId);
	if (!hasAccess) {
		return new Response("Forbidden", { status: 403 });
	}

	// Set up SSE response
	const encoder = new TextEncoder();
	let isStreamClosed = false;

	const stream = new ReadableStream({
		async start(controller) {
			const sendEvent = (
				type: "status" | "ready" | "error",
				data: Record<string, unknown>,
			) => {
				if (isStreamClosed) return;
				const event = JSON.stringify({ type, data });
				controller.enqueue(encoder.encode(`data: ${event}\n\n`));
			};

			const closeStream = () => {
				if (isStreamClosed) return;
				isStreamClosed = true;
				controller.close();
			};

			// Poll status every 2 seconds
			const pollInterval = 2000;
			let lastStatus: string | null = null;

			const pollStatus = async () => {
				if (isStreamClosed) return;

				try {
					const result = await getPreviewDeploymentStatusFull(podId);

					if (!result.success) {
						sendEvent("error", {
							message: result.error || "Failed to get status",
							retryable: true,
						});
						return;
					}

					const currentStatus = result.status?.dbStatus ?? null;

					// Only send update if status changed
					if (currentStatus !== lastStatus) {
						lastStatus = currentStatus;

						if (currentStatus === "running") {
							// Deployment complete
							sendEvent("ready", {
								publicUrl: result.status?.publicUrl,
								status: currentStatus,
							});
							closeStream();
							return;
						} else if (currentStatus === "failed") {
							// Deployment failed
							sendEvent("error", {
								message: "Deployment failed",
								retryable: true,
								status: currentStatus,
							});
							closeStream();
							return;
						} else {
							// Still in progress
							sendEvent("status", {
								status: currentStatus,
								message: getStatusMessage(currentStatus),
							});
						}
					}

					// Continue polling if not in terminal state
					if (!isStreamClosed) {
						setTimeout(pollStatus, pollInterval);
					}
				} catch (error) {
					console.error("SSE poll error:", error);
					sendEvent("error", {
						message: error instanceof Error ? error.message : "Unknown error",
						retryable: true,
					});
				}
			};

			// Start polling
			await pollStatus();

			// Handle client disconnect
			request.signal.addEventListener("abort", () => {
				closeStream();
			});
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Connection: "keep-alive",
		},
	});
}

/**
 * Get human-readable status message
 */
function getStatusMessage(status: string | null | undefined): string {
	switch (status) {
		case "pending":
			return "Environment creation pending...";
		case "deploying":
			return "Deploying environment...";
		case "running":
			return "Environment is running";
		case "failed":
			return "Deployment failed";
		case "deleting":
			return "Deleting environment...";
		default:
			return "Checking status...";
	}
}
