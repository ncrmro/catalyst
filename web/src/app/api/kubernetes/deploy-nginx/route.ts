import { NextResponse } from 'next/server';
import { KubeConfig, getAppsV1Api } from '../../../../lib/k8s-client';

export async function GET() {
  try {
    // Initialize Kubernetes client
    const kc = new KubeConfig();
    
    // Load config from default locations (in-cluster or kubeconfig)
    try {
      await kc.loadFromDefault();
    } catch (error) {
      console.error('Failed to load Kubernetes config:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to load Kubernetes configuration',
          message: 'Make sure kubeconfig is properly configured or running in a Kubernetes cluster'
        },
        { status: 500 }
      );
    }

    const AppsV1Api = await getAppsV1Api();
    const k8sApi = kc.makeApiClient(AppsV1Api);

    // Generate a unique name for the deployment
    const timestamp = Date.now();
    const deploymentName = `nginx-deployment-${timestamp}`;

    // Define the nginx deployment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deployment: any = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deploymentName,
        namespace: 'default',
        labels: {
          app: 'nginx',
          'created-by': 'catalyst-web-app'
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'nginx',
            deployment: deploymentName
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'nginx',
              deployment: deploymentName
            }
          },
          spec: {
            containers: [
              {
                name: 'nginx',
                image: 'nginx:1.25',
                ports: [
                  {
                    containerPort: 80
                  }
                ],
                resources: {
                  requests: {
                    memory: '64Mi',
                    cpu: '50m'
                  },
                  limits: {
                    memory: '128Mi',
                    cpu: '100m'
                  }
                }
              }
            ]
          }
        }
      }
    };

    // Create the deployment
    const response = await k8sApi.createNamespacedDeployment({
      namespace: 'default',
      body: deployment
    });

    console.log(`Nginx deployment created: ${deploymentName}`, {
      name: response.metadata?.name,
      namespace: response.metadata?.namespace,
      replicas: response.spec?.replicas,
      timestamp
    });

    return NextResponse.json({
      success: true,
      message: 'Nginx deployment created successfully',
      deployment: {
        name: deploymentName,
        namespace: 'default',
        replicas: 1,
        timestamp
      }
    });

  } catch (error) {
    console.error('Error creating nginx deployment:', error);
    
    let errorMessage = 'Failed to create nginx deployment';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific Kubernetes API errors
      if (error.message.includes('Unauthorized')) {
        statusCode = 401;
        errorMessage = 'Unauthorized to access Kubernetes cluster';
      } else if (error.message.includes('connection refused')) {
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
}