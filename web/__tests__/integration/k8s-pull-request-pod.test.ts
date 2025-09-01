/**
 * Integration test for Pull Request pod manifest functionality
 * 
 * This test verifies that we can:
 * 1. Create a service account with buildx permissions
 * 2. Deploy a job manifest that uses the service account
 * 3. Verify the job runs successfully and creates a pod
 * 4. Clean up created resources
 * 
 * Note: This test requires a valid Kubernetes configuration available in the
 * KUBECONFIG_PRIMARY environment variable or from the default kubeconfig.
 */

import { 
  createPullRequestPodJob, 
  getPullRequestPodJobStatus, 
  cleanupPullRequestPodJob,
  createBuildxServiceAccount 
} from '../../src/lib/k8s-pull-request-pod';
import { getClusterConfig, getCoreV1Api } from '../../src/lib/k8s-client';

import { beforeAll, afterAll, describe, it, expect } from 'vitest';

describe('Pull Request Pod Manifest Integration', () => {
  const testNamespace = 'default';
  const testName = `test-pr-${Date.now()}`;
  let createdJobName: string;

  beforeAll(async () => {
    // Verify KUBECONFIG_PRIMARY is set - test will fail if it's not defined
    expect(process.env.KUBECONFIG_PRIMARY).toBeDefined();
    
    // Clean up any existing resources from previous test runs to avoid conflicts
    try {
      await cleanupPullRequestPodJob(testName, testNamespace, 'PRIMARY');
    } catch (error) {
      // Ignore cleanup errors as resources might not exist
      console.warn('Pre-test cleanup (expected if no existing resources):', error);
    }
  });

  afterAll(async () => {
    // Clean up any created resources
    try {
      await cleanupPullRequestPodJob(testName, testNamespace, 'PRIMARY');
    } catch (error) {
      console.warn('Cleanup failed (this is expected if tests failed):', error);
    }
  });

  describe('Service Account Creation', () => {
    it('should create a service account with buildx permissions', async () => {
      // Create the service account
      try {
        await createBuildxServiceAccount(testName, testNamespace, 'PRIMARY');
      } catch (error: unknown) {
        // If service account already exists, that's fine for this test
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('already exists')) {
          throw error;
        }
      }

      // Verify service account exists and has correct configuration
      const kc = await getClusterConfig('PRIMARY');
      expect(kc).not.toBeNull();

      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const serviceAccountName = `${testName}-buildx-sa`;
      const serviceAccount = await coreApi.readNamespacedServiceAccount({
        name: serviceAccountName,
        namespace: testNamespace
      });

      expect(serviceAccount).toBeDefined();
      expect(serviceAccount.metadata?.name).toBe(serviceAccountName);
      expect(serviceAccount.metadata?.labels?.['app']).toBe('catalyst-buildx');
      expect(serviceAccount.metadata?.labels?.['created-by']).toBe('catalyst-web-app');
    }, 30000);
  });

  describe('Job Creation and Execution', () => {
    it('should create and execute a pull request pod job successfully', async () => {
      // Create the job
      const result = await createPullRequestPodJob({
        name: testName,
        namespace: testNamespace,
        image: 'alpine:latest', // Use lighter image for testing
        clusterName: 'PRIMARY'
      });

      expect(result).toBeDefined();
      expect(result.created).toBe(true);
      expect(result.jobName).toContain(testName);
      expect(result.namespace).toBe(testNamespace);

      createdJobName = result.jobName;

      // Verify job was created in Kubernetes
      const kc = await getClusterConfig('PRIMARY');
      expect(kc).not.toBeNull();

      const { getBatchV1Api } = await import('../../src/lib/k8s-pull-request-pod');
      const BatchV1Api = await getBatchV1Api();
      const batchApi = kc!.makeApiClient(BatchV1Api);

      const job = await batchApi.readNamespacedJob({
        name: createdJobName,
        namespace: testNamespace
      });

      expect(job).toBeDefined();
      expect(job.metadata?.name).toBe(createdJobName);
      expect(job.metadata?.labels?.['app']).toBe('catalyst-pr-job');
      expect(job.metadata?.labels?.['pr-name']).toBe(testName);

      // Verify service account is set
      expect(job.spec?.template?.spec?.serviceAccountName).toBe(`${testName}-buildx-sa`);
    }, 60000);

    it('should verify the job creates a pod that runs successfully', async () => {
      // Skip this test if job creation failed in the previous test
      if (!createdJobName) {
        console.warn('Skipping pod verification test because job was not created');
        return;
      }

      // Wait a bit for the job to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check job status
      const status = await getPullRequestPodJobStatus(createdJobName, testNamespace, 'PRIMARY');
      
      expect(status).toBeDefined();
      expect(status.jobName).toBe(createdJobName);
      
      // Job should be either active (running) or completed
      expect(status.active! + status.succeeded!).toBeGreaterThan(0);

      // Verify a pod was created for this job
      const kc = await getClusterConfig('PRIMARY');
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const pods = await coreApi.listNamespacedPod({
        namespace: testNamespace,
        labelSelector: `job-name=${createdJobName}`
      });

      expect(pods.items.length).toBeGreaterThan(0);
      
      const pod = pods.items[0];
      expect(pod.metadata?.labels?.['app']).toBe('catalyst-pr-job');
      expect(pod.spec?.serviceAccountName).toBe(`${testName}-buildx-sa`);

      // Pod should be scheduled (have a node assigned)
      expect(pod.spec?.nodeName).toBeDefined();
    }, 90000);
  });

  describe('Resource Cleanup', () => {
    it('should clean up all created resources', async () => {
      // Clean up resources
      await cleanupPullRequestPodJob(testName, testNamespace, 'PRIMARY');

      // Verify service account is deleted
      const kc = await getClusterConfig('PRIMARY');
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const serviceAccountName = `${testName}-buildx-sa`;
      
      try {
        await coreApi.readNamespacedServiceAccount({
          name: serviceAccountName,
          namespace: testNamespace
        });
        // If we reach here, the service account still exists (should not happen)
        expect(false).toBe(true);
      } catch (error: unknown) {
        // Expect a 404 error indicating the service account was deleted
        // The Kubernetes client wraps errors, so check both possible structures
        const errorObj = error as {
          response?: { statusCode?: number; status?: number };
          statusCode?: number;
          status?: number;
          code?: number;
          body?: string;
        };
        
        const statusCode = errorObj.response?.statusCode || errorObj.response?.status || errorObj.statusCode || errorObj.status;
        const errorCode = errorObj.code;
        
        // Accept either 404 status code or 404 in the error body
        const is404Error = statusCode === 404 || errorCode === 404 || 
                          (errorObj.body && typeof errorObj.body === 'string' && errorObj.body.includes('"code":404'));
        
        expect(is404Error).toBe(true);
      }

      // Verify role is deleted
      const { getRbacAuthorizationV1Api } = await import('../../src/lib/k8s-pull-request-pod');
      const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();
      const rbacApi = kc!.makeApiClient(RbacAuthorizationV1Api);

      const roleName = `${testName}-buildx-role`;
      
      try {
        await rbacApi.readNamespacedRole({
          name: roleName,
          namespace: testNamespace
        });
        // If we reach here, the role still exists (should not happen)
        expect(false).toBe(true);
      } catch (error: unknown) {
        // Expect a 404 error indicating the role was deleted
        const errorObj = error as {
          response?: { statusCode?: number; status?: number };
          statusCode?: number;
          status?: number;
          code?: number;
          body?: string;
        };
        
        const statusCode = errorObj.response?.statusCode || errorObj.response?.status || errorObj.statusCode || errorObj.status;
        const errorCode = errorObj.code;
        
        const is404Error = statusCode === 404 || errorCode === 404 || 
                          (errorObj.body && typeof errorObj.body === 'string' && errorObj.body.includes('"code":404'));
        
        expect(is404Error).toBe(true);
      }
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid cluster configuration gracefully', async () => {
      await expect(
        createPullRequestPodJob({
          name: 'test-invalid',
          clusterName: 'NONEXISTENT'
        })
      ).rejects.toThrow('Kubernetes cluster "NONEXISTENT" not found');
    });

    it('should handle job status check for non-existent job', async () => {
      await expect(
        getPullRequestPodJobStatus('non-existent-job', testNamespace, 'PRIMARY')
      ).rejects.toThrow();
    });
  });
});