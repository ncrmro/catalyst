import { test, expect } from '@playwright/test';
import * as k8s from '@kubernetes/client-node';
import crypto from 'crypto';

// Helper function to create and configure Kubernetes client
async function createKubernetesClient() {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  
  return { kc, coreApi };
}

// Test cluster connectivity by listing namespaces - this must pass for tests to continue
async function verifyClusterConnectivity() {
  const { coreApi } = await createKubernetesClient();
  
  try {
    const response = await coreApi.listNamespace();
    
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

// Helper function to check if namespace exists
async function namespaceExists(namespaceName: string): Promise<boolean> {
  try {
    const { coreApi } = await createKubernetesClient();
    await coreApi.readNamespace({ name: namespaceName });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return false;
    }
    throw error;
  }
}

// Helper function to clean up namespace
async function cleanupNamespace(namespaceName: string): Promise<void> {
  try {
    const { coreApi } = await createKubernetesClient();
    await coreApi.deleteNamespace({ name: namespaceName });
    console.log(`✓ Cleaned up namespace: ${namespaceName}`);
  } catch (error) {
    if (error instanceof Error && !error.message.includes('not found')) {
      console.log(`⚠ Failed to clean up namespace ${namespaceName}:`, error.message);
    }
  }
}

function createSignature(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

test.describe('GitHub Webhook → Namespace E2E Integration', () => {

  test('should create namespace when PR is opened via GitHub webhook', async ({ request }) => {
    // First verify cluster connectivity - this must pass for the test to continue
    await verifyClusterConnectivity();

    const prNumber = Math.floor(Math.random() * 10000); // Random PR number to avoid conflicts
    const payload = {
      action: 'opened',
      pull_request: {
        number: prNumber,
        title: 'E2E Test PR for namespace creation',
        user: { login: 'e2euser' }
      },
      repository: { full_name: 'e2eowner/e2erepo' }
    };
    const payloadString = JSON.stringify(payload);
    
    // For E2E tests, we'll test without signature validation (no secret configured)
    // This simulates development/testing environment where webhook secret is optional

    const expectedNamespace = `e2eowner-e2erepo-gh-pr-${prNumber}`;

    try {
      // Ensure namespace doesn't exist before test
      const existsBefore = await namespaceExists(expectedNamespace);
      expect(existsBefore).toBe(false);

      // Send webhook request without signature (simulating dev environment)
      const response = await request.post('/api/github/webhook', {
        headers: {
          'x-github-event': 'pull_request',
          'x-github-delivery': `e2e-test-delivery-${prNumber}`,
          'content-type': 'application/json'
        },
        data: payloadString
      });

      const data = await response.json();

      // Verify webhook response
      expect(response.ok()).toBe(true);
      expect(data.success).toBe(true);
      expect(data.pr_number).toBe(prNumber);
      expect(data.message).toBe('Pull request opened processed and namespace created');
      expect(data.namespace).toBeDefined();
      expect(data.namespace.name).toBe(expectedNamespace);
      expect(data.namespace.labels['catalyst/team']).toBe('e2eowner');
      expect(data.namespace.labels['catalyst/project']).toBe('e2erepo');
      expect(data.namespace.labels['catalyst/environment']).toBe(`gh-pr-${prNumber}`);

      // Verify namespace actually exists in Kubernetes cluster
      const existsAfter = await namespaceExists(expectedNamespace);
      expect(existsAfter).toBe(true);

      // Verify namespace has correct labels
      const { coreApi } = await createKubernetesClient();
      const namespaceDetails = await coreApi.readNamespace({ name: expectedNamespace });
      expect(namespaceDetails.metadata?.labels?.['catalyst/team']).toBe('e2eowner');
      expect(namespaceDetails.metadata?.labels?.['catalyst/project']).toBe('e2erepo');
      expect(namespaceDetails.metadata?.labels?.['catalyst/environment']).toBe(`gh-pr-${prNumber}`);

      console.log(`✓ E2E test passed: Namespace ${expectedNamespace} created via webhook`);

    } finally {
      // Clean up the test namespace
      await cleanupNamespace(expectedNamespace);
    }
  });

  test('should handle non-opened PR actions without creating namespace', async ({ request }) => {
    // First verify cluster connectivity
    await verifyClusterConnectivity();

    const prNumber = Math.floor(Math.random() * 10000); // Random PR number to avoid conflicts
    const payload = {
      action: 'closed',
      pull_request: {
        number: prNumber,
        title: 'E2E Test PR for non-creation',
        user: { login: 'e2euser' }
      },
      repository: { full_name: 'e2eowner/e2erepo' }
    };
    const payloadString = JSON.stringify(payload);

    const expectedNamespace = `e2eowner-e2erepo-gh-pr-${prNumber}`;

    // Send webhook request
    const response = await request.post('/api/github/webhook', {
      headers: {
        'x-github-event': 'pull_request',
        'x-github-delivery': `e2e-test-delivery-${prNumber}`,
        'content-type': 'application/json'
      },
      data: payloadString
    });

    const data = await response.json();

    // Verify webhook response
    expect(response.ok()).toBe(true);
    expect(data.success).toBe(true);
    expect(data.pr_number).toBe(prNumber);
    // When a PR is closed, the webhook tries to delete the namespace
    // If the namespace doesn't exist, it should still report success
    expect(data.message).toBe('Pull request closed processed and namespace deleted');
    expect(data.namespace_deleted).toBeDefined();

    // Verify namespace was NOT created
    const exists = await namespaceExists(expectedNamespace);
    expect(exists).toBe(false);

    console.log(`✓ E2E test passed: No namespace created for non-opened PR action`);
  });

  test('should handle other PR actions without creating namespace', async ({ request }) => {
    // First verify cluster connectivity
    await verifyClusterConnectivity();

    const actions = ['synchronize', 'edited', 'review_requested'];
    
    for (const action of actions) {
      const prNumber = Math.floor(Math.random() * 10000);
      const payload = {
        action: action,
        pull_request: {
          number: prNumber,
          title: `E2E Test PR for ${action} action`,
          user: { login: 'e2euser' }
        },
        repository: { full_name: 'e2eowner/e2erepo' }
      };
      const payloadString = JSON.stringify(payload);

      const expectedNamespace = `e2eowner-e2erepo-gh-pr-${prNumber}`;

      // Send webhook request
      const response = await request.post('/api/github/webhook', {
        headers: {
          'x-github-event': 'pull_request',
          'x-github-delivery': `e2e-test-delivery-${prNumber}`,
          'content-type': 'application/json'
        },
        data: payloadString
      });

      const data = await response.json();

      // Verify webhook response
      expect(response.ok()).toBe(true);
      expect(data.success).toBe(true);
      expect(data.pr_number).toBe(prNumber);
      expect(data.message).toBe(`Pull request ${action} processed`);
      expect(data.namespace).toBeUndefined();

      // Verify namespace was NOT created
      const exists = await namespaceExists(expectedNamespace);
      expect(exists).toBe(false);

      console.log(`✓ E2E test passed: No namespace created for ${action} PR action`);
    }
  });
});