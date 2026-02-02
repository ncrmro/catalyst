import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  // In mocked mode, skip database check
  if (process.env.MOCKED === "1") {
    return NextResponse.json({ status: "ok", mocked: true });
  }

  try {
    // Simple query to test database connectivity
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Liveness check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
