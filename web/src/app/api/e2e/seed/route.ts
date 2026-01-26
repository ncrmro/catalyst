import { NextRequest, NextResponse } from "next/server";
import { seedUser } from "@/lib/seed";

/**
 * E2E test seeding endpoint
 * Only available in development/test environments
 */
export async function POST(request: NextRequest) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TESTING) {
    return NextResponse.json(
      { success: false, message: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { password, createProjects = true } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 },
      );
    }

    const result = await seedUser({
      password,
      createProjects,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
