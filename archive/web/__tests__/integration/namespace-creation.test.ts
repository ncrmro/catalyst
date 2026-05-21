/**
 * Integration test for namespace creation logic
 *
 * Tests the ensureProjectNamespace function to verify it:
 * 1. Creates team namespace if it doesn't exist
 * 2. Creates project namespace if it doesn't exist
 * 3. Handles 404 errors gracefully when checking if namespaces exist
 * 4. Works correctly when namespaces already exist (idempotent)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getClusterConfig } from "@/lib/k8s-client";
import {
  ensureProjectNamespace,
  ensureTeamNamespace,
  getNamespace,
  deleteNamespace,
} from "@catalyst/kubernetes-client";
import {
  generateProjectNamespace,
  generateTeamNamespace,
  sanitizeNamespaceComponent,
} from "@/lib/namespace-utils";

describe("Namespace Creation Integration", () => {
  let kubeConfig: Awaited<ReturnType<typeof getClusterConfig>>;
  const testTeamName = "test-team-" + Date.now();
  const testProjectName = "test-project-" + Date.now();

  const teamNamespace = generateTeamNamespace(testTeamName);
  const projectNamespace = generateProjectNamespace(
    testTeamName,
    testProjectName,
  );

  const namespacesToCleanup = [projectNamespace, teamNamespace];

  beforeAll(async () => {
    kubeConfig = await getClusterConfig();
    if (!kubeConfig) {
      throw new Error("Failed to get Kubernetes configuration");
    }
  });

  afterAll(async () => {
    // Cleanup test namespaces
    if (kubeConfig) {
      for (const ns of namespacesToCleanup) {
        try {
          await deleteNamespace(kubeConfig, ns);
          console.log(`✓ Cleaned up namespace: ${ns}`);
        } catch (_error) {
          // Ignore errors during cleanup
        }
      }
    }
  });

  it("should handle non-existent namespace check gracefully", async () => {
    // This tests that getNamespace returns null for non-existent namespaces
    // instead of throwing an error
    const nonExistentNamespace = "non-existent-namespace-" + Date.now();
    const result = await getNamespace(kubeConfig!, nonExistentNamespace);
    expect(result).toBeNull();
  });

  it("should create team namespace if it does not exist", async () => {
    // Verify namespace doesn't exist yet
    const beforeCreate = await getNamespace(kubeConfig!, teamNamespace);
    expect(beforeCreate).toBeNull();

    // Create the namespace
    const result = await ensureTeamNamespace(kubeConfig!, testTeamName);

    expect(result).toBeDefined();
    expect(result.name).toBe(teamNamespace);
    expect(result.status).toBe("Active");
    expect(result.labels).toBeDefined();
    expect(result.labels?.["catalyst.dev/team"]).toBe(
      sanitizeNamespaceComponent(testTeamName),
    );
    expect(result.labels?.["catalyst.dev/namespace-type"]).toBe("team");

    // Verify namespace was created
    const afterCreate = await getNamespace(kubeConfig!, teamNamespace);
    expect(afterCreate).not.toBeNull();
    expect(afterCreate?.name).toBe(teamNamespace);
  });

  it("should be idempotent when team namespace already exists", async () => {
    // Call ensureTeamNamespace again - it should not fail
    const result = await ensureTeamNamespace(kubeConfig!, testTeamName);

    expect(result).toBeDefined();
    expect(result.name).toBe(teamNamespace);
    expect(result.status).toBe("Active");
  });

  it("should create project namespace and team namespace if needed", async () => {
    // This will also ensure team namespace exists first
    const result = await ensureProjectNamespace(
      kubeConfig!,
      testTeamName,
      testProjectName,
    );

    expect(result).toBeDefined();
    expect(result.name).toBe(projectNamespace);
    expect(result.status).toBe("Active");
    expect(result.labels).toBeDefined();
    expect(result.labels?.["catalyst.dev/team"]).toBe(
      sanitizeNamespaceComponent(testTeamName),
    );
    expect(result.labels?.["catalyst.dev/project"]).toBe(
      sanitizeNamespaceComponent(testProjectName),
    );
    expect(result.labels?.["catalyst.dev/namespace-type"]).toBe("project");

    // Verify both namespaces exist
    const teamNs = await getNamespace(kubeConfig!, teamNamespace);
    expect(teamNs).not.toBeNull();

    const projectNs = await getNamespace(kubeConfig!, projectNamespace);
    expect(projectNs).not.toBeNull();
  });

  it("should be idempotent when project namespace already exists", async () => {
    // Call ensureProjectNamespace again - it should not fail
    const result = await ensureProjectNamespace(
      kubeConfig!,
      testTeamName,
      testProjectName,
    );

    expect(result).toBeDefined();
    expect(result.name).toBe(projectNamespace);
    expect(result.status).toBe("Active");
  });

  it("should handle concurrent namespace creation attempts", async () => {
    // Create a new project namespace with concurrent calls
    const newProjectName = "concurrent-test-" + Date.now();
    const newProjectNamespace = generateProjectNamespace(
      testTeamName,
      newProjectName,
    );
    namespacesToCleanup.push(newProjectNamespace);

    // Make multiple concurrent calls
    const results = await Promise.all([
      ensureProjectNamespace(kubeConfig!, testTeamName, newProjectName),
      ensureProjectNamespace(kubeConfig!, testTeamName, newProjectName),
      ensureProjectNamespace(kubeConfig!, testTeamName, newProjectName),
    ]);

    // All should succeed and return the same namespace
    for (const result of results) {
      expect(result).toBeDefined();
      expect(result.name).toBe(newProjectNamespace);
      expect(result.status).toBe("Active");
    }

    // Verify only one namespace was created
    const ns = await getNamespace(kubeConfig!, newProjectNamespace);
    expect(ns).not.toBeNull();
  });

  it("should handle team names with special characters", async () => {
    // Test that team names with apostrophes, spaces, and other special chars are slugified
    const specialTeamName = "O'Reilly's Test Team " + Date.now();
    const specialProjectName = "My Project (Test) " + Date.now();

    const expectedTeamNamespace = generateTeamNamespace(specialTeamName);
    const expectedProjectNamespace = generateProjectNamespace(
      specialTeamName,
      specialProjectName,
    );
    namespacesToCleanup.push(expectedProjectNamespace, expectedTeamNamespace);

    // Create team namespace with special characters
    const teamResult = await ensureTeamNamespace(kubeConfig!, specialTeamName);

    expect(teamResult).toBeDefined();
    expect(teamResult.name).toBe(expectedTeamNamespace);
    expect(teamResult.status).toBe("Active");
    // Labels should be slugified (no apostrophes, spaces converted to hyphens)
    expect(teamResult.labels?.["catalyst.dev/team"]).toBe(
      sanitizeNamespaceComponent(specialTeamName),
    );
    expect(teamResult.labels?.["catalyst.dev/team"]).not.toContain("'");
    expect(teamResult.labels?.["catalyst.dev/team"]).not.toContain(" ");

    // Create project namespace with special characters
    const projectResult = await ensureProjectNamespace(
      kubeConfig!,
      specialTeamName,
      specialProjectName,
    );

    expect(projectResult).toBeDefined();
    expect(projectResult.name).toBe(expectedProjectNamespace);
    expect(projectResult.status).toBe("Active");
    // Labels should be slugified
    expect(projectResult.labels?.["catalyst.dev/team"]).toBe(
      sanitizeNamespaceComponent(specialTeamName),
    );
    expect(projectResult.labels?.["catalyst.dev/project"]).toBe(
      sanitizeNamespaceComponent(specialProjectName),
    );
    expect(projectResult.labels?.["catalyst.dev/project"]).not.toContain("(");
    expect(projectResult.labels?.["catalyst.dev/project"]).not.toContain(")");
  });
});
