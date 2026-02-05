/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/db";
import {
  teams,
  projects,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { userFactory, teamFactory } from "../../factories";
import { createSecret, listSecrets, updateSecret, deleteSecret } from "@/actions/secrets";

// Mock auth
const mockSession = {
  user: { id: "test-user-id" },
};

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(mockSession),
}));

describe("Secrets Actions Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;

  beforeAll(async () => {
    process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const testUser = await userFactory.create({ name: "Action Test User" });
    testUserId = testUser.id;
    mockSession.user.id = testUserId;

    const testTeam = await teamFactory.create({ ownerId: testUserId, name: "Action Test Team" });
    testTeamId = testTeam.id;

    const [project] = await db.insert(projects).values({
      name: "Action Project",
      slug: "action-project",
      fullName: "test/action-project",
      ownerLogin: "test",
      ownerType: "User",
      teamId: testTeamId,
    }).returning();
    testProjectId = project.id;
  });

  afterAll(async () => {
    await db.delete(projects).where(eq(projects.id, testProjectId));
    await db.delete(teams).where(eq(teams.id, testTeamId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should create and list secrets", async () => {
    const scope = { level: "project" as const, teamId: testTeamId, projectId: testProjectId };
    
    const createResult = await createSecret(scope, {
      name: "ACTION_KEY",
      value: "action-val",
      description: "Action test description",
    });

    expect(createResult.success).toBe(true);
    if (createResult.success) {
      expect(createResult.data.name).toBe("ACTION_KEY");
      expect(createResult.data.value).toBe("action-val");
    }

    const listResult = await listSecrets(scope);
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const secret = listResult.data.find(s => s.name === "ACTION_KEY");
      expect(secret).toBeDefined();
      expect(secret?.source).toBe("project");
    }
  });

  it("should update a secret", async () => {
    const scope = { level: "project" as const, teamId: testTeamId, projectId: testProjectId };
    
    const updateResult = await updateSecret(scope, "ACTION_KEY", {
      value: "updated-val",
      description: "Updated description",
    });

    expect(updateResult.success).toBe(true);

    const listResult = await listSecrets(scope);
    if (listResult.success) {
      const secret = listResult.data.find(s => s.name === "ACTION_KEY");
      expect(secret?.description).toBe("Updated description");
    }
  });

  it("should delete a secret", async () => {
    const scope = { level: "project" as const, teamId: testTeamId, projectId: testProjectId };
    
    const deleteResult = await deleteSecret(scope, "ACTION_KEY");
    expect(deleteResult.success).toBe(true);

    const listResult = await listSecrets(scope);
    if (listResult.success) {
      const secret = listResult.data.find(s => s.name === "ACTION_KEY");
      expect(secret).toBeUndefined();
    }
  });
});
