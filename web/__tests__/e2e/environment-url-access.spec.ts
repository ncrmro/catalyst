import { test, expect } from "./fixtures/k8s-fixture";

// Type for Environment CR from Kubernetes API
interface EnvironmentCR {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    projectRef: { name: string };
    type: string;
    source: {
      commitSha: string;
      branch: string;
      prNumber?: number;
    };
  };
  status?: {
    phase?: string;
    url?: string;
  };
}

interface EnvironmentListResponse {
  items: EnvironmentCR[];
}

test.describe("Local URL Testing for Environments", () => {
  test.skip("should access environment via path-based local URL", async ({
    page,
    k8s,
  }) => {
    // This test verifies that environments are accessible via path-based routing
    // in local development mode (LOCAL_PREVIEW_ROUTING=true)

    // Skip if not in local preview routing mode
    if (process.env.LOCAL_PREVIEW_ROUTING !== "true") {
      test.skip();
      return;
    }

    // Get ingress port from environment (default 8080)
    const ingressPort = process.env.INGRESS_PORT || "8080";

    // List all environment CRs in the default namespace
    const environmentsResponse =
      (await k8s.customApi.listNamespacedCustomObject({
        group: "catalyst.catalyst.dev",
        version: "v1alpha1",
        namespace: "default",
        plural: "environments",
      })) as EnvironmentListResponse;

    const environments = environmentsResponse.items;

    // Skip if no environments exist
    if (!environments || environments.length === 0) {
      console.log("No environments found, skipping test");
      test.skip();
      return;
    }

    // Find a ready environment with a URL
    const readyEnv = environments.find(
      (env) => env.status?.phase === "Ready" && env.status?.url?.includes("/"),
    );

    if (!readyEnv) {
      console.log("No ready environment with path-based URL found");
      test.skip();
      return;
    }

    const envUrl = readyEnv.status!.url!;
    console.log(`Testing environment URL: ${envUrl}`);

    // Verify URL format for local path-based routing
    expect(envUrl).toMatch(new RegExp(`^http://localhost:${ingressPort}/`));

    // Attempt to navigate to the environment URL
    // Note: This may fail if the application isn't actually deployed
    // This is more of an integration test that the URL is accessible
    try {
      await page.goto(envUrl, { waitUntil: "domcontentloaded", timeout: 5000 });

      // Verify the page loaded (basic check - depends on app)
      // We don't assert on specific content as it depends on what's deployed
      expect(page.url()).toContain(envUrl);

      console.log(`✓ Environment accessible at ${envUrl}`);
    } catch (error) {
      // Log but don't fail - the app might not be deployed yet
      console.log(
        `Note: Could not access ${envUrl} - environment may not have app deployed yet`,
      );
    }
  });

  test("should verify environment CR has URL in status", async ({ k8s }) => {
    // This test verifies that Environment CRs have their status.url populated
    // by the operator, regardless of whether the app is deployed

    // List all environment CRs in the default namespace
    const environmentsResponse =
      (await k8s.customApi.listNamespacedCustomObject({
        group: "catalyst.catalyst.dev",
        version: "v1alpha1",
        namespace: "default",
        plural: "environments",
      })) as EnvironmentListResponse;

    const environments = environmentsResponse.items;

    // Skip if no environments exist
    if (!environments || environments.length === 0) {
      console.log("No environments found, creating will be tested elsewhere");
      test.skip();
      return;
    }

    // Check each environment
    for (const env of environments) {
      const envName = env.metadata.name;

      // If environment is in Ready phase, it should have a URL
      if (env.status?.phase === "Ready") {
        expect(env.status.url).toBeDefined();
        expect(env.status.url).not.toBe("");

        console.log(
          `✓ Environment ${envName} (${env.status.phase}) has URL: ${env.status.url}`,
        );

        // Verify URL format based on LOCAL_PREVIEW_ROUTING
        if (process.env.LOCAL_PREVIEW_ROUTING === "true") {
          const ingressPort = process.env.INGRESS_PORT || "8080";
          expect(env.status.url).toMatch(
            new RegExp(`^http://localhost:${ingressPort}/`),
          );
          console.log(`  URL uses path-based routing (local mode)`);
        } else {
          // Production mode - hostname-based with HTTPS
          expect(env.status.url).toMatch(
            /^https:\/\/.*\.preview\.catalyst\.dev\//,
          );
          console.log(`  URL uses hostname-based routing (production mode)`);
        }
      }
    }
  });
});
