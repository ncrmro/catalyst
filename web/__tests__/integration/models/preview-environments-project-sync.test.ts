/**
 * @vitest-environment node
 *
 * Integration tests for Preview Environment Project CR Sync
 *
 * Tests that createPreviewDeployment ensures the Project CR exists
 * before creating Environment CRs.
 *
 * Bug: preview-environments.ts creates Environment CRs with projectRef
 * but does NOT ensure the Project CR exists first, causing operator
 * to fail with "Project not found".
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, repos, projectsRepos, pullRequests } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { createPreviewDeployment } from "@/models/preview-environments";
import { getClusterConfig, getCustomObjectsApi } from "@/lib/k8s-client";
import {
  generateTeamNamespace,
  generateProjectNamespace,
} from "@/lib/namespace-utils";
import { deleteNamespace } from "@catalyst/kubernetes-client";
import {
  userFactory,
  teamFactory,
  projectFactory,
  pullRequestFactory,
} from "../../factories";

const GROUP = "catalyst.catalyst.dev";
const VERSION = "v1alpha1";

/**
 * Helper to check if a Project CR exists in a namespace
 */
async function getProjectCR(
  namespace: string,
  name: string,
): Promise<{ exists: boolean; cr?: unknown }> {
  const CustomObjectsApi = await getCustomObjectsApi();
  const config = await getClusterConfig();
  if (!config) throw new Error("No cluster config");

  const client = config.makeApiClient(CustomObjectsApi);

  try {
    const result = await client.getNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: "projects",
      name,
    });
    return { exists: true, cr: result };
  } catch (error: unknown) {
    // K8s client can throw 404 in different formats
    const err = error as {
      response?: { statusCode?: number };
      code?: number;
      body?: string;
    };
    if (err.response?.statusCode === 404 || err.code === 404) {
      return { exists: false };
    }
    // Check if body contains NotFound
    if (err.body && err.body.includes('"reason":"NotFound"')) {
      return { exists: false };
    }
    throw error;
  }
}

describe("Preview Environment Project CR Sync", () => {
  let kubeConfig: Awaited<ReturnType<typeof getClusterConfig>>;

  // Track resources for cleanup
  let testUserId: string;
  let _testTeamId: string;
  let testRepoId: string;
  let testPullRequestId: string;
  const createdProjectIds: string[] = [];
  const namespacesToCleanup: string[] = [];

  beforeAll(async () => {
    kubeConfig = await getClusterConfig();
    if (!kubeConfig) {
      throw new Error("Failed to get Kubernetes configuration");
    }

    // Create test user
    const testUser = await userFactory.create({
      name: "Preview Env Test User",
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup K8s namespaces (reverse order)
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

    // Cleanup database (reverse order of creation)
    if (testPullRequestId) {
      await db
        .delete(pullRequests)
        .where(eq(pullRequests.id, testPullRequestId));
    }
    if (createdProjectIds.length > 0) {
      await db
        .delete(projectsRepos)
        .where(inArray(projectsRepos.projectId, createdProjectIds));
    }
    if (testRepoId) {
      await db.delete(repos).where(eq(repos.id, testRepoId));
    }
    // Note: projectFactory cleanup is handled by the factory
    // teamFactory and userFactory handle their own cleanup
  });

  it("should ensure Project CR exists before creating Environment CR", async () => {
    const timestamp = Date.now();
    // Use smaller ID that fits in PostgreSQL integer column
    const githubId = Math.floor(Math.random() * 2147483647);
    const teamName = `preview-test-team-${timestamp}`;
    const repoName = `preview-test-repo-${timestamp}`;

    // Step 1: Create team
    const testTeam = await teamFactory.create({
      ownerId: testUserId,
      name: teamName,
    });
    _testTeamId = testTeam.id;

    // Track namespaces for cleanup
    const teamNamespace = generateTeamNamespace(teamName);
    const projectNamespace = generateProjectNamespace(teamName, repoName);
    namespacesToCleanup.push(projectNamespace);
    namespacesToCleanup.push(teamNamespace);

    // Step 2: Create repo (with teamId)
    const [repo] = await db
      .insert(repos)
      .values({
        githubId: githubId,
        name: repoName,
        fullName: `test/${repoName}`,
        url: `https://github.com/test/${repoName}`,
        ownerLogin: "test",
        ownerType: "User",
        teamId: testTeam.id,
      })
      .returning();
    testRepoId = repo.id;

    // Step 3: Create project (but do NOT sync to K8s - simulating webhook flow)
    const project = await projectFactory.create({
      teamId: testTeam.id,
      name: repoName, // Project name matches repo name
    });
    createdProjectIds.push(project.id);

    // Link repo to project
    await db.insert(projectsRepos).values({
      projectId: project.id,
      repoId: testRepoId,
      isPrimary: true,
    });

    // Step 4: Create pull request (required for createPreviewDeployment)
    const pr = await pullRequestFactory.create({
      repoId: testRepoId,
      number: 999,
      headBranch: "feature/test-branch",
    });
    testPullRequestId = pr.id;

    // Step 5: Verify Project CR does NOT exist initially
    const initialProjectCheck = await getProjectCR(teamNamespace, repoName);
    expect(initialProjectCheck.exists).toBe(false);

    // Step 6: Call createPreviewDeployment (webhook flow)
    const result = await createPreviewDeployment({
      pullRequestId: pr.id,
      prNumber: 999,
      branch: "feature/test-branch",
      commitSha: "abc1234567890",
      repoFullName: `test/${repoName}`,
      imageUri: `registry.example.com/test/${repoName}:pr-999`,
      owner: "test",
      repoName: repoName,
    });

    // Step 7: Verify deployment succeeded
    expect(result.success).toBe(true);

    // Step 8: Verify Project CR now exists (BUG EXPOSURE)
    // Currently this will FAIL because createPreviewDeployment
    // does NOT sync the Project CR before creating Environment CR
    const finalProjectCheck = await getProjectCR(teamNamespace, repoName);
    expect(finalProjectCheck.exists).toBe(true);
  });
});
