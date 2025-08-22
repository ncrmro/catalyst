import { NextRequest, NextResponse } from 'next/server';
import { createProjectNamespace } from '../../../../lib/k8s-namespaces';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, project, environment } = body;

    // Validate required fields
    if (!team || !project || !environment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: team, project, environment' 
        },
        { status: 400 }
      );
    }

    // Validate environment is one of the supported values
    const supportedEnvironments = ['production', 'staging', 'pr-1'];
    if (!supportedEnvironments.includes(environment)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Environment must be one of: ${supportedEnvironments.join(', ')}` 
        },
        { status: 400 }
      );
    }

    try {
      const result = await createProjectNamespace({ team, project, environment });

      return NextResponse.json({
        success: true,
        message: result.created ? 'Namespace created successfully' : 'Namespace already exists',
        namespace: result
      });

    } catch (kubeError) {
      console.error('Kubernetes namespace creation error:', kubeError);
      
      let errorMessage = 'Failed to create namespace';
      let statusCode = 500;
      
      if (kubeError instanceof Error) {
        errorMessage = kubeError.message;
        
        // Handle specific Kubernetes API errors
        if (kubeError.message.includes('Unauthorized')) {
          statusCode = 401;
          errorMessage = 'Unauthorized to access Kubernetes cluster';
        } else if (kubeError.message.includes('connection refused')) {
          statusCode = 503;
          errorMessage = 'Cannot connect to Kubernetes cluster';
        }
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: statusCode }
      );
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