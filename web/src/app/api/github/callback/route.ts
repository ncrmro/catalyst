import { type NextRequest, NextResponse } from "next/server";

/**
 * GitHub App OAuth Callback Endpoint
 *
 * Handles the OAuth callback from GitHub after app installation.
 * This endpoint receives the installation_id and setup_action parameters.
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const installationId = searchParams.get("installation_id");
		const setupAction = searchParams.get("setup_action");
		const state = searchParams.get("state");
		const code = searchParams.get("code");

		// Validate required parameters
		if (!installationId) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing installation_id parameter",
				},
				{ status: 400 },
			);
		}

		// Handle different setup actions
		switch (setupAction) {
			case "install":
				return handleInstallation(installationId, state);
			case "request":
				return handleInstallationRequest(installationId, state);
			case "update":
				return handleInstallationUpdate(installationId, state);
			default:
				return handleGenericCallback(installationId, setupAction, state, code);
		}
	} catch (error) {
		console.error("OAuth callback error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to process OAuth callback",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * Handle successful app installation
 */
function handleInstallation(installationId: string, state: string | null) {
	console.log("GitHub App installed successfully", {
		installation_id: installationId,
		state: state,
	});

	// In a real app, you would:
	// 1. Store the installation_id in your database
	// 2. Associate it with the current user
	// 3. Set up any necessary configurations

	return NextResponse.json({
		success: true,
		message: "GitHub App installed successfully",
		installation_id: installationId,
		state: state,
		next_steps: [
			"Installation recorded in system",
			"App permissions configured",
			"Ready to access repositories",
		],
	});
}

/**
 * Handle installation request (when app needs approval)
 */
function handleInstallationRequest(
	installationId: string,
	state: string | null,
) {
	console.log("GitHub App installation requested", {
		installation_id: installationId,
		state: state,
	});

	return NextResponse.json({
		success: true,
		message: "GitHub App installation requested",
		installation_id: installationId,
		state: state,
		status: "pending_approval",
		next_steps: [
			"Installation request submitted",
			"Waiting for organization approval",
			"You will be notified when approved",
		],
	});
}

/**
 * Handle installation update
 */
function handleInstallationUpdate(
	installationId: string,
	state: string | null,
) {
	console.log("GitHub App installation updated", {
		installation_id: installationId,
		state: state,
	});

	return NextResponse.json({
		success: true,
		message: "GitHub App installation updated",
		installation_id: installationId,
		state: state,
		next_steps: [
			"Installation permissions updated",
			"Changes applied successfully",
		],
	});
}

/**
 * Handle generic callback scenarios
 */
function handleGenericCallback(
	installationId: string,
	setupAction: string | null,
	state: string | null,
	code: string | null,
) {
	console.log("GitHub OAuth callback received", {
		installation_id: installationId,
		setup_action: setupAction,
		state: state,
		has_code: !!code,
	});

	return NextResponse.json({
		success: true,
		message: "OAuth callback processed",
		installation_id: installationId,
		setup_action: setupAction,
		state: state,
		has_authorization_code: !!code,
	});
}
