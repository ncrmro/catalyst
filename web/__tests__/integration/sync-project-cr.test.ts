/**
 * @vitest-environment node
 *
 * Integration tests for syncProjectToK8s
 *
 * Tests that Project CRs are created correctly in Kubernetes,
 * including proper label sanitization for team names with special characters.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, projects, teams, users, repos, projectsRepos } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { syncProjectToK8s } from "@/lib/sync-project-cr";
import { getClusterConfig } from "@/lib/k8s-client";
import { deleteNamespace } from "@catalyst/kubernetes-client";
import { generateTeamNamespace } from "@/lib/namespace-utils";
import { userFactory, teamFactory, projectFactory } from "../factories";

describe("syncProjectToK8s Integration", () => {
  let kubeConfig: Awaited<ReturnType<typeof getClusterConfig>>;
  let testUserId: string;
  let testTeamId: string;
  let testRepoId: string;
  const createdProjectIds: string[] = [];
  const namespacesToCleanup: string[] = [];

  beforeAll(async () => {
    kubeConfig = await getClusterConfig();
    if (!kubeConfig) {
      throw new Error("Failed to get Kubernetes configuration");
    }

    // Create test user
    const testUser = await userFactory.create({
      name: "Sync Project Test User",
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup K8s namespaces
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

    // Cleanup database
    if (createdProjectIds.length > 0) {
      await db
        .delete(projectsRepos)
        .where(inArray(projectsRepos.projectId, createdProjectIds));
      await db.delete(projects).where(inArray(projects.id, createdProjectIds));
    }
    if (testRepoId) {
      await db.delete(repos).where(eq(repos.id, testRepoId));
    }
    if (testTeamId) {
      await db.delete(teams).where(eq(teams.id, testTeamId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should handle team names with special characters", async () => {
    // Create team with special characters (apostrophe, spaces)
    const specialTeamName = `O'Reilly's Test Team ${Date.now()}`;
    const testTeam = await teamFactory.create({
      ownerId: testUserId,
      name: specialTeamName,
    });
    testTeamId = testTeam.id;

    const teamNamespace = generateTeamNamespace(specialTeamName);
    namespacesToCleanup.push(teamNamespace);

    // Create a test repo for this team
    const timestamp = Date.now();
    // Use a random number within 32-bit integer range for githubId
    const uniqueGithubId = Math.floor(Math.random() * 2000000000);
    const [repo] = await db
      .insert(repos)
      .values({
        githubId: uniqueGithubId,
        name: "sync-project-test",
        fullName: `test/sync-project-test-${timestamp}`,
        url: `https://github.com/test/sync-project-test-${timestamp}`,
        ownerLogin: "test",
        ownerType: "User",
        teamId: testTeam.id,
      })
      .returning();
    testRepoId = repo.id;

    // Create project for this team
    const project = await projectFactory.create({
      teamId: testTeam.id,
      name: `test-project-${timestamp}`,
    });
    createdProjectIds.push(project.id);

    // Link repo to project
    await db.insert(projectsRepos).values({
      projectId: project.id,
      repoId: testRepoId,
      isPrimary: true,
    });

    // Sync project to K8s - this should NOT fail with 422 error
    const result = await syncProjectToK8s(project.id);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
