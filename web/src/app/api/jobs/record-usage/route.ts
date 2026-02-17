/**
 * Daily Usage Recording API Route
 *
 * Endpoint for GitHub Actions cron job to record daily environment usage
 * and report to Stripe Billing Meters.
 *
 * Authentication: Bearer token via JOBS_SECRET environment variable
 * Only available when BILLING_ENABLED=true
 */

import { NextRequest, NextResponse } from "next/server";
import { isBillingEnabled, getBilling } from "@/lib/billing-guard";
import { db } from "@/db";

/**
 * POST /api/jobs/record-usage
 *
 * Records daily environment usage for all paid teams and reports to Stripe.
 *
 * Headers:
 * - Authorization: Bearer <JOBS_SECRET>
 *
 * Query parameters:
 * - date (optional): ISO date string for usage date (defaults to yesterday)
 * - dryRun (optional): If "true", records usage but doesn't report to Stripe
 *
 * Returns:
 * - 200: Job completed successfully
 * - 401: Missing or invalid authorization token
 * - 404: Billing not enabled
 * - 500: Job failed
 */
export async function POST(request: NextRequest) {
  // Check if billing is enabled
  if (!isBillingEnabled()) {
    return NextResponse.json(
      { error: "Billing is not enabled" },
      { status: 404 },
    );
  }

  // Authenticate via bearer token
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.JOBS_SECRET;

  if (!expectedToken) {
    console.error("[record-usage] JOBS_SECRET not configured");
    return NextResponse.json(
      { error: "Job authentication not configured" },
      { status: 500 },
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (token !== expectedToken) {
    console.warn("[record-usage] Invalid job token");
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const dryRun = searchParams.get("dryRun") === "true";

  let usageDate: Date | undefined;
  if (dateParam) {
    try {
      usageDate = new Date(dateParam);
      if (isNaN(usageDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date parameter" },
          { status: 400 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid date parameter" },
        { status: 400 },
      );
    }
  }

  // Load billing package and run the job
  try {
    const billing = await getBilling();
    if (!billing) {
      console.error("[record-usage] Failed to load billing package");
      return NextResponse.json(
        { error: "Billing package failed to load" },
        { status: 500 },
      );
    }

    console.info("[record-usage] Starting usage recording job", {
      date: usageDate?.toISOString() ?? "yesterday",
      dryRun,
    });

    const result = await billing.runDailyUsageJob(db, {
      date: usageDate,
      reportToStripe: !dryRun,
    });

    console.info("[record-usage] Job completed", {
      date: result.date.toISOString(),
      totalTeams: result.totalTeams,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });

    return NextResponse.json({
      success: true,
      date: result.date.toISOString(),
      totalTeams: result.totalTeams,
      successCount: result.successCount,
      failureCount: result.failureCount,
      failures: result.results
        .filter((r) => !r.success)
        .map((r) => ({
          teamId: r.teamId,
          error: r.error,
        })),
    });
  } catch (error) {
    console.error("[record-usage] Job failed", { error });

    return NextResponse.json(
      {
        error: "Usage recording job failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
