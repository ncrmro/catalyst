import { NextRequest, NextResponse } from "next/server";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

/**
 * GitHub App Registration Endpoint
 *
 * This endpoint initiates the GitHub App installation process by redirecting
 * users to GitHub's app installation page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "default";

    // GitHub App installation URL
    const installationUrl = `https://github.com/apps/${GITHUB_CONFIG.APP_ID}/installations/new`;

    // Add state parameter for security and tracking
    const redirectUrl = `${installationUrl}?state=${encodeURIComponent(state)}`;

    return NextResponse.json({
      success: true,
      message: "GitHub App registration initiated",
      installation_url: redirectUrl,
      state: state,
    });
  } catch (error) {
    console.error("GitHub App registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initiate GitHub App registration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Handle POST requests for custom registration flows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { installation_id, setup_action } = body;

    if (setup_action === "install") {
      // Handle successful installation
      return NextResponse.json({
        success: true,
        message: "GitHub App installed successfully",
        installation_id: installation_id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Registration request processed",
      data: body,
    });
  } catch (error) {
    console.error("GitHub App registration POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process registration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
