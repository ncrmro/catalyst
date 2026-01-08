/**
 * Integration Test: Web App <-> Operator Contract
 *
 * This test verifies that the Web App can correctly interact with the Kubernetes API
 * to manage Environment CRs, which is the primary interface with the Operator.
 *
 * It validates:
 * 1. CR Creation: Can we create an Environment CR with the correct spec?
 * 2. Status Polling: Can we read the CR status after the Operator (simulated) updates it?
 * 3. Contract adherence: Does the spec match the v1alpha1 definition?
 *
 * To run: npm run test:integration -- k8s-environment-cr
 */

import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  createEnvironmentClient,
  getClusterConfig,
  type Environment,
} from "@catalyst/kubernetes-client";
import {
  AppsV1Api,
  CoreV1Api,
  CustomObjectsApi,
} from "@kubernetes/client-node";

describe("Web <-> Operator Contract Integration", () => {
  const testNamespace = "default"; // CRs live in default or catalyst-system
  const testEnvName = `test-integration-${Date.now()}`;

  // Test data
  const testProject = "test-project";
  const testRepo = "test-repo";
  const testCommit = "abc1234567890abcdef";
  const testBranch = "feature/integration-test";
  const testPrNumber = 1234;

  let client: Awaited<ReturnType<typeof createEnvironmentClient>>;
  let customApi: CustomObjectsApi;

  beforeAll(async () => {
    // 1. Verify cluster connection
    const kc = await getClusterConfig();
    expect(kc).toBeDefined();

    // 2. Initialize clients
    client = await createEnvironmentClient();
    customApi = kc.makeApiClient(CustomObjectsApi);
  });

  afterAll(async () => {
    // Cleanup: Delete the test CR
    try {
      await client.delete(testEnvName, testNamespace);
      console.log(`Deleted test environment: ${testEnvName}`);
    } catch (error) {
      console.warn(
        `Cleanup failed for ${testEnvName} (might not exist):`,
        error,
      );
    }
  });

  it("should create an Environment CR with the correct spec", async () => {
    // Act: Create the CR
    const result = await client.create(
      {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "Environment",
        metadata: {
          name: testEnvName,
          labels: {
            "catalyst.dev/test": "true",
            "catalyst.dev/project": testProject,
          },
        },
        spec: {
          projectRef: { name: testProject },
          type: "development",
          // New Array Structure for Sources
          sources: [
            {
              name: "main",
              commitSha: testCommit,
              branch: testBranch,
              prNumber: testPrNumber,
            },
          ],
          config: {
            envVars: [{ name: "TEST_MODE", value: "true" }],
          },
          ingress: {
            enabled: true,
            host: `${testEnvName}.test.local`,
          },
        },
      },
      testNamespace,
    );

    // Assert: Check the returned object
    expect(result.metadata.name).toBe(testEnvName);
    expect(result.spec.projectRef.name).toBe(testProject);
    expect(result.spec.sources).toHaveLength(1);
    expect(result.spec.sources[0].commitSha).toBe(testCommit);
    expect(result.spec.sources[0].name).toBe("main");

    // Verify directly via raw CustomObjectsApi to ensure no client-side masking
    const rawCr = (await customApi.getNamespacedCustomObject({
      group: "catalyst.catalyst.dev",
      version: "v1alpha1",
      namespace: testNamespace,
      plural: "environments",
      name: testEnvName,
    })) as { spec: { sources: Array<{ commitSha: string }> } };

    expect(rawCr.spec.sources[0].commitSha).toBe(testCommit);
  });

  it("should detect status updates (simulating Operator)", async () => {
    // Act: Simulate Operator updating the status to "Ready"
    // Note: In real life, the Operator does this. Here we patch it manually.
    const statusPatch = {
      status: {
        phase: "Ready",
        url: `https://${testEnvName}.test.local`,
        conditions: [
          {
            type: "Ready",
            status: "True",
            lastTransitionTime: new Date().toISOString(),
            reason: "IntegrationTest",
            message: "Simulated readiness",
          },
        ],
      },
    };

    // Use raw API to patch status subresource
    await customApi.patchNamespacedCustomObjectStatus({
      group: "catalyst.catalyst.dev",
      version: "v1alpha1",
      namespace: testNamespace,
      plural: "environments",
      name: testEnvName,
      body: statusPatch,
    });

    // Act: Fetch using our Client
    const updatedEnv = await client.get(testEnvName, testNamespace);

    // Assert: Verify client sees the new status
    expect(updatedEnv).not.toBeNull();
    expect(updatedEnv!.status).toBeDefined();
    expect(updatedEnv!.status?.phase).toBe("Ready");
    expect(updatedEnv!.status?.url).toBe(`https://${testEnvName}.test.local`);
    expect(updatedEnv!.status?.conditions).toHaveLength(1);
  });

  it("should handle multi-source configuration", async () => {
    // Act: Update with multiple sources (e.g. frontend + backend)
    const multiSourceEnvName = `${testEnvName}-multi`;

    const result = await client.create(
      {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "Environment",
        metadata: { name: multiSourceEnvName },
        spec: {
          projectRef: { name: testProject },
          type: "development",
          sources: [
            {
              name: "frontend",
              commitSha: "sha-frontend",
              branch: "main",
            },
            {
              name: "backend",
              commitSha: "sha-backend",
              branch: "main",
            },
          ],
        },
      },
      testNamespace,
    );

    expect(result.spec.sources).toHaveLength(2);
    expect(
      result.spec.sources.find((s) => s.name === "frontend"),
    ).toBeDefined();
    expect(result.spec.sources.find((s) => s.name === "backend")).toBeDefined();

    // Cleanup
    await client.delete(multiSourceEnvName, testNamespace);
  });
});
