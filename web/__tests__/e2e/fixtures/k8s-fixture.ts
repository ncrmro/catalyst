import { test as base } from "@playwright/test";
import { loginAndSeedForE2E } from "../helpers";
import {
  getBatchV1Api,
  getClusterConfig,
  getCoreV1Api,
  getCustomObjectsApi,
  KubeConfig,
} from "../../../src/lib/k8s-client";
import {
  BatchV1Api,
  CoreV1Api,
  CustomObjectsApi,
} from "@kubernetes/client-node";

/**
 * Interface for the Kubernetes client fixture
 */
interface K8sFixture {
  kc: KubeConfig;
  batchApi: BatchV1Api;
  coreApi: CoreV1Api;
  customApi: CustomObjectsApi;
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
    const kc = await getClusterConfig("PRIMARY");

    if (!kc) {
      throw new Error(
        "Failed to get Kubernetes configuration for PRIMARY cluster",
      );
    }

    // Get API classes
    const BatchV1ApiClass = await getBatchV1Api();
    const CoreV1ApiClass = await getCoreV1Api();
    const CustomObjectsApiClass = await getCustomObjectsApi();

    // Create API clients with the KubeConfig
    const batchApi = kc.makeApiClient(BatchV1ApiClass);
    const coreApi = kc.makeApiClient(CoreV1ApiClass);
    const customApi = kc.makeApiClient(CustomObjectsApiClass);

    // Create the fixture object
    const k8sFixture: K8sFixture = {
      kc,
      batchApi,
      coreApi,
      customApi,
    };

    // Provide the k8s fixture to the test
    await use(k8sFixture);
  },
});

// Re-export expect so tests have it available
export { expect } from "@playwright/test";

/**
 * Utility function to check if a namespace exists
 */
export async function namespaceExists(
  coreApi: CoreV1Api,
  namespaceName: string,
): Promise<boolean> {
  try {
    await coreApi.readNamespace({ name: namespaceName });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return false;
    }
    throw error;
  }
}

/**
 * Utility function to clean up a namespace
 */
export async function cleanupNamespace(
  coreApi: CoreV1Api,
  namespaceName: string,
): Promise<void> {
  try {
    await coreApi.deleteNamespace({ name: namespaceName });
    console.log(`✓ Cleaned up namespace: ${namespaceName}`);
  } catch (error) {
    if (error instanceof Error && !error.message.includes("not found")) {
      console.log(
        `⚠ Failed to clean up namespace ${namespaceName}:`,
        error.message,
      );
    }
  }
}
