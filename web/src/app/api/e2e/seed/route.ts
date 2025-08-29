import { NextRequest, NextResponse } from 'next/server';
import { seedProjectsForCurrentUser } from '@/db/e2e-seed';

/**
 * API endpoint for seeding projects for E2E testing
 * This endpoint allows E2E tests to ensure they have projects available
 * Only available in development/test environments
 */
export async function POST(request: NextRequest) {
  // Only allow this endpoint in development or test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'E2E seeding is not available in production' },
      { status: 403 }
    );
  }

  try {
    const result = await seedProjectsForCurrentUser();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in E2E seed endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error during seeding' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'E2E seeding is not available in production' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    status: 'E2E seeding endpoint available',
    environment: process.env.NODE_ENV
  });
}