/**
 * @vitest-environment node
 */

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, projects, teams, users } from "@/db";
import {
	createProjects,
	getProjects,
	incrementPreviewCount,
	updateProjects,
} from "@/models/projects";
import { projectFactory, teamFactory, userFactory } from "../../factories";

/**
 * Integration tests for projects model
 *
 * Tests all model functions with real database operations
 */
describe("Projects Model Integration", () => {
	let testUserId: string;
	let testTeamId: string;
	const createdProjectIds: string[] = [];

	beforeAll(async () => {
		// Create test user for team ownership
		const testUser = await userFactory.create({
			name: "Projects Test User",
		});
		testUserId = testUser.id;

		// Create test team
		const testTeam = await teamFactory.create({ ownerId: testUserId });
		testTeamId = testTeam.id;
	});

	afterAll(async () => {
		// Clean up all created projects
		if (createdProjectIds.length > 0) {
			await db.delete(projects).where(inArray(projects.id, createdProjectIds));
		}

		// Clean up team and user (cascades will handle team memberships)
		if (testTeamId) {
			await db.delete(teams).where(eq(teams.id, testTeamId));
		}
		if (testUserId) {
			await db.delete(users).where(eq(users.id, testUserId));
		}
	});

	beforeEach(() => {
		// Reset created projects list for tracking
		createdProjectIds.length = 0;
	});

	describe("getProjects", () => {
		it("should return projects by team IDs", async () => {
			// Create test projects
			const [project1, project2] = await Promise.all([
				projectFactory.create({ teamId: testTeamId, name: "Project 1" }),
				projectFactory.create({ teamId: testTeamId, name: "Project 2" }),
			]);

			createdProjectIds.push(project1.id, project2.id);

			// Fetch projects by team ID
			const result = await getProjects({ teamIds: [testTeamId] });

			expect(result).toHaveLength(2);
			expect(result.map((p) => p.name)).toContain("Project 1");
			expect(result.map((p) => p.name)).toContain("Project 2");

			// Verify relations are loaded
			expect(result[0]).toHaveProperty("repositories");
			expect(result[0]).toHaveProperty("environments");
		});

		it("should return projects by specific IDs", async () => {
			const project = await projectFactory.create({
				teamId: testTeamId,
				name: "Specific Project",
			});
			createdProjectIds.push(project.id);

			const result = await getProjects({ ids: [project.id] });

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("Specific Project");
			expect(result[0].id).toBe(project.id);
		});

		it("should return projects by owner login", async () => {
			const ownerLogin = "test-owner";
			const project = await projectFactory.create({
				teamId: testTeamId,
				ownerLogin,
			});
			createdProjectIds.push(project.id);

			const result = await getProjects({ ownerLogin });

			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.some((p) => p.id === project.id)).toBe(true);
			expect(result.every((p) => p.ownerLogin === ownerLogin)).toBe(true);
		});

		it("should return empty array when no conditions provided", async () => {
			const result = await getProjects({});

			expect(result).toEqual([]);
		});

		it("should return empty array when no projects match", async () => {
			const result = await getProjects({ ids: ["non-existent-id"] });

			expect(result).toEqual([]);
		});
	});

	describe("createProjects", () => {
		it("should create a single project", async () => {
			const projectData = projectFactory.build({
				teamId: testTeamId,
				name: "New Project",
			});

			const [created] = await createProjects(projectData);
			createdProjectIds.push(created.id);

			expect(created).toHaveProperty("id");
			expect(created.name).toBe("New Project");
			expect(created.teamId).toBe(testTeamId);
			expect(created.previewEnvironmentsCount).toBe(0);

			// Verify it's actually in the database
			const [fromDb] = await getProjects({ ids: [created.id] });
			expect(fromDb.name).toBe("New Project");
		});

		it("should create multiple projects in bulk", async () => {
			const projectsData = [
				projectFactory.build({ teamId: testTeamId, name: "Bulk Project 1" }),
				projectFactory.build({ teamId: testTeamId, name: "Bulk Project 2" }),
				projectFactory.build({ teamId: testTeamId, name: "Bulk Project 3" }),
			];

			const created = await createProjects(projectsData);
			createdProjectIds.push(...created.map((p) => p.id));

			expect(created).toHaveLength(3);
			expect(created.map((p) => p.name)).toContain("Bulk Project 1");
			expect(created.map((p) => p.name)).toContain("Bulk Project 2");
			expect(created.map((p) => p.name)).toContain("Bulk Project 3");
		});

		it("should set default values correctly", async () => {
			const projectData = projectFactory.build({
				teamId: testTeamId,
				previewEnvironmentsCount: undefined,
			});

			const [created] = await createProjects(projectData);
			createdProjectIds.push(created.id);

			expect(created.previewEnvironmentsCount).toBe(0);
			expect(created.createdAt).toBeInstanceOf(Date);
			expect(created.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe("updateProjects", () => {
		it("should update multiple projects by IDs", async () => {
			// Create test projects
			const [project1, project2] = await Promise.all([
				projectFactory.create({ teamId: testTeamId, description: "Old 1" }),
				projectFactory.create({ teamId: testTeamId, description: "Old 2" }),
			]);
			createdProjectIds.push(project1.id, project2.id);

			// Update both projects
			const updated = await updateProjects([project1.id, project2.id], {
				description: "Updated Description",
			});

			expect(updated).toHaveLength(2);
			expect(
				updated.every((p) => p.description === "Updated Description"),
			).toBe(true);

			// Verify in database
			const fromDb = await getProjects({ ids: [project1.id, project2.id] });
			expect(fromDb.every((p) => p.description === "Updated Description")).toBe(
				true,
			);
		});

		it("should update updatedAt timestamp", async () => {
			const project = await projectFactory.create({ teamId: testTeamId });
			createdProjectIds.push(project.id);

			const originalUpdatedAt = project.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			const [updated] = await updateProjects([project.id], {
				description: "Updated",
			});

			expect(updated.updatedAt.getTime()).toBeGreaterThan(
				originalUpdatedAt.getTime(),
			);
		});

		it("should return empty array when no IDs provided", async () => {
			const result = await updateProjects([], { description: "Test" });

			expect(result).toEqual([]);
		});
	});

	describe("incrementPreviewCount", () => {
		it("should increment preview environment count", async () => {
			const project = await projectFactory.create({
				teamId: testTeamId,
				previewEnvironmentsCount: 5,
			});
			createdProjectIds.push(project.id);

			const [updated] = await incrementPreviewCount(project.id);

			expect(updated.previewEnvironmentsCount).toBe(6);

			// Verify in database
			const [fromDb] = await getProjects({ ids: [project.id] });
			expect(fromDb.previewEnvironmentsCount).toBe(6);
		});

		it("should increment from 0", async () => {
			const project = await projectFactory.create({
				teamId: testTeamId,
				previewEnvironmentsCount: 0,
			});
			createdProjectIds.push(project.id);

			const [updated] = await incrementPreviewCount(project.id);

			expect(updated.previewEnvironmentsCount).toBe(1);
		});

		it("should throw error when project not found", async () => {
			await expect(incrementPreviewCount("non-existent-id")).rejects.toThrow(
				"Project not found",
			);
		});
	});
});
