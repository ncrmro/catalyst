import { NextRequest, NextResponse } from 'next/server';
import { createPullRequestPodJob, getPullRequestPodJobStatus, cleanupPullRequestPodJob } from '@/lib/k8s-pull-request-pod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, namespace = 'default', image, clusterName, action = 'create' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name parameter is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create':
        const result = await createPullRequestPodJob({
          name,
          namespace,
          image,
          clusterName
        });
        
        return NextResponse.json({
          success: true,
          message: 'Pull request pod job created successfully',
          job: result
        });

      case 'status':
        const { jobName } = body;
        if (!jobName) {
          return NextResponse.json(
            { error: 'jobName parameter is required for status action' },
            { status: 400 }
          );
        }
        
        const status = await getPullRequestPodJobStatus(jobName, namespace, clusterName);
        
        return NextResponse.json({
          success: true,
          status
        });

      case 'cleanup':
        await cleanupPullRequestPodJob(name, namespace, clusterName);
        
        return NextResponse.json({
          success: true,
          message: 'Pull request pod job cleaned up successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: create, status, cleanup' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Pull request pod job API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('not configured')) {
        return NextResponse.json(
          { 
            error: 'Kubernetes cluster configuration not found',
            details: error.message 
          },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Unauthorized') || error.message.includes('permission')) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            details: error.message 
          },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process pull request pod job request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}