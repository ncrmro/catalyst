/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, projectEnvironments, projects, repos, teams, users } from "@/db";
import { inArray, eq } from "drizzle-orm";
import {
  getEnvironments,
  environmentExists,
  createEnvironments,
  updateEnvironments,
} from "@/models/environments";
import {
  userFactory,
  teamFactory,
  projectFactory,
  repoFactory,
  environmentFactory,
} from "../../factories";

/**
 * Integration tests for environments model
 *
 * Tests all model functions with real database operations
 */
describe("Environments Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testRepoId: string;
  const createdEnvironmentIds: string[] = [];

  beforeAll(async () => {
    // Create test user for team ownership
    const testUser = await userFactory.create({
      name: "Environments Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({ ownerId: testUserId });
    testTeamId = testTeam.id;

    // Create test project
    const testProject = await projectFactory.create({
      teamId: testTeamId,
      name: "Test Project for Environments",
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
    // Clean up all created environments
    if (createdEnvironmentIds.length > 0) {
      await db
        .delete(projectEnvironments)
        .where(inArray(projectEnvironments.id, createdEnvironmentIds));
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
    // Reset created environments list for tracking
    createdEnvironmentIds.length = 0;
  });

  describe("getEnvironments", () => {
    it("should return environments by IDs", async () => {
      const [env1, env2] = await Promise.all([
        environmentFactory.create({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "preview",
        }),
        environmentFactory.create({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "production",
        }),
      ]);

      createdEnvironmentIds.push(env1.id, env2.id);

      const result = await getEnvironments({ ids: [env1.id, env2.id] });

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.environment)).toContain("preview");
      expect(result.map((e) => e.environment)).toContain("production");
    });

    it("should return environments by project IDs", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "staging",
      });
      createdEnvironmentIds.push(env.id);

      const result = await getEnvironments({ projectIds: [testProjectId] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((e) => e.id === env.id)).toBe(true);
    });

    it("should return environments by repo IDs", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "development",
      });
      createdEnvironmentIds.push(env.id);

      const result = await getEnvironments({ repoIds: [testRepoId] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((e) => e.id === env.id)).toBe(true);
    });

    it("should filter by environment name", async () => {
      // Create a unique repo for this test to avoid conflicts
      const uniqueRepo = await repoFactory.create({
        teamId: testTeamId,
      });

      const [prod, preview] = await Promise.all([
        environmentFactory.production().create({
          projectId: testProjectId,
          repoId: uniqueRepo.id,
        }),
        environmentFactory.preview().create({
          projectId: testProjectId,
          repoId: uniqueRepo.id,
        }),
      ]);

      createdEnvironmentIds.push(prod.id, preview.id);

      const productionEnvs = await getEnvironments({
        projectIds: [testProjectId],
        environments: ["production"],
      });

      expect(productionEnvs.some((e) => e.id === prod.id)).toBe(true);
      expect(productionEnvs.every((e) => e.environment === "production")).toBe(
        true,
      );

      // Clean up unique repo
      await db.delete(repos).where(eq(repos.id, uniqueRepo.id));
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getEnvironments({});

      expect(result).toEqual([]);
    });

    it("should return empty array when no environments match", async () => {
      const result = await getEnvironments({ ids: ["non-existent-id"] });

      expect(result).toEqual([]);
    });
  });

  describe("environmentExists", () => {
    it("should return true when environment exists", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "qa",
      });
      createdEnvironmentIds.push(env.id);

      const exists = await environmentExists(testProjectId, testRepoId, "qa");

      expect(exists).toBe(true);
    });

    it("should return false when environment does not exist", async () => {
      const exists = await environmentExists(
        testProjectId,
        testRepoId,
        "non-existent",
      );

      expect(exists).toBe(false);
    });

    it("should return false when project ID doesn't match", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "test-env",
      });
      createdEnvironmentIds.push(env.id);

      const exists = await environmentExists(
        "wrong-project-id",
        testRepoId,
        "test-env",
      );

      expect(exists).toBe(false);
    });

    it("should return false when repo ID doesn't match", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "test-env-2",
      });
      createdEnvironmentIds.push(env.id);

      const exists = await environmentExists(
        testProjectId,
        "wrong-repo-id",
        "test-env-2",
      );

      expect(exists).toBe(false);
    });
  });

  describe("createEnvironments", () => {
    it("should create a single environment", async () => {
      const envData = environmentFactory.build({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "new-env",
        latestDeployment: "v1.0.0",
      });

      const [created] = await createEnvironments(envData);
      createdEnvironmentIds.push(created.id);

      expect(created).toHaveProperty("id");
      expect(created.projectId).toBe(testProjectId);
      expect(created.repoId).toBe(testRepoId);
      expect(created.environment).toBe("new-env");
      expect(created.latestDeployment).toBe("v1.0.0");
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);

      // Verify it's actually in the database
      const fromDb = await getEnvironments({ ids: [created.id] });
      expect(fromDb).toHaveLength(1);
    });

    it("should create multiple environments in bulk", async () => {
      const envsData = [
        environmentFactory.build({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "bulk-1",
        }),
        environmentFactory.build({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "bulk-2",
        }),
        environmentFactory.build({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "bulk-3",
        }),
      ];

      const created = await createEnvironments(envsData);
      createdEnvironmentIds.push(...created.map((e) => e.id));

      expect(created).toHaveLength(3);
      expect(created.map((e) => e.environment)).toContain("bulk-1");
      expect(created.map((e) => e.environment)).toContain("bulk-2");
      expect(created.map((e) => e.environment)).toContain("bulk-3");
    });

    it("should create environment using trait methods", async () => {
      // Create a unique repo for this test to avoid conflicts
      const uniqueRepo = await repoFactory.create({
        teamId: testTeamId,
      });

      const previewEnvData = environmentFactory.preview().build({
        projectId: testProjectId,
        repoId: uniqueRepo.id,
      });

      const [created] = await createEnvironments(previewEnvData);
      createdEnvironmentIds.push(created.id);

      expect(created.environment).toBe("preview");
      expect(created.latestDeployment).toBeTruthy();

      // Clean up unique repo
      await db.delete(repos).where(eq(repos.id, uniqueRepo.id));
    });

    it("should handle null latestDeployment", async () => {
      const envData = environmentFactory.build({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "no-deployment",
        latestDeployment: null,
      });

      const [created] = await createEnvironments(envData);
      createdEnvironmentIds.push(created.id);

      expect(created.latestDeployment).toBeNull();
    });
  });

  describe("updateEnvironments", () => {
    it("should update multiple environments by IDs", async () => {
      const [env1, env2] = await Promise.all([
        environmentFactory.create({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "update-1",
          latestDeployment: "v1.0.0",
        }),
        environmentFactory.create({
          projectId: testProjectId,
          repoId: testRepoId,
          environment: "update-2",
          latestDeployment: "v1.0.0",
        }),
      ]);

      createdEnvironmentIds.push(env1.id, env2.id);

      const updated = await updateEnvironments([env1.id, env2.id], {
        latestDeployment: "v2.0.0",
      });

      expect(updated).toHaveLength(2);
      expect(updated.every((e) => e.latestDeployment === "v2.0.0")).toBe(true);

      // Verify in database
      const fromDb = await getEnvironments({ ids: [env1.id, env2.id] });
      expect(fromDb.every((e) => e.latestDeployment === "v2.0.0")).toBe(true);
    });

    it("should update updatedAt timestamp", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "timestamp-test",
      });
      createdEnvironmentIds.push(env.id);

      const originalUpdatedAt = env.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const [updated] = await updateEnvironments([env.id], {
        latestDeployment: "updated-deployment",
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    it("should return empty array when no IDs provided", async () => {
      const result = await updateEnvironments([], {
        latestDeployment: "test",
      });

      expect(result).toEqual([]);
    });

    it("should update specific fields only", async () => {
      const env = await environmentFactory.create({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "partial-update",
        latestDeployment: "v1.0.0",
      });
      createdEnvironmentIds.push(env.id);

      const [updated] = await updateEnvironments([env.id], {
        latestDeployment: "v2.0.0",
      });

      expect(updated.latestDeployment).toBe("v2.0.0");
      expect(updated.environment).toBe("partial-update");
      expect(updated.projectId).toBe(testProjectId);
    });
  });
});
