import { expect, test } from "./fixtures/k8s-fixture";

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

// Test suite for path-based local URL testing
// Only runs when LOCAL_PREVIEW_ROUTING=true
test.describe("Local URL Testing for Environments", () => {
	// Skip entire suite if not in local preview routing mode
	test.skip(
		() => process.env.LOCAL_PREVIEW_ROUTING !== "true",
		"Requires LOCAL_PREVIEW_ROUTING=true",
	);

	test("should access environment via path-based local URL", async ({
		page,
		k8s,
	}) => {
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

		// Assert environments exist - this test requires pre-created environments
		expect(environments.length).toBeGreaterThan(0);

		// Find a ready environment with a URL
		const readyEnv = environments.find(
			(env) => env.status?.phase === "Ready" && env.status?.url,
		);

		// Assert we have a ready environment
		expect(readyEnv).toBeDefined();
		expect(readyEnv?.status?.url).toBeDefined();

		// Sanity check: Log Environment CR details before browser navigation
		console.log(
			`Sanity check: Validating Environment CR ${readyEnv?.metadata.name}`,
		);
		console.log(`  - Phase: ${readyEnv?.status?.phase}`);
		console.log(`  - URL: ${readyEnv?.status?.url}`);
		console.log(`  - Namespace: ${readyEnv?.metadata.namespace}`);
		console.log(`  - Project: ${readyEnv?.spec.projectRef.name}`);

		const envUrl = readyEnv?.status?.url!;
		console.log(`Testing environment URL: ${envUrl}`);

		// Verify URL format for local hostname-based routing
		// Local mode uses hostname-based routing: http://{project}-{env}.localhost:{port}/
		expect(envUrl).toMatch(
			new RegExp(`^http://.*\\.localhost:${ingressPort}/`),
		);

		// Attempt to navigate to the environment URL
		// Note: This may fail if the application isn't actually deployed
		await page.goto(envUrl, { waitUntil: "domcontentloaded", timeout: 5000 });

		// Verify the page loaded (basic check - depends on app)
		expect(page.url()).toContain(envUrl);

		console.log(`✓ Environment accessible at ${envUrl}`);
	});
});

// Test suite for verifying Environment CR status has URL
// Runs in both local and production modes
test.describe("Environment CR URL Verification", () => {
	test("should verify environment CR has URL in status", async ({ k8s }) => {
		// List all environment CRs in the default namespace
		const environmentsResponse =
			(await k8s.customApi.listNamespacedCustomObject({
				group: "catalyst.catalyst.dev",
				version: "v1alpha1",
				namespace: "default",
				plural: "environments",
			})) as EnvironmentListResponse;

		const environments = environmentsResponse.items;

		// This test requires environments to exist
		// If none exist, we should skip (using test annotations, not runtime branching)
		expect(
			environments.length,
			"No environments found - ensure environments are created before running this test",
		).toBeGreaterThan(0);

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
					// Local mode uses hostname-based routing: http://{project}-{env}.localhost:{port}/
					expect(env.status.url).toMatch(
						new RegExp(`^http://.*\\.localhost:${ingressPort}/`),
					);
					console.log(`  URL uses hostname-based routing (local mode)`);
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
