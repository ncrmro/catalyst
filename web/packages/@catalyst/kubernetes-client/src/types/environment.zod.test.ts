/**
 * Tests for Environment Zod schemas
 */

import { describe, it, expect } from "vitest";
import {
  EnvironmentSchema,
  EnvironmentListSchema,
  EnvironmentInputSchema,
  validateEnvironment,
  safeValidateEnvironment,
  validateEnvironmentList,
  safeValidateEnvironmentList,
  EnvironmentSpecSchema,
  EnvironmentStatusSchema,
  EnvironmentSourceSchema,
  EnvVarSchema,
  ProjectReferenceSchema,
} from "./environment.zod";
import type { Environment, EnvironmentList } from "./environment";

describe("Environment Zod Schemas", () => {
  describe("ProjectReferenceSchema", () => {
    it("should validate a valid project reference", () => {
      const valid = { name: "my-project" };
      expect(() => ProjectReferenceSchema.parse(valid)).not.toThrow();
    });

    it("should reject project reference without name", () => {
      const invalid = {};
      expect(() => ProjectReferenceSchema.parse(invalid)).toThrow();
    });
  });

  describe("EnvironmentSourceSchema", () => {
    it("should validate a valid environment source", () => {
      const valid = {
        name: "web",
        commitSha: "abc123",
        branch: "main",
      };
      expect(() => EnvironmentSourceSchema.parse(valid)).not.toThrow();
    });

    it("should validate environment source with prNumber", () => {
      const valid = {
        name: "web",
        commitSha: "abc123",
        branch: "feature",
        prNumber: 42,
      };
      expect(() => EnvironmentSourceSchema.parse(valid)).not.toThrow();
    });

    it("should reject source without required fields", () => {
      const invalid = { name: "web" };
      expect(() => EnvironmentSourceSchema.parse(invalid)).toThrow();
    });
  });

  describe("EnvVarSchema", () => {
    it("should validate a valid environment variable", () => {
      const valid = { name: "API_KEY", value: "secret" };
      expect(() => EnvVarSchema.parse(valid)).not.toThrow();
    });

    it("should reject env var without name or value", () => {
      expect(() => EnvVarSchema.parse({ name: "API_KEY" })).toThrow();
      expect(() => EnvVarSchema.parse({ value: "secret" })).toThrow();
    });
  });

  describe("EnvironmentSpecSchema", () => {
    it("should validate a valid environment spec", () => {
      const valid = {
        projectRef: { name: "my-project" },
        type: "development",
      };
      expect(() => EnvironmentSpecSchema.parse(valid)).not.toThrow();
    });

    it("should validate spec with all optional fields", () => {
      const valid = {
        projectRef: { name: "my-project" },
        type: "deployment",
        deploymentMode: "production",
        sources: [
          {
            name: "web",
            commitSha: "abc123",
            branch: "main",
          },
        ],
        config: {
          envVars: [{ name: "ENV", value: "prod" }],
          image: "ghcr.io/ncrmro/catalyst:latest",
        },
      };
      expect(() => EnvironmentSpecSchema.parse(valid)).not.toThrow();
    });

    it("should reject invalid environment type", () => {
      const invalid = {
        projectRef: { name: "my-project" },
        type: "invalid",
      };
      expect(() => EnvironmentSpecSchema.parse(invalid)).toThrow();
    });

    it("should reject invalid deployment mode", () => {
      const invalid = {
        projectRef: { name: "my-project" },
        type: "development",
        deploymentMode: "invalid",
      };
      expect(() => EnvironmentSpecSchema.parse(invalid)).toThrow();
    });
  });

  describe("EnvironmentStatusSchema", () => {
    it("should validate an empty status", () => {
      const valid = {};
      expect(() => EnvironmentStatusSchema.parse(valid)).not.toThrow();
    });

    it("should validate status with all fields", () => {
      const valid = {
        phase: "Ready",
        url: "https://my-env.example.com",
        conditions: [
          {
            type: "Available",
            status: "True",
            lastTransitionTime: "2024-01-01T00:00:00Z",
            reason: "MinimumReplicasAvailable",
            message: "Deployment has minimum availability",
          },
        ],
      };
      expect(() => EnvironmentStatusSchema.parse(valid)).not.toThrow();
    });

    it("should reject invalid phase", () => {
      const invalid = { phase: "Invalid" };
      expect(() => EnvironmentStatusSchema.parse(invalid)).toThrow();
    });
  });

  describe("EnvironmentSchema", () => {
    const validEnvironment: Environment = {
      apiVersion: "catalyst.catalyst.dev/v1alpha1",
      kind: "Environment",
      metadata: {
        name: "test-env",
        namespace: "default",
        uid: "123",
        resourceVersion: "1000",
        creationTimestamp: "2024-01-01T00:00:00Z",
      },
      spec: {
        projectRef: { name: "my-project" },
        type: "development",
        deploymentMode: "workspace",
        sources: [
          {
            name: "web",
            commitSha: "abc123",
            branch: "main",
          },
        ],
      },
      status: {
        phase: "Ready",
        url: "https://test-env.example.com",
      },
    };

    it("should validate a complete environment", () => {
      expect(() => EnvironmentSchema.parse(validEnvironment)).not.toThrow();
    });

    it("should validate environment without status", () => {
      const envWithoutStatus = { ...validEnvironment, status: undefined };
      expect(() => EnvironmentSchema.parse(envWithoutStatus)).not.toThrow();
    });

    it("should reject wrong apiVersion", () => {
      const invalid = { ...validEnvironment, apiVersion: "v1" };
      expect(() => EnvironmentSchema.parse(invalid)).toThrow();
    });

    it("should reject wrong kind", () => {
      const invalid = { ...validEnvironment, kind: "Pod" };
      expect(() => EnvironmentSchema.parse(invalid)).toThrow();
    });

    it("should reject missing metadata", () => {
      const invalid = { ...validEnvironment, metadata: undefined };
      expect(() => EnvironmentSchema.parse(invalid)).toThrow();
    });

    it("should reject missing spec", () => {
      const invalid = { ...validEnvironment, spec: undefined };
      expect(() => EnvironmentSchema.parse(invalid)).toThrow();
    });
  });

  describe("EnvironmentListSchema", () => {
    const validList: EnvironmentList = {
      apiVersion: "catalyst.catalyst.dev/v1alpha1",
      kind: "EnvironmentList",
      metadata: {
        resourceVersion: "1000",
      },
      items: [
        {
          apiVersion: "catalyst.catalyst.dev/v1alpha1",
          kind: "Environment",
          metadata: {
            name: "test-env-1",
            namespace: "default",
          },
          spec: {
            projectRef: { name: "project-1" },
            type: "development",
          },
        },
        {
          apiVersion: "catalyst.catalyst.dev/v1alpha1",
          kind: "Environment",
          metadata: {
            name: "test-env-2",
            namespace: "default",
          },
          spec: {
            projectRef: { name: "project-2" },
            type: "deployment",
          },
        },
      ],
    };

    it("should validate a valid environment list", () => {
      expect(() => EnvironmentListSchema.parse(validList)).not.toThrow();
    });

    it("should validate empty list", () => {
      const emptyList = { ...validList, items: [] };
      expect(() => EnvironmentListSchema.parse(emptyList)).not.toThrow();
    });

    it("should reject wrong kind", () => {
      const invalid = { ...validList, kind: "Environment" };
      expect(() => EnvironmentListSchema.parse(invalid)).toThrow();
    });

    it("should reject invalid items", () => {
      const invalid = {
        ...validList,
        items: [{ invalid: "object" }],
      };
      expect(() => EnvironmentListSchema.parse(invalid)).toThrow();
    });
  });

  describe("EnvironmentInputSchema", () => {
    it("should validate environment input without status", () => {
      const valid = {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "Environment",
        metadata: {
          name: "test-env",
          namespace: "default",
        },
        spec: {
          projectRef: { name: "my-project" },
          type: "development",
        },
      };
      expect(() => EnvironmentInputSchema.parse(valid)).not.toThrow();
    });

    it("should omit status field", () => {
      const input = {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "Environment",
        metadata: {
          name: "test-env",
          namespace: "default",
        },
        spec: {
          projectRef: { name: "my-project" },
          type: "development",
        },
        status: { phase: "Ready" },
      };
      const parsed = EnvironmentInputSchema.parse(input);
      expect(parsed).not.toHaveProperty("status");
    });
  });

  describe("validateEnvironment", () => {
    it("should return parsed environment for valid data", () => {
      const valid = {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "Environment",
        metadata: { name: "test" },
        spec: {
          projectRef: { name: "project" },
          type: "development",
        },
      };
      const result = validateEnvironment(valid);
      expect(result).toEqual(valid);
    });

    it("should throw for invalid data", () => {
      const invalid = { invalid: "data" };
      expect(() => validateEnvironment(invalid)).toThrow();
    });
  });

  describe("safeValidateEnvironment", () => {
    it("should return success for valid data", () => {
      const valid = {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "Environment",
        metadata: { name: "test" },
        spec: {
          projectRef: { name: "project" },
          type: "development",
        },
      };
      const result = safeValidateEnvironment(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it("should return error for invalid data", () => {
      const invalid = { invalid: "data" };
      const result = safeValidateEnvironment(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("validateEnvironmentList", () => {
    it("should return parsed list for valid data", () => {
      const valid = {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "EnvironmentList",
        metadata: {},
        items: [],
      };
      const result = validateEnvironmentList(valid);
      expect(result).toEqual(valid);
    });

    it("should throw for invalid data", () => {
      const invalid = { invalid: "data" };
      expect(() => validateEnvironmentList(invalid)).toThrow();
    });
  });

  describe("safeValidateEnvironmentList", () => {
    it("should return success for valid data", () => {
      const valid = {
        apiVersion: "catalyst.catalyst.dev/v1alpha1",
        kind: "EnvironmentList",
        metadata: {},
        items: [],
      };
      const result = safeValidateEnvironmentList(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it("should return error for invalid data", () => {
      const invalid = { invalid: "data" };
      const result = safeValidateEnvironmentList(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
