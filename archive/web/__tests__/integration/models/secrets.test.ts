/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/db";
import {
  secrets,
  teams,
  projects,
  projectEnvironments,
  users,
  repos,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  resolveSecretsForEnvironment,
  getSecretsForScope,
  createSecret,
  updateSecret,
  deleteSecret,
} from "@/models/secrets";
import { userFactory, teamFactory, repoFactory } from "../../factories";
import type { SecretScope } from "@/types/secrets";

/**
 * Integration tests for secrets model (FR-ENV-034 through FR-ENV-041)
 *
 * Tests precedence resolution, encryption, and CRUD operations
 */
describe("Secrets Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testRepoId: string;
  let testEnvironmentId: string;
  const createdSecretIds: string[] = [];
  let originalKey: string | undefined;

  beforeAll(async () => {
    // Set up encryption key for tests
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    // Create test user
    const testUser = await userFactory.create({
      name: "Secrets Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({
      ownerId: testUserId,
      name: "Secrets Test Team",
    });
    testTeamId = testTeam.id;

    // Create test repo
    const testRepo = await repoFactory.create({
      teamId: testTeamId,
      name: "test-repo",
      fullName: "test/repo",
    });
    testRepoId = testRepo.id;

    // Create test project
    const [project] = await db
      .insert(projects)
      .values({
        name: "Test Project",
        slug: "test-project-secrets",
        fullName: "test/project",
        ownerLogin: "test",
        ownerType: "User",
        teamId: testTeamId,
      })
      .returning();
    testProjectId = project.id;

    // Create test environment
    const [environment] = await db
      .insert(projectEnvironments)
      .values({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "development",
      })
      .returning();
    testEnvironmentId = environment.id;
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    if (createdSecretIds.length > 0) {
      for (const secretId of createdSecretIds) {
        await db.delete(secrets).where(eq(secrets.id, secretId));
      }
    }
    if (testEnvironmentId) {
      await db
        .delete(projectEnvironments)
        .where(eq(projectEnvironments.id, testEnvironmentId));
    }
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

    // Restore encryption key
    if (originalKey !== undefined) {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });

  beforeEach(async () => {
    // Clean up secrets before each test
    if (createdSecretIds.length > 0) {
      for (const secretId of createdSecretIds) {
        await db.delete(secrets).where(eq(secrets.id, secretId));
      }
      createdSecretIds.length = 0;
    }
  });

  describe("createSecret and getSecretsForScope", () => {
    it("should create and retrieve team-level secret", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      const created = await createSecret(
        scope,
        "TEAM_SECRET",
        "team-value",
        "Team secret description",
        testUserId,
      );
      createdSecretIds.push(created.id);

      expect(created.teamId).toBe(testTeamId);
      expect(created.projectId).toBeNull();
      expect(created.environmentId).toBeNull();
      expect(created.name).toBe("TEAM_SECRET");
      expect(created.encryptedValue).toBeTruthy();
      expect(created.iv).toBeTruthy();
      expect(created.authTag).toBeTruthy();

      const retrieved = await getSecretsForScope(scope);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].name).toBe("TEAM_SECRET");
    });

    it("should create and retrieve project-level secret", async () => {
      const scope: SecretScope = {
        level: "project",
        teamId: testTeamId,
        projectId: testProjectId,
      };

      const created = await createSecret(
        scope,
        "PROJECT_SECRET",
        "project-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(created.id);

      expect(created.projectId).toBe(testProjectId);
      expect(created.environmentId).toBeNull();

      const retrieved = await getSecretsForScope(scope);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].name).toBe("PROJECT_SECRET");
    });

    it("should create and retrieve environment-level secret", async () => {
      const scope: SecretScope = {
        level: "environment",
        teamId: testTeamId,
        projectId: testProjectId,
        environmentId: testEnvironmentId,
      };

      const created = await createSecret(
        scope,
        "ENV_SECRET",
        "env-value",
        "Environment secret",
        testUserId,
      );
      createdSecretIds.push(created.id);

      expect(created.environmentId).toBe(testEnvironmentId);

      const retrieved = await getSecretsForScope(scope);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].name).toBe("ENV_SECRET");
    });
  });

  describe("resolveSecretsForEnvironment - Precedence (FR-ENV-035)", () => {
    it("should apply team < project < environment precedence", async () => {
      // Create same-named secret at all three levels
      const teamSecret = await createSecret(
        { level: "team", teamId: testTeamId },
        "SHARED_KEY",
        "team-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(teamSecret.id);

      const projectSecret = await createSecret(
        { level: "project", teamId: testTeamId, projectId: testProjectId },
        "SHARED_KEY",
        "project-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(projectSecret.id);

      const envSecret = await createSecret(
        {
          level: "environment",
          teamId: testTeamId,
          projectId: testProjectId,
          environmentId: testEnvironmentId,
        },
        "SHARED_KEY",
        "environment-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(envSecret.id);

      // Resolve for environment - should get environment value
      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        null, // No template type override needed here
        testEnvironmentId,
      );

      const secret = resolved.get("SHARED_KEY");
      expect(secret).toBeDefined();
      expect(secret?.value).toBe("environment-value");
      expect(secret?.source).toBe("environment");
    });

    it("should use project value when no environment secret exists", async () => {
      const teamSecret = await createSecret(
        { level: "team", teamId: testTeamId },
        "PARTIAL_KEY",
        "team-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(teamSecret.id);

      const projectSecret = await createSecret(
        { level: "project", teamId: testTeamId, projectId: testProjectId },
        "PARTIAL_KEY",
        "project-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(projectSecret.id);

      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        null,
        testEnvironmentId,
      );

      const secret = resolved.get("PARTIAL_KEY");
      expect(secret?.value).toBe("project-value");
      expect(secret?.source).toBe("project");
    });

    it("should use team value when only team secret exists", async () => {
      const teamSecret = await createSecret(
        { level: "team", teamId: testTeamId },
        "TEAM_ONLY_KEY",
        "team-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(teamSecret.id);

      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        null,
        testEnvironmentId,
      );

      const secret = resolved.get("TEAM_ONLY_KEY");
      expect(secret?.value).toBe("team-value");
      expect(secret?.source).toBe("team");
    });

    it("should merge secrets from multiple levels", async () => {
      // Team secret
      const teamSecret = await createSecret(
        { level: "team", teamId: testTeamId },
        "TEAM_KEY",
        "team-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(teamSecret.id);

      // Project secret
      const projectSecret = await createSecret(
        { level: "project", teamId: testTeamId, projectId: testProjectId },
        "PROJECT_KEY",
        "project-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(projectSecret.id);

      // Environment secret
      const envSecret = await createSecret(
        {
          level: "environment",
          teamId: testTeamId,
          projectId: testProjectId,
          environmentId: testEnvironmentId,
        },
        "ENV_KEY",
        "env-value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(envSecret.id);

      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        null,
        testEnvironmentId,
      );

      expect(resolved.size).toBe(3);
      expect(resolved.get("TEAM_KEY")?.value).toBe("team-value");
      expect(resolved.get("PROJECT_KEY")?.value).toBe("project-value");
      expect(resolved.get("ENV_KEY")?.value).toBe("env-value");
    });

    it("should throw error if environmentId provided without projectId", async () => {
      await expect(
        resolveSecretsForEnvironment(testTeamId, null, null, testEnvironmentId),
      ).rejects.toThrow("projectId is required when environmentId is provided");
    });
  });

  describe("updateSecret", () => {
    it("should update secret value", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      const created = await createSecret(
        scope,
        "UPDATE_TEST",
        "original-value",
        "Original description",
        testUserId,
      );
      createdSecretIds.push(created.id);

      const updated = await updateSecret(
        scope,
        "UPDATE_TEST",
        "new-value",
        "Updated description",
        testUserId,
      );

      expect(updated.id).toBe(created.id);
      expect(updated.description).toBe("Updated description");
      // Encrypted value should be different
      expect(updated.encryptedValue).not.toBe(created.encryptedValue);
    });

    it("should update only description if value not provided", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      const created = await createSecret(
        scope,
        "DESC_UPDATE",
        "value",
        "Original",
        testUserId,
      );
      createdSecretIds.push(created.id);

      const updated = await updateSecret(
        scope,
        "DESC_UPDATE",
        undefined,
        "New description",
        testUserId,
      );

      expect(updated.description).toBe("New description");
      expect(updated.encryptedValue).toBe(created.encryptedValue);
    });
  });

  describe("deleteSecret", () => {
    it("should delete secret by scope and name", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      const created = await createSecret(
        scope,
        "DELETE_TEST",
        "value",
        undefined,
        testUserId,
      );
      createdSecretIds.push(created.id);

      await deleteSecret(scope, "DELETE_TEST", testUserId);

      const retrieved = await getSecretsForScope(scope);
      expect(retrieved.length).toBe(0);
    });

    it("should throw error if secret not found", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      await expect(
        deleteSecret(scope, "NONEXISTENT", testUserId),
      ).rejects.toThrow("Secret not found");
    });
  });

  describe("encryption - handles various value types", () => {
    it("should handle multi-line secrets like private keys", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
... multiple lines ...
-----END RSA PRIVATE KEY-----`;

      const created = await createSecret(
        scope,
        "PRIVATE_KEY",
        privateKey,
        undefined,
        testUserId,
      );
      createdSecretIds.push(created.id);

      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        null,
        null,
        null,
      );

      expect(resolved.get("PRIVATE_KEY")?.value).toBe(privateKey);
    });

    it("should handle special characters", async () => {
      const scope: SecretScope = {
        level: "team",
        teamId: testTeamId,
      };

      const specialValue = 'Test!@#$%^&*()_+-=[]{}|;:",.<>?/~`';

      const created = await createSecret(
        scope,
        "SPECIAL_CHARS",
        specialValue,
        undefined,
        testUserId,
      );
      createdSecretIds.push(created.id);

      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        null,
        null,
        null,
      );

      expect(resolved.get("SPECIAL_CHARS")?.value).toBe(specialValue);
    });
  });
});
