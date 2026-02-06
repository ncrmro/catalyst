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
} from "@/models/secrets";
import { userFactory, teamFactory, repoFactory } from "../../factories";
import type { SecretScope } from "@/types/secrets";

describe("Template Secrets Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testProjectId: string;
  let testRepoId: string;
  let testDeploymentEnvId: string;
  let testDevelopmentEnvId: string;
  const createdSecretIds: string[] = [];
  let originalKey: string | undefined;

  beforeAll(async () => {
    // Set up encryption key for tests
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    // Create test user
    const testUser = await userFactory.create({
      name: "Template Secrets Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({
      ownerId: testUserId,
      name: "Template Secrets Test Team",
    });
    testTeamId = testTeam.id;

    // Create test repo
    const testRepo = await repoFactory.create({
      teamId: testTeamId,
      name: "template-test-repo",
      fullName: "template/test-repo",
    });
    testRepoId = testRepo.id;

    // Create test project
    const [project] = await db
      .insert(projects)
      .values({
        name: "Template Test Project",
        slug: "template-test-project",
        fullName: "template/project",
        ownerLogin: "test",
        ownerType: "User",
        teamId: testTeamId,
      })
      .returning();
    testProjectId = project.id;

    // Create deployment environment
    const [deploymentEnv] = await db
      .insert(projectEnvironments)
      .values({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "production",
      })
      .returning();
    testDeploymentEnvId = deploymentEnv.id;

    // Create development environment
    const [developmentEnv] = await db
      .insert(projectEnvironments)
      .values({
        projectId: testProjectId,
        repoId: testRepoId,
        environment: "dev-feature",
      })
      .returning();
    testDevelopmentEnvId = developmentEnv.id;
  });

  afterAll(async () => {
    // Clean up
    if (createdSecretIds.length > 0) {
      for (const secretId of createdSecretIds) {
        await db.delete(secrets).where(eq(secrets.id, secretId));
      }
    }
    if (testDeploymentEnvId) {
      await db
        .delete(projectEnvironments)
        .where(eq(projectEnvironments.id, testDeploymentEnvId));
    }
    if (testDevelopmentEnvId) {
      await db
        .delete(projectEnvironments)
        .where(eq(projectEnvironments.id, testDevelopmentEnvId));
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
    if (createdSecretIds.length > 0) {
      for (const secretId of createdSecretIds) {
        await db.delete(secrets).where(eq(secrets.id, secretId));
      }
      createdSecretIds.length = 0;
    }
  });

  describe("CRUD for template scope", () => {
    it("should create and retrieve deployment template secret", async () => {
      const scope: SecretScope = {
        level: "template",
        teamId: testTeamId,
        projectId: testProjectId,
        environmentType: "deployment",
      };

      const created = await createSecret(
        scope,
        "DEPLOY_TEMPLATE_KEY",
        "deploy-val",
        "Deploy template desc",
        testUserId,
      );
      createdSecretIds.push(created.id);

      expect(created.projectId).toBe(testProjectId);
      expect(created.environmentType).toBe("deployment");
      expect(created.environmentId).toBeNull();

      const retrieved = await getSecretsForScope(scope);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].name).toBe("DEPLOY_TEMPLATE_KEY");
    });
  });

  describe("resolveSecretsForEnvironment - 4-Tier Precedence", () => {
    it("should apply team < project < template < environment precedence", async () => {
      // Create same-named secret at all four levels
      const teamSecret = await createSecret(
        { level: "team", teamId: testTeamId },
        "FULL_PRECEDENCE_KEY",
        "team-val",
        undefined,
        testUserId,
      );
      createdSecretIds.push(teamSecret.id);

      const projectSecret = await createSecret(
        { level: "project", teamId: testTeamId, projectId: testProjectId },
        "FULL_PRECEDENCE_KEY",
        "project-val",
        undefined,
        testUserId,
      );
      createdSecretIds.push(projectSecret.id);

      const templateSecret = await createSecret(
        {
          level: "template",
          teamId: testTeamId,
          projectId: testProjectId,
          environmentType: "deployment",
        },
        "FULL_PRECEDENCE_KEY",
        "template-val",
        undefined,
        testUserId,
      );
      createdSecretIds.push(templateSecret.id);

      const envSecret = await createSecret(
        {
          level: "environment",
          teamId: testTeamId,
          projectId: testProjectId,
          environmentId: testDeploymentEnvId,
        },
        "FULL_PRECEDENCE_KEY",
        "env-val",
        undefined,
        testUserId,
      );
      createdSecretIds.push(envSecret.id);

      // Resolve for deployment environment
      const resolved = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        "deployment",
        testDeploymentEnvId,
      );

      const secret = resolved.get("FULL_PRECEDENCE_KEY");
      expect(secret?.value).toBe("env-val");
      expect(secret?.source).toBe("environment");

      // Resolve for deployment environment but WITHOUT environment-level secret
      await db.delete(secrets).where(eq(secrets.id, envSecret.id));
      
      const resolved2 = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        "deployment",
        testDeploymentEnvId,
      );
      expect(resolved2.get("FULL_PRECEDENCE_KEY")?.value).toBe("template-val");
      expect(resolved2.get("FULL_PRECEDENCE_KEY")?.source).toBe("template");

      // Resolve for deployment environment but WITHOUT template-level secret
      await db.delete(secrets).where(eq(secrets.id, templateSecret.id));
      
      const resolved3 = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        "deployment",
        testDeploymentEnvId,
      );
      expect(resolved3.get("FULL_PRECEDENCE_KEY")?.value).toBe("project-val");
      expect(resolved3.get("FULL_PRECEDENCE_KEY")?.source).toBe("project");
    });

    it("should isolate deployment and development template secrets", async () => {
      // Deployment template secret
      const deployTemplate = await createSecret(
        {
          level: "template",
          teamId: testTeamId,
          projectId: testProjectId,
          environmentType: "deployment",
        },
        "TEMPLATE_ISO_KEY",
        "deploy-val",
        undefined,
        testUserId,
      );
      createdSecretIds.push(deployTemplate.id);

      // Development template secret
      const devTemplate = await createSecret(
        {
          level: "template",
          teamId: testTeamId,
          projectId: testProjectId,
          environmentType: "development",
        },
        "TEMPLATE_ISO_KEY",
        "dev-val",
        undefined,
        testUserId,
      );
      createdSecretIds.push(devTemplate.id);

      // Resolve for deployment
      const resolvedDeploy = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        "deployment",
        testDeploymentEnvId,
      );
      expect(resolvedDeploy.get("TEMPLATE_ISO_KEY")?.value).toBe("deploy-val");

      // Resolve for development
      const resolvedDev = await resolveSecretsForEnvironment(
        testTeamId,
        testProjectId,
        "development",
        testDevelopmentEnvId,
      );
      expect(resolvedDev.get("TEMPLATE_ISO_KEY")?.value).toBe("dev-val");
    });
  });
});
