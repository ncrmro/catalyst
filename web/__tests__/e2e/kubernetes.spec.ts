import { test, expect } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';

// Helper function to create and configure Kubernetes client
async function createKubernetesClient() {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  
  // For kind clusters and local development, handle TLS issues
  const cluster = kc.getCurrentCluster();
  // if (cluster && cluster.server.includes('127.0.0.1')) {
  //   cluster.skipTLSVerify = true;
  // }

  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const appsApi = kc.makeApiClient(k8s.AppsV1Api);
  
  return { kc, coreApi, appsApi };
}

// Test cluster connectivity by listing namespaces - this must pass for tests to continue
async function verifyClusterConnectivity() {
  const { coreApi } = await createKubernetesClient();
  
  try {
    const response = await coreApi.listNamespace();
    
    // Check if response has items directly
    const namespaces = response.items;
    expect(namespaces).toBeDefined();
    expect(namespaces.length).toBeGreaterThan(0);
    console.log('✓ Kubernetes cluster is accessible and can list namespaces');
    return true;
  } catch (error) {
    console.error('Kubernetes client error:', error);
    throw new Error(`Failed to connect to Kubernetes cluster or list namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

test.describe('Kubernetes Integration', () => {
  test('should create nginx deployment via API endpoint and verify with Kubernetes client', async ({ page, request }) => {
    // First verify cluster connectivity - this must pass for the test to continue
    await verifyClusterConnectivity();
    
    // Create deployment via API endpoint
    const response = await request.get('/api/kubernetes/deploy-nginx');
    const data = await response.json();

    // API must succeed - no fallback error handling
    expect(response.ok()).toBe(true);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Nginx deployment created successfully');
    expect(data.deployment).toBeDefined();
    expect(data.deployment.name).toMatch(/^nginx-deployment-\d+$/);
    expect(data.deployment.namespace).toBe('default');
    expect(data.deployment.replicas).toBe(1);
    expect(data.deployment.timestamp).toBeGreaterThan(0);

    console.log('Deployment created successfully:', data.deployment.name);
    
    // Verify the deployment exists using Kubernetes client
    const { appsApi } = await createKubernetesClient();
    
    try {
      const deploymentResponse = await appsApi.readNamespacedDeployment({
        name: data.deployment.name,
        namespace: 'default'
      });
      const deployment = deploymentResponse;
      
      // Verify deployment properties
      expect(deployment.metadata?.name).toBe(data.deployment.name);
      expect(deployment.metadata?.namespace).toBe('default');
      expect(deployment.metadata?.labels?.['created-by']).toBe('catalyst-web-app');
      expect(deployment.spec?.replicas).toBe(1);
      expect(deployment.spec?.template?.spec?.containers?.[0]?.image).toBe('nginx:1.25');
      
      console.log('✓ Deployment verified in cluster via Kubernetes client');
      
      // Verify the pod is running using Kubernetes client
      const { coreApi } = await createKubernetesClient();
      const podsResponse = await coreApi.listNamespacedPod({
        namespace: 'default',
        labelSelector: `deployment=${data.deployment.name}`
      });
      const pods = podsResponse;
      
      expect(pods.items.length).toBeGreaterThan(0);
      const pod = pods.items[0];
      expect(pod.metadata?.labels?.deployment).toBe(data.deployment.name);
      expect(pod.spec?.containers?.[0]?.image).toBe('nginx:1.25');
      
      console.log('✓ Pod verified in cluster via Kubernetes client');
      
      // Clean up the test deployment using Kubernetes client
      await appsApi.deleteNamespacedDeployment({
        name: data.deployment.name,
        namespace: 'default'
      });
      console.log('✓ Test deployment cleaned up');
      
    } catch (k8sError) {
      // If Kubernetes verification fails, the test must fail - no graceful handling
      throw new Error(`Kubernetes verification failed: ${k8sError instanceof Error ? k8sError.message : 'Unknown error'}`);
    }
  });

  test('should handle API endpoint correctly in web interface', async ({ page }) => {
    // Verify cluster connectivity first
    await verifyClusterConnectivity();
    
    // Go to the API endpoint directly
    await page.goto('/api/kubernetes/deploy-nginx');
    
    // The browser should show JSON response
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    
    // Parse the JSON response
    const data = JSON.parse(content as string);
    
    // The API must succeed - no error handling fallback
    expect(data.success).toBe(true);
    expect(data.message).toBe('Nginx deployment created successfully');
    expect(data.deployment).toBeDefined();
    console.log('UI test: Deployment created via browser:', data.deployment.name);
    
    // Clean up deployment created via browser test using Kubernetes client
    const { appsApi } = await createKubernetesClient();
    try {
      await appsApi.deleteNamespacedDeployment({
        name: data.deployment.name,
        namespace: 'default'
      });
      console.log('✓ Browser test deployment cleaned up');
    } catch (error) {
      throw new Error(`Failed to clean up browser test deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should verify kind cluster is accessible for testing', async () => {
    // Verify cluster connectivity using Kubernetes client - this must pass
    await verifyClusterConnectivity();
    
    // Test full permissions by creating and deleting a deployment
    const { appsApi } = await createKubernetesClient();
    
    const testDeploymentName = `test-permissions-${Date.now()}`;
    
    // Create test deployment using Kubernetes client
    const deployment: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: testDeploymentName,
        namespace: 'default',
        labels: {
          app: 'nginx',
          'created-by': 'e2e-test'
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'nginx',
            deployment: testDeploymentName
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'nginx',
              deployment: testDeploymentName
            }
          },
          spec: {
            containers: [
              {
                name: 'nginx',
                image: 'nginx:1.25',
                ports: [{ containerPort: 80 }]
              }
            ]
          }
        }
      }
    };

    try {
      await appsApi.createNamespacedDeployment({
        namespace: 'default',
        body: deployment
      });
      
      // Verify the deployment was created
      const deploymentResponse = await appsApi.readNamespacedDeployment({
        name: testDeploymentName,
        namespace: 'default'
      });
      expect(deploymentResponse.metadata?.name).toBe(testDeploymentName);
      
      // Clean up
      await appsApi.deleteNamespacedDeployment({
        name: testDeploymentName,
        namespace: 'default'
      });
      
      console.log('✓ Kind cluster is properly accessible with full permissions for testing');
    } catch (error) {
      throw new Error(`Failed to create/delete test deployment in cluster: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  test('should create project namespaces via API endpoint and verify with Kubernetes client', async ({ page, request }) => {
    // First verify cluster connectivity - this must pass for the test to continue
    await verifyClusterConnectivity();
    
    const testNamespaces: string[] = [];
    
    try {
      // Test creating namespaces for different environments
      const environments = ['production', 'staging', 'pr-1'];
      
      for (const environment of environments) {
        // Create namespace via API endpoint
        const response = await request.post('/api/kubernetes/namespaces', {
          data: {
            team: 'e2etest',
            project: 'testproject',
            environment: environment
          }
        });
        const data = await response.json();

        // API must succeed
        expect(response.ok()).toBe(true);
        expect(data.success).toBe(true);
        expect(data.namespace).toBeDefined();
        expect(data.namespace.name).toBe(`e2etest-testproject-${environment}`);
        expect(data.namespace.labels['catalyst/team']).toBe('e2etest');
        expect(data.namespace.labels['catalyst/project']).toBe('testproject');
        expect(data.namespace.labels['catalyst/environment']).toBe(environment);
        
        testNamespaces.push(data.namespace.name);

        console.log(`✓ Namespace created via API: ${data.namespace.name}`);
        
        // Verify the namespace exists in the cluster using Kubernetes client
        const { coreApi } = await createKubernetesClient();
        const namespaceResponse = await coreApi.readNamespace({ name: data.namespace.name });
        
        expect(namespaceResponse.metadata?.name).toBe(data.namespace.name);
        expect(namespaceResponse.metadata?.labels?.['catalyst/team']).toBe('e2etest');
        expect(namespaceResponse.metadata?.labels?.['catalyst/project']).toBe('testproject');
        expect(namespaceResponse.metadata?.labels?.['catalyst/environment']).toBe(environment);
        
        console.log(`✓ Namespace verified in cluster: ${data.namespace.name}`);
      }
      
      // Test duplicate creation handling
      const duplicateResponse = await request.post('/api/kubernetes/namespaces', {
        data: {
          team: 'e2etest',
          project: 'testproject',
          environment: 'production'
        }
      });
      const duplicateData = await duplicateResponse.json();
      
      expect(duplicateResponse.ok()).toBe(true);
      expect(duplicateData.success).toBe(true);
      expect(duplicateData.message).toBe('Namespace already exists');
      expect(duplicateData.namespace.created).toBe(false);
      
      console.log('✓ Duplicate namespace creation handled gracefully');
      
    } finally {
      // Clean up test namespaces using Kubernetes client
      const { coreApi } = await createKubernetesClient();
      for (const namespaceName of testNamespaces) {
        try {
          await coreApi.deleteNamespace({ name: namespaceName });
          console.log(`✓ Cleaned up namespace: ${namespaceName}`);
        } catch (error) {
          console.log(`⚠ Failed to clean up namespace ${namespaceName}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }
  });
});
