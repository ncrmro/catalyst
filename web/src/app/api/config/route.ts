import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mocked: process.env.MOCKED === '1'
  });
}