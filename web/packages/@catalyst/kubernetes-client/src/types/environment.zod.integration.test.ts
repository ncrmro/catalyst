/**
 * Integration test for Zod schema validation
 *
 * This test ensures that Zod schemas can be imported and used correctly
 * with the kubernetes-client package.
 */

import { describe, it, expect } from "vitest";
import type { Environment } from "./environment";
import {
  EnvironmentSchema,
  validateEnvironment,
  safeValidateEnvironment,
  EnvironmentListSchema,
} from "./environment.zod";

describe("Zod Schema Integration", () => {
  const validEnvironment: Environment = {
    apiVersion: "catalyst.catalyst.dev/v1alpha1",
    kind: "Environment",
    metadata: {
      name: "integration-test",
      namespace: "default",
    },
    spec: {
      projectRef: { name: "test-project" },
      type: "development",
    },
  };

  it("should validate a TypeScript-typed Environment", () => {
    // This proves the Zod schema matches the TypeScript type
    const result = EnvironmentSchema.safeParse(validEnvironment);
    expect(result.success).toBe(true);
  });

  it("should use helper functions correctly", () => {
    const validated = validateEnvironment(validEnvironment);
    expect(validated).toEqual(validEnvironment);
  });

  it("should work with safeValidate helper", () => {
    const result = safeValidateEnvironment(validEnvironment);
    expect(result.success).toBe(true);
  });

  it("should validate EnvironmentList", () => {
    const list = {
      apiVersion: "catalyst.catalyst.dev/v1alpha1",
      kind: "EnvironmentList",
      metadata: {},
      items: [validEnvironment],
    };

    const result = EnvironmentListSchema.safeParse(list);
    expect(result.success).toBe(true);
  });

  it("should catch validation errors", () => {
    const invalid = {
      apiVersion: "v1", // Wrong version
      kind: "Environment",
      metadata: { name: "test" },
      spec: {
        projectRef: { name: "project" },
        type: "development",
      },
    };

    const result = safeValidateEnvironment(invalid);
    expect(result.success).toBe(false);
  });

  it("should validate complex environment with all fields", () => {
    const complex: Environment = {
      apiVersion: "catalyst.catalyst.dev/v1alpha1",
      kind: "Environment",
      metadata: {
        name: "complex-env",
        namespace: "production",
        uid: "123-456",
        resourceVersion: "1000",
        labels: {
          app: "my-app",
          env: "prod",
        },
        annotations: {
          "catalyst.dev/note": "test environment",
        },
      },
      spec: {
        projectRef: { name: "main-project" },
        type: "deployment",
        deploymentMode: "production",
        sources: [
          {
            name: "web",
            commitSha: "abc123def456",
            branch: "main",
          },
          {
            name: "api",
            commitSha: "def456abc123",
            branch: "main",
          },
        ],
        config: {
          envVars: [
            { name: "NODE_ENV", value: "production" },
            { name: "API_URL", value: "https://api.example.com" },
          ],
          image: "ghcr.io/ncrmro/catalyst:v1.0.0",
        },
      },
      status: {
        phase: "Ready",
        url: "https://complex-env.example.com",
        conditions: [
          {
            type: "Available",
            status: "True",
            lastTransitionTime: "2024-01-01T00:00:00Z",
            reason: "DeploymentReady",
            message: "All components are running",
            observedGeneration: 1,
          },
        ],
      },
    };

    const result = validateEnvironment(complex);
    expect(result).toEqual(complex);
  });
});
