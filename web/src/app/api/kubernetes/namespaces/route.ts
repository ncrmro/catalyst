import { NextRequest, NextResponse } from 'next/server';
import { createKubernetesNamespace } from '../../../../actions/kubernetes';

/**
 * Minimal API wrapper for E2E testing of the Kubernetes namespace action
 * This converts the action result to HTTP responses for testing purposes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, project, environment } = body;

    const result = await createKubernetesNamespace(team, project, environment);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      // Map action errors to appropriate HTTP status codes
      let statusCode = 400;
      if (result.error?.includes('Unauthorized')) {
        statusCode = 401;
      } else if (result.error?.includes('connection refused')) {
        statusCode = 503;
      } else if (result.error?.includes('Failed to create namespace')) {
        statusCode = 500;
      }

      return NextResponse.json(result, { status: statusCode });
    }

  } catch (error) {
    console.error('Error processing namespace creation request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid request body' 
      },
      { status: 400 }
    );
  }
}