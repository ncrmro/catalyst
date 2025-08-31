import { test as base } from '@playwright/test';
import { loginAndSeedForE2E } from '../helpers';
import { getClusterConfig, getCoreV1Api } from '../../../src/lib/k8s-client';
import { CoreV1Api } from '@kubernetes/client-node';

/**
 * Interface for the Kubernetes client fixture
 */
interface K8sFixture {
  kc: CustomKubeConfig;
  coreApi: CoreV1Api;
}

/**
 * Extended test fixture that includes:
 * - Auto login and seed data for E2E tests
 * - A Kubernetes client configured to use the PRIMARY cluster
 */
export const test = base.extend<{
  k8s: K8sFixture;
}>({
  // Auto-login before each test
  page: async ({ page }, use, testInfo) => {
    await loginAndSeedForE2E(page, testInfo);
    await use(page);
  },
  
  // Initialize Kubernetes client using PRIMARY cluster
  k8s: async ({}, use) => {
    // Get KubeConfig for PRIMARY cluster
    const kc = await getClusterConfig('PRIMARY');
    
    if (!kc) {
      throw new Error('Failed to get Kubernetes configuration for PRIMARY cluster');
    }
    
    // Get CoreV1Api class
    const CoreV1Api = await getCoreV1Api();
    
    // Create CoreV1Api client with the KubeConfig
    const coreApi = kc.makeApiClient(CoreV1Api);
    
    // Create the fixture object
    const k8sFixture: K8sFixture = {
      kc,
      coreApi
    };
    
    // Provide the k8s fixture to the test
    await use(k8sFixture);
  }
});

// Re-export expect so tests have it available
export { expect } from '@playwright/test';

/**
 * Utility function to check if a namespace exists
 */
export async function namespaceExists(coreApi: CoreV1Api, namespaceName: string): Promise<boolean> {
  try {
    await coreApi.readNamespace({ name: namespaceName });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return false;
    }
    throw error;
  }
}

/**
 * Utility function to clean up a namespace
 */
export async function cleanupNamespace(coreApi: CoreV1Api, namespaceName: string): Promise<void> {
  try {
    await coreApi.deleteNamespace({ name: namespaceName });
    console.log(`✓ Cleaned up namespace: ${namespaceName}`);
  } catch (error) {
    if (error instanceof Error && !error.message.includes('not found')) {
      console.log(`⚠ Failed to clean up namespace ${namespaceName}:`, error.message);
    }
  }
}
