/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, projectManifests, projects, repos, teams, users } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  getProjectManifests,
  manifestExists,
  createProjectManifests,
  deleteProjectManifests,
} from "@/models/project-manifests";
import {
  userFactory,
  teamFactory,
  projectFactory,
  repoFactory,
  projectManifestFactory,
} from "../../factories";

/**
 * Integration tests for project-manifests model
 *
 * Tests all model functions with real database operations
 */
describe("Project Manifests Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testRepoId: string;
  const createdManifests: Array<{
    projectId: string;
    repoId: string;
    path: string;
  }> = [];

  beforeAll(async () => {
    // Create test user for team ownership
    const testUser = await userFactory.create({
      name: "Project Manifests Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({ ownerId: testUserId });
    testTeamId = testTeam.id;

    // Create test project
    const testProject = await projectFactory.create({
      teamId: testTeamId,
      name: "Test Project for Manifests",
    });
    testProjectId = testProject.id;

    // Create test repo
    const testRepo = await repoFactory.create({
      teamId: testTeamId,
      name: "Test Repo",
    });
    testRepoId = testRepo.id;
  });

  afterAll(async () => {
    // Clean up all created manifests
    for (const manifest of createdManifests) {
      await db
        .delete(projectManifests)
        .where(
          and(
            eq(projectManifests.projectId, manifest.projectId),
            eq(projectManifests.repoId, manifest.repoId),
            eq(projectManifests.path, manifest.path),
          ),
        );
    }

    // Clean up project, repo, team and user (cascades will handle related data)
    if (testProjectId) {
      await db.delete(projects).where(eq(projects.id, testProjectId));
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

  beforeEach(() => {
    // Reset created manifests list for tracking
    createdManifests.length = 0;
  });

  describe("getProjectManifests", () => {
    it("should return manifests by project IDs", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "package.json",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "package.json",
      });

      const result = await getProjectManifests({
        projectIds: [testProjectId],
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(
        result.some(
          (m) =>
            m.projectId === testProjectId &&
            m.repoId === testRepoId &&
            m.path === "package.json",
        ),
      ).toBe(true);
    });

    it("should return manifests by repo IDs", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "manifest.yaml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "manifest.yaml",
      });

      const result = await getProjectManifests({ repoIds: [testRepoId] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((m) => m.repoId === testRepoId)).toBe(true);
    });

    it("should return manifests by paths", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "catalyst.yaml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "catalyst.yaml",
      });

      const result = await getProjectManifests({ paths: ["catalyst.yaml"] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((m) => m.path === "catalyst.yaml")).toBe(true);
    });

    it("should filter by multiple criteria", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "docker-compose.yml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "docker-compose.yml",
      });

      const result = await getProjectManifests({
        projectIds: [testProjectId],
        repoIds: [testRepoId],
        paths: ["docker-compose.yml"],
      });

      expect(result.some((m) => m.path === "docker-compose.yml")).toBe(true);
      expect(result.every((m) => m.projectId === testProjectId)).toBe(true);
      expect(result.every((m) => m.repoId === testRepoId)).toBe(true);
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getProjectManifests({});

      expect(result).toEqual([]);
    });

    it("should return empty array when no manifests match", async () => {
      const result = await getProjectManifests({
        projectIds: ["non-existent-id"],
      });

      expect(result).toEqual([]);
    });
  });

  describe("manifestExists", () => {
    it("should return true when manifest exists", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "exists-test.yaml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "exists-test.yaml",
      });

      const exists = await manifestExists(
        testProjectId,
        testRepoId,
        "exists-test.yaml",
      );

      expect(exists).toBe(true);
    });

    it("should return false when manifest does not exist", async () => {
      const exists = await manifestExists(
        testProjectId,
        testRepoId,
        "non-existent.yaml",
      );

      expect(exists).toBe(false);
    });

    it("should return false when project ID doesn't match", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "match-test.yaml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "match-test.yaml",
      });

      const exists = await manifestExists(
        "wrong-project-id",
        testRepoId,
        "match-test.yaml",
      );

      expect(exists).toBe(false);
    });

    it("should return false when repo ID doesn't match", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "match-test-2.yaml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "match-test-2.yaml",
      });

      const exists = await manifestExists(
        testProjectId,
        "wrong-repo-id",
        "match-test-2.yaml",
      );

      expect(exists).toBe(false);
    });

    it("should return false when path doesn't match", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "correct-path.yaml",
      });
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "correct-path.yaml",
      });

      const exists = await manifestExists(
        testProjectId,
        testRepoId,
        "wrong-path.yaml",
      );

      expect(exists).toBe(false);
    });
  });

  describe("createProjectManifests", () => {
    it("should create a single project manifest", async () => {
      const manifestData = projectManifestFactory.build({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "new-manifest.json",
      });

      const [created] = await createProjectManifests(manifestData);
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "new-manifest.json",
      });

      expect(created).toHaveProperty("projectId");
      expect(created).toHaveProperty("repoId");
      expect(created).toHaveProperty("path");
      expect(created.projectId).toBe(testProjectId);
      expect(created.repoId).toBe(testRepoId);
      expect(created.path).toBe("new-manifest.json");
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);

      // Verify it's actually in the database
      const exists = await manifestExists(
        testProjectId,
        testRepoId,
        "new-manifest.json",
      );
      expect(exists).toBe(true);
    });

    it("should create multiple project manifests in bulk", async () => {
      const manifestsData = [
        projectManifestFactory.build({
          projectId: testProjectId,
          repoId: testRepoId,
          path: "bulk-1.yaml",
        }),
        projectManifestFactory.build({
          projectId: testProjectId,
          repoId: testRepoId,
          path: "bulk-2.yaml",
        }),
        projectManifestFactory.build({
          projectId: testProjectId,
          repoId: testRepoId,
          path: "bulk-3.yaml",
        }),
      ];

      const created = await createProjectManifests(manifestsData);
      createdManifests.push(
        { projectId: testProjectId, repoId: testRepoId, path: "bulk-1.yaml" },
        { projectId: testProjectId, repoId: testRepoId, path: "bulk-2.yaml" },
        { projectId: testProjectId, repoId: testRepoId, path: "bulk-3.yaml" },
      );

      expect(created).toHaveLength(3);
      expect(created.map((m) => m.path)).toContain("bulk-1.yaml");
      expect(created.map((m) => m.path)).toContain("bulk-2.yaml");
      expect(created.map((m) => m.path)).toContain("bulk-3.yaml");
    });

    it("should set timestamps automatically", async () => {
      const manifestData = projectManifestFactory.build({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "timestamp-test.yaml",
      });

      const [created] = await createProjectManifests(manifestData);
      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "timestamp-test.yaml",
      });

      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(created.createdAt.getTime()).toBeGreaterThan(Date.now() - 5000);
    });
  });

  describe("deleteProjectManifests", () => {
    it("should delete a project manifest", async () => {
      await projectManifestFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "to-delete.yaml",
      });

      // Verify it exists
      let exists = await manifestExists(
        testProjectId,
        testRepoId,
        "to-delete.yaml",
      );
      expect(exists).toBe(true);

      // Delete it
      await deleteProjectManifests({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "to-delete.yaml",
      });

      // Verify it's gone
      exists = await manifestExists(
        testProjectId,
        testRepoId,
        "to-delete.yaml",
      );
      expect(exists).toBe(false);
    });

    it("should not affect other manifests when deleting", async () => {
      await Promise.all([
        projectManifestFactory.create({
          projectId: testProjectId,
          repoId: testRepoId,
          path: "keep-this.yaml",
        }),
        projectManifestFactory.create({
          projectId: testProjectId,
          repoId: testRepoId,
          path: "delete-this.yaml",
        }),
      ]);

      createdManifests.push({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "keep-this.yaml",
      });

      // Delete only the second manifest
      await deleteProjectManifests({
        projectId: testProjectId,
        repoId: testRepoId,
        path: "delete-this.yaml",
      });

      // Verify first one still exists
      const exists1 = await manifestExists(
        testProjectId,
        testRepoId,
        "keep-this.yaml",
      );
      expect(exists1).toBe(true);

      // Verify second one is deleted
      const exists2 = await manifestExists(
        testProjectId,
        testRepoId,
        "delete-this.yaml",
      );
      expect(exists2).toBe(false);
    });

    it("should not throw error when deleting non-existent manifest", async () => {
      await expect(
        deleteProjectManifests({
          projectId: testProjectId,
          repoId: testRepoId,
          path: "non-existent.yaml",
        }),
      ).resolves.not.toThrow();
    });
  });
});
