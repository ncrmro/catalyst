/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, repos, projectsRepos, projects, teams, users } from "@/db";
import { inArray, eq } from "drizzle-orm";
import {
  getRepos,
  getReposWithConnections,
  getRepoConnectionStatus,
  getRepoConnectionDetails,
  createRepos,
  upsertRepos,
} from "@/models/repos";
import {
  userFactory,
  teamFactory,
  projectFactory,
  repoFactory,
  projectRepoFactory,
} from "../../factories";

/**
 * Integration tests for repos model
 *
 * Tests all model functions with real database operations
 */
describe("Repos Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  const createdRepoIds: string[] = [];
  const createdProjectRepoIds: string[] = [];

  beforeAll(async () => {
    // Create test user for team ownership
    const testUser = await userFactory.create({
      name: "Repos Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({ ownerId: testUserId });
    testTeamId = testTeam.id;

    // Create test project
    const testProject = await projectFactory.create({
      teamId: testTeamId,
      name: "Test Project for Repos",
    });
    testProjectId = testProject.id;
  });

  afterAll(async () => {
    // Clean up all created project repos
    if (createdProjectRepoIds.length > 0) {
      await db
        .delete(projectsRepos)
        .where(inArray(projectsRepos.repoId, createdProjectRepoIds));
    }

    // Clean up all created repos
    if (createdRepoIds.length > 0) {
      await db.delete(repos).where(inArray(repos.id, createdRepoIds));
    }

    // Clean up project, team and user (cascades will handle related data)
    if (testProjectId) {
      await db.delete(projects).where(eq(projects.id, testProjectId));
    }
    if (testTeamId) {
      await db.delete(teams).where(eq(teams.id, testTeamId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  beforeEach(() => {
    // Reset created repos list for tracking
    createdRepoIds.length = 0;
    createdProjectRepoIds.length = 0;
  });

  describe("getRepos", () => {
    it("should return repositories by IDs", async () => {
      // Create test repos
      const [repo1, repo2] = await Promise.all([
        repoFactory.create({ teamId: testTeamId, name: "Repo 1" }),
        repoFactory.create({ teamId: testTeamId, name: "Repo 2" }),
      ]);

      createdRepoIds.push(repo1.id, repo2.id);

      // Fetch repos by IDs
      const result = await getRepos({ ids: [repo1.id, repo2.id] });

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toContain("Repo 1");
      expect(result.map((r) => r.name)).toContain("Repo 2");
    });

    it("should return repositories by GitHub IDs", async () => {
      const repo = await repoFactory.create({
        teamId: testTeamId,
      });
      createdRepoIds.push(repo.id);

      const result = await getRepos({ githubIds: [repo.githubId] });

      expect(result).toHaveLength(1);
      expect(result[0].githubId).toBe(repo.githubId);
    });

    it("should return repositories by team IDs", async () => {
      const repo = await repoFactory.create({ teamId: testTeamId });
      createdRepoIds.push(repo.id);

      const result = await getRepos({ teamIds: [testTeamId] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((r) => r.id === repo.id)).toBe(true);
    });

    it("should return repositories by owner login", async () => {
      const ownerLogin = "test-repo-owner";
      const repo = await repoFactory.create({
        teamId: testTeamId,
        ownerLogin,
      });
      createdRepoIds.push(repo.id);

      const result = await getRepos({ ownerLogin });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((r) => r.id === repo.id)).toBe(true);
      expect(result.every((r) => r.ownerLogin === ownerLogin)).toBe(true);
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getRepos({});

      expect(result).toEqual([]);
    });

    it("should return empty array when no repos match", async () => {
      const result = await getRepos({ ids: ["non-existent-id"] });

      expect(result).toEqual([]);
    });
  });

  describe("getReposWithConnections", () => {
    it("should return repositories with project connection info", async () => {
      // Create repo
      const repo = await repoFactory.create({
        teamId: testTeamId,
        name: "Connected Repo",
      });
      createdRepoIds.push(repo.id);

      // Connect repo to project
      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo.id,
        isPrimary: true,
      });
      createdProjectRepoIds.push(repo.id);

      // Fetch repos with connections
      const result = await getReposWithConnections({ ids: [repo.id] });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Connected Repo");
      expect(result[0].connection).toBeTruthy();
      expect(result[0].connection?.projectId).toBe(testProjectId);
      expect(result[0].connection?.isPrimary).toBe(true);
    });

    it("should return repos with null connection for unconnected repos", async () => {
      const repo = await repoFactory.create({
        teamId: testTeamId,
        name: "Unconnected Repo",
      });
      createdRepoIds.push(repo.id);

      const result = await getReposWithConnections({ ids: [repo.id] });

      expect(result).toHaveLength(1);
      expect(result[0].connection).toBeNull();
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getReposWithConnections({});

      expect(result).toEqual([]);
    });
  });

  describe("getRepoConnectionStatus", () => {
    it("should return connection status for multiple GitHub IDs", async () => {
      // Create connected repo
      const connectedRepo = await repoFactory.create({
        teamId: testTeamId,
      });
      createdRepoIds.push(connectedRepo.id);

      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: connectedRepo.id,
      });
      createdProjectRepoIds.push(connectedRepo.id);

      // Create unconnected repo
      const unconnectedRepo = await repoFactory.create({
        teamId: testTeamId,
      });
      createdRepoIds.push(unconnectedRepo.id);

      // Use a non-existent GitHub ID for the third case
      const nonExistentGithubId = 999999999;

      const result = await getRepoConnectionStatus([
        connectedRepo.githubId,
        unconnectedRepo.githubId,
        nonExistentGithubId,
      ]);

      expect(result[connectedRepo.githubId]).toBe(true);
      expect(result[unconnectedRepo.githubId]).toBe(false);
      expect(result[nonExistentGithubId]).toBe(false);
    });

    it("should return empty object for empty array", async () => {
      const result = await getRepoConnectionStatus([]);

      expect(result).toEqual({});
    });
  });

  describe("getRepoConnectionDetails", () => {
    it("should return connection details for connected repos", async () => {
      const repo = await repoFactory.create({
        teamId: testTeamId,
      });
      createdRepoIds.push(repo.id);

      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo.id,
        isPrimary: true,
      });
      createdProjectRepoIds.push(repo.id);

      const result = await getRepoConnectionDetails([repo.githubId]);

      expect(result[repo.githubId]).toBeDefined();
      expect(result[repo.githubId].projectId).toBe(testProjectId);
      expect(result[repo.githubId].isPrimary).toBe(true);
    });

    it("should not include unconnected repos in result", async () => {
      const repo = await repoFactory.create({
        teamId: testTeamId,
      });
      createdRepoIds.push(repo.id);

      const result = await getRepoConnectionDetails([repo.githubId]);

      expect(result[repo.githubId]).toBeUndefined();
    });

    it("should return empty object for empty array", async () => {
      const result = await getRepoConnectionDetails([]);

      expect(result).toEqual({});
    });
  });

  describe("createRepos", () => {
    it("should create a single repository", async () => {
      const repoData = repoFactory.build({
        teamId: testTeamId,
        name: "New Repo",
      });

      const [created] = await createRepos(repoData);
      createdRepoIds.push(created.id);

      expect(created).toHaveProperty("id");
      expect(created.name).toBe("New Repo");
      expect(created.githubId).toBeDefined();
      expect(created.teamId).toBe(testTeamId);

      // Verify it's actually in the database
      const [fromDb] = await getRepos({ ids: [created.id] });
      expect(fromDb.name).toBe("New Repo");
    });

    it("should create multiple repositories in bulk", async () => {
      const reposData = [
        repoFactory.build({
          teamId: testTeamId,
          name: "Bulk Repo 1",
        }),
        repoFactory.build({
          teamId: testTeamId,
          name: "Bulk Repo 2",
        }),
        repoFactory.build({
          teamId: testTeamId,
          name: "Bulk Repo 3",
        }),
      ];

      const created = await createRepos(reposData);
      createdRepoIds.push(...created.map((r) => r.id));

      expect(created).toHaveLength(3);
      expect(created.map((r) => r.name)).toContain("Bulk Repo 1");
      expect(created.map((r) => r.name)).toContain("Bulk Repo 2");
      expect(created.map((r) => r.name)).toContain("Bulk Repo 3");
    });
  });

  describe("upsertRepos", () => {
    it("should insert new repository", async () => {
      const repoData = repoFactory.build({
        teamId: testTeamId,
        name: "Upsert New",
      });

      const [created] = await upsertRepos(repoData);
      createdRepoIds.push(created.id);

      expect(created).toHaveProperty("id");
      expect(created.name).toBe("Upsert New");
      expect(created.githubId).toBeDefined();
    });

    it("should not update on conflict (onConflictDoNothing)", async () => {
      // Create initial repo
      const repoData = repoFactory.build({
        teamId: testTeamId,
        name: "Original Name",
      });

      const [original] = await createRepos(repoData);
      createdRepoIds.push(original.id);

      // Try to upsert with same githubId but different name
      const conflictData = repoFactory.build({
        teamId: testTeamId,
        name: "Updated Name",
        githubId: original.githubId,
      });

      const result = await upsertRepos(conflictData);

      // Should return empty array on conflict with doNothing
      expect(result).toHaveLength(0);

      // Verify original name is unchanged
      const [fromDb] = await getRepos({ githubIds: [original.githubId] });
      expect(fromDb.name).toBe("Original Name");
    });
  });
});
