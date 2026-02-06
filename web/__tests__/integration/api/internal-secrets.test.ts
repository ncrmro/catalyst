/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import {
  teams,
  projects,
  projectEnvironments,
  users,
  repos,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSecret } from "@/models/secrets";
import { userFactory, teamFactory, repoFactory } from "../../factories";
import { GET } from "@/app/api/internal/secrets/[environmentId]/route";
import { NextRequest } from "next/server";
import { vi } from "vitest";

// Mock Kubernetes client
vi.mock("@/lib/k8s-client", () => ({
  getClusterConfig: vi.fn().mockResolvedValue({
    makeApiClient: () => ({
      createTokenReview: vi.fn().mockResolvedValue({
        status: {
          authenticated: true,
          user: { username: "system:serviceaccount:catalyst-system:catalyst-operator" },
        },
      }),
    }),
  }),
}));

describe("Internal Secrets API Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testRepoId: string;
  let testEnvironmentId: string;

  beforeAll(async () => {
    // Set up encryption key
    process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    // Create test data
    const testUser = await userFactory.create({ name: "API Test User" });
    testUserId = testUser.id;

    const testTeam = await teamFactory.create({ ownerId: testUserId, name: "API Test Team" });
    testTeamId = testTeam.id;

    const testRepo = await repoFactory.create({ teamId: testTeamId, name: "api-repo", fullName: "test/api-repo" });
    testRepoId = testRepo.id;

    const [project] = await db.insert(projects).values({
      name: "API Project",
      slug: "api-project",
      fullName: "test/api-project",
      ownerLogin: "test",
      ownerType: "User",
      teamId: testTeamId,
    }).returning();
    testProjectId = project.id;

    const [environment] = await db.insert(projectEnvironments).values({
      projectId: testProjectId,
      repoId: testRepoId,
      environment: "development",
    }).returning();
    testEnvironmentId = environment.id;

    // Add some secrets
    await createSecret({ level: "team", teamId: testTeamId }, "TEAM_KEY", "team-val", undefined, testUserId);
    await createSecret({ level: "project", teamId: testTeamId, projectId: testProjectId }, "PROJECT_KEY", "project-val", undefined, testUserId);
    await createSecret({ level: "environment", teamId: testTeamId, projectId: testProjectId, environmentId: testEnvironmentId }, "ENV_KEY", "env-val", undefined, testUserId);
    
    // Override a key
    await createSecret({ level: "project", teamId: testTeamId, projectId: testProjectId }, "TEAM_KEY", "overridden-val", undefined, testUserId);
  });

  afterAll(async () => {
    // Clean up
    await db.delete(projectEnvironments).where(eq(projectEnvironments.id, testEnvironmentId));
    await db.delete(projects).where(eq(projects.id, testProjectId));
    await db.delete(repos).where(eq(repos.id, testRepoId));
    await db.delete(teams).where(eq(teams.id, testTeamId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return resolved secrets for an environment", async () => {
    const req = new NextRequest(`http://localhost/api/internal/secrets/${testEnvironmentId}`, {
      headers: {
        authorization: "Bearer mock-token",
      },
    });

    const response = await GET(req, { params: Promise.resolve({ environmentId: testEnvironmentId }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.secrets).toBeDefined();
    expect(data.secrets.TEAM_KEY).toBe("overridden-val");
    expect(data.secrets.PROJECT_KEY).toBe("project-val");
    expect(data.secrets.ENV_KEY).toBe("env-val");
  });

  it("should return 401 if token is missing", async () => {
    const req = new NextRequest(`http://localhost/api/internal/secrets/${testEnvironmentId}`);
    const response = await GET(req, { params: Promise.resolve({ environmentId: testEnvironmentId }) });
    expect(response.status).toBe(401);
  });

  it("should return 404 if environment not found", async () => {
    const req = new NextRequest(`http://localhost/api/internal/secrets/non-existent`, {
      headers: {
        authorization: "Bearer mock-token",
      },
    });

    const response = await GET(req, { params: Promise.resolve({ environmentId: "00000000-0000-0000-0000-000000000000" }) });
    expect(response.status).toBe(404);
  });
});
