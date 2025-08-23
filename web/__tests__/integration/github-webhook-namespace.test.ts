import { createMocks } from 'node-mocks-http';
import { POST } from '../../src/app/api/github/webhook/route';
import crypto from 'crypto';
import * as k8s from '@kubernetes/client-node';

describe('GitHub Webhook → Namespace Integration', () => {
  const mockWebhookSecret = 'test-webhook-secret';

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = mockWebhookSecret;
  });

  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  function createSignature(payload: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  // Helper function to create and configure Kubernetes client
  async function createKubernetesClient() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    
    return { kc, coreApi };
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

  it('should create namespace when PR is opened via GitHub webhook', async () => {
    const prNumber = 42;
    const payload = {
      action: 'opened',
      pull_request: {
        number: prNumber,
        title: 'Test PR for namespace creation',
        user: { login: 'testuser' }
      },
      repository: { full_name: 'testowner/testrepo' }
    };
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, mockWebhookSecret);

    const expectedNamespace = `testowner-testrepo-gh-pr-${prNumber}`;

    try {
      // Ensure namespace doesn't exist before test
      const existsBefore = await namespaceExists(expectedNamespace);
      expect(existsBefore).toBe(false);

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'pull_request',
          'x-github-delivery': 'test-delivery-123',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      // Verify webhook response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pr_number).toBe(prNumber);
      expect(data.message).toBe('Pull request opened processed and namespace created');
      expect(data.namespace).toBeDefined();
      expect(data.namespace.name).toBe(expectedNamespace);
      expect(data.namespace.labels['catalyst/team']).toBe('testowner');
      expect(data.namespace.labels['catalyst/project']).toBe('testrepo');
      expect(data.namespace.labels['catalyst/environment']).toBe(`gh-pr-${prNumber}`);

      // Verify namespace actually exists in Kubernetes cluster
      const existsAfter = await namespaceExists(expectedNamespace);
      expect(existsAfter).toBe(true);

      // Verify namespace has correct labels
      const { coreApi } = await createKubernetesClient();
      const namespaceDetails = await coreApi.readNamespace({ name: expectedNamespace });
      expect(namespaceDetails.metadata?.labels?.['catalyst/team']).toBe('testowner');
      expect(namespaceDetails.metadata?.labels?.['catalyst/project']).toBe('testrepo');
      expect(namespaceDetails.metadata?.labels?.['catalyst/environment']).toBe(`gh-pr-${prNumber}`);

      console.log(`✓ Integration test passed: Namespace ${expectedNamespace} created via webhook`);

    } finally {
      // Clean up the test namespace
      await cleanupNamespace(expectedNamespace);
    }
  });

  it('should handle non-opened PR actions without creating namespace', async () => {
    const prNumber = 43;
    const payload = {
      action: 'closed',
      pull_request: {
        number: prNumber,
        title: 'Test PR for non-creation',
        user: { login: 'testuser' }
      },
      repository: { full_name: 'testowner/testrepo' }
    };
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, mockWebhookSecret);

    const expectedNamespace = `testowner-testrepo-gh-pr-${prNumber}`;

    const { req } = createMocks({
      method: 'POST',
      headers: {
        'x-github-event': 'pull_request',
        'x-github-delivery': 'test-delivery-124',
        'x-hub-signature-256': signature,
        'content-type': 'application/json'
      },
      body: payloadString,
    });

    req.text = jest.fn().mockResolvedValue(payloadString);

    const response = await POST(req as any);
    const data = await response.json();

    // Verify webhook response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pr_number).toBe(prNumber);
    expect(data.message).toBe('Pull request closed processed');
    expect(data.namespace).toBeUndefined();

    // Verify namespace was NOT created
    const exists = await namespaceExists(expectedNamespace);
    expect(exists).toBe(false);

    console.log(`✓ Integration test passed: No namespace created for non-opened PR action`);
  });

  it('should handle webhook gracefully when Kubernetes is unavailable', async () => {
    // This test ensures the webhook doesn't fail completely if K8s is down
    // We'll mock a scenario where namespace creation fails but webhook still processes
    
    const prNumber = 44;
    const payload = {
      action: 'opened',
      pull_request: {
        number: prNumber,
        title: 'Test PR for K8s failure handling',
        user: { login: 'testuser' }
      },
      repository: { full_name: 'testowner/testrepo' }
    };
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, mockWebhookSecret);

    // Temporarily break the Kubernetes config to simulate failure
    const originalKubeConfig = process.env.KUBECONFIG;
    process.env.KUBECONFIG = '/tmp/nonexistent-kubeconfig';

    try {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'x-github-event': 'pull_request',
          'x-github-delivery': 'test-delivery-125',
          'x-hub-signature-256': signature,
          'content-type': 'application/json'
        },
        body: payloadString,
      });

      req.text = jest.fn().mockResolvedValue(payloadString);

      const response = await POST(req as any);
      const data = await response.json();

      // Webhook should still succeed but report namespace creation failure
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pr_number).toBe(prNumber);
      expect(data.message).toBe('Pull request opened processed but namespace creation failed');
      expect(data.namespace_error).toBeDefined();

      console.log(`✓ Integration test passed: Webhook handles K8s failure gracefully`);

    } finally {
      // Restore original KUBECONFIG
      if (originalKubeConfig) {
        process.env.KUBECONFIG = originalKubeConfig;
      } else {
        delete process.env.KUBECONFIG;
      }
    }
  });
});