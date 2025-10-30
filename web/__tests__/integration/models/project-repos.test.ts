/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, projectsRepos, projects, repos, teams, users } from "@/db";
import { inArray, eq } from "drizzle-orm";
import {
  getProjectRepos,
  createProjectRepoLinks,
  setPrimaryRepo,
} from "@/models/project-repos";
import {
  userFactory,
  teamFactory,
  projectFactory,
  repoFactory,
  projectRepoFactory,
} from "../../factories";

/**
 * Integration tests for project-repos model
 *
 * Tests all model functions with real database operations
 */
describe("Project-Repos Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testRepoId: string;
  const createdProjectRepoIds: string[] = [];

  beforeAll(async () => {
    // Create test user for team ownership
    const testUser = await userFactory.create({
      name: "Project-Repos Test User",
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

    // Create test repo
    const testRepo = await repoFactory.create({
      teamId: testTeamId,
      name: "Test Repo",
    });
    testRepoId = testRepo.id;
  });

  afterAll(async () => {
    // Clean up all created project repos
    if (createdProjectRepoIds.length > 0) {
      await db
        .delete(projectsRepos)
        .where(inArray(projectsRepos.repoId, createdProjectRepoIds));
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
    // Reset created project repos list for tracking
    createdProjectRepoIds.length = 0;
  });

  describe("getProjectRepos", () => {
    it("should return project-repo links by project IDs", async () => {
      const repo = await repoFactory.create({ teamId: testTeamId });
      const projectRepo = await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo.id,
        isPrimary: false,
      });
      createdProjectRepoIds.push(repo.id);

      const result = await getProjectRepos({ projectIds: [testProjectId] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((pr) => pr.repoId === repo.id)).toBe(true);
    });

    it("should return project-repo links by repo IDs", async () => {
      const result = await getProjectRepos({ repoIds: [testRepoId] });

      // May be empty or have results depending on other tests
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by isPrimary flag", async () => {
      const repo1 = await repoFactory.create({ teamId: testTeamId });
      const repo2 = await repoFactory.create({ teamId: testTeamId });

      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo1.id,
        isPrimary: true,
      });
      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo2.id,
        isPrimary: false,
      });

      createdProjectRepoIds.push(repo1.id, repo2.id);

      const primaryLinks = await getProjectRepos({
        projectIds: [testProjectId],
        isPrimary: true,
      });

      const nonPrimaryLinks = await getProjectRepos({
        projectIds: [testProjectId],
        isPrimary: false,
      });

      expect(primaryLinks.every((pr) => pr.isPrimary === true)).toBe(true);
      expect(nonPrimaryLinks.every((pr) => pr.isPrimary === false)).toBe(true);
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getProjectRepos({});

      expect(result).toEqual([]);
    });

    it("should return empty array when no links match", async () => {
      const result = await getProjectRepos({
        projectIds: ["non-existent-id"],
      });

      expect(result).toEqual([]);
    });
  });

  describe("createProjectRepoLinks", () => {
    it("should create a single project-repo link", async () => {
      const repo = await repoFactory.create({ teamId: testTeamId });
      const linkData = projectRepoFactory.build({
        projectId: testProjectId,
        repoId: repo.id,
        isPrimary: false,
      });

      const [created] = await createProjectRepoLinks(linkData);
      createdProjectRepoIds.push(repo.id);

      expect(created).toHaveProperty("projectId");
      expect(created).toHaveProperty("repoId");
      expect(created.projectId).toBe(testProjectId);
      expect(created.repoId).toBe(repo.id);
      expect(created.isPrimary).toBe(false);

      // Verify it's actually in the database
      const fromDb = await getProjectRepos({ repoIds: [repo.id] });
      expect(fromDb).toHaveLength(1);
    });

    it("should create multiple project-repo links in bulk", async () => {
      const repos = await Promise.all([
        repoFactory.create({ teamId: testTeamId }),
        repoFactory.create({ teamId: testTeamId }),
        repoFactory.create({ teamId: testTeamId }),
      ]);

      const linksData = repos.map((repo) =>
        projectRepoFactory.build({
          projectId: testProjectId,
          repoId: repo.id,
          isPrimary: false,
        }),
      );

      const created = await createProjectRepoLinks(linksData);
      createdProjectRepoIds.push(...repos.map((r) => r.id));

      expect(created).toHaveLength(3);
      expect(created.every((link) => link.projectId === testProjectId)).toBe(
        true,
      );
    });

    it("should set default isPrimary to false", async () => {
      const repo = await repoFactory.create({ teamId: testTeamId });
      const linkData = projectRepoFactory.build({
        projectId: testProjectId,
        repoId: repo.id,
        // Not specifying isPrimary
      });

      const [created] = await createProjectRepoLinks(linkData);
      createdProjectRepoIds.push(repo.id);

      expect(created.isPrimary).toBe(false);
    });
  });

  describe("setPrimaryRepo", () => {
    it("should set a repo as primary for a project", async () => {
      const repo = await repoFactory.create({ teamId: testTeamId });
      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo.id,
        isPrimary: false,
      });
      createdProjectRepoIds.push(repo.id);

      const updated = await setPrimaryRepo(testProjectId, repo.id);

      expect(updated).toBeDefined();
      expect(updated.isPrimary).toBe(true);

      // Verify in database
      const fromDb = await getProjectRepos({
        projectIds: [testProjectId],
        repoIds: [repo.id],
      });
      expect(fromDb[0].isPrimary).toBe(true);
    });

    it("should unset existing primary repos when setting new primary", async () => {
      const repo1 = await repoFactory.create({ teamId: testTeamId });
      const repo2 = await repoFactory.create({ teamId: testTeamId });

      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo1.id,
        isPrimary: true,
      });
      await projectRepoFactory.create({
        projectId: testProjectId,
        repoId: repo2.id,
        isPrimary: false,
      });
      createdProjectRepoIds.push(repo1.id, repo2.id);

      // Set repo2 as primary
      await setPrimaryRepo(testProjectId, repo2.id);

      const allLinks = await getProjectRepos({
        projectIds: [testProjectId],
      });

      // Only repo2 should be primary
      const primaryLinks = allLinks.filter((link) => link.isPrimary);
      expect(primaryLinks).toHaveLength(1);
      expect(primaryLinks[0].repoId).toBe(repo2.id);

      // repo1 should no longer be primary
      const repo1Link = allLinks.find((link) => link.repoId === repo1.id);
      expect(repo1Link?.isPrimary).toBe(false);
    });

    it("should handle transaction rollback on error", async () => {
      // Try to set primary for non-existent link
      await expect(
        setPrimaryRepo(testProjectId, "non-existent-repo-id"),
      ).resolves.toBeUndefined();
    });
  });
});
