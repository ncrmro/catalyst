import { test, expect, namespaceExists, cleanupNamespace } from './fixtures/k8s-fixture';
import crypto from 'crypto';

function createSignature(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

// Test cluster connectivity by listing namespaces - this must pass for tests to continue
async function verifyClusterConnectivity(coreApi: any) {
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

test.describe('GitHub Webhook → Namespace E2E Integration', () => {

  test('should create namespace when PR is opened via GitHub webhook', async ({ request, k8s }) => {
    // First verify cluster connectivity - this must pass for the test to continue
    await verifyClusterConnectivity(k8s.coreApi);

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
      const existsBefore = await namespaceExists(k8s.coreApi, expectedNamespace);
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
      const existsAfter = await namespaceExists(k8s.coreApi, expectedNamespace);
      expect(existsAfter).toBe(true);

      // Verify namespace has correct labels
      const namespaceDetails = await k8s.coreApi.readNamespace({ name: expectedNamespace });
      expect(namespaceDetails.metadata?.labels?.['catalyst/team']).toBe('e2eowner');
      expect(namespaceDetails.metadata?.labels?.['catalyst/project']).toBe('e2erepo');
      expect(namespaceDetails.metadata?.labels?.['catalyst/environment']).toBe(`gh-pr-${prNumber}`);

      console.log(`✓ E2E test passed: Namespace ${expectedNamespace} created via webhook`);

    } finally {
      // Clean up the test namespace
      await cleanupNamespace(k8s.coreApi, expectedNamespace);
    }
  });

  test('should handle non-opened PR actions without creating namespace', async ({ request, k8s }) => {
    // First verify cluster connectivity
    await verifyClusterConnectivity(k8s.coreApi);

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
    const exists = await namespaceExists(k8s.coreApi, expectedNamespace);
    expect(exists).toBe(false);

    console.log(`✓ E2E test passed: No namespace created for non-opened PR action`);
  });

  test('should handle other PR actions without creating namespace', async ({ request, k8s }) => {
    // First verify cluster connectivity
    await verifyClusterConnectivity(k8s.coreApi);

    await test.step('Test different PR actions', async () => {
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
        const exists = await namespaceExists(k8s.coreApi, expectedNamespace);
        expect(exists).toBe(false);

        console.log(`✓ E2E test passed: No namespace created for ${action} PR action`);
      }
    });
  });
});