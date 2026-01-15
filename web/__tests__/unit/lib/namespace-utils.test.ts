/**
 * Unit tests for namespace utilities (FR-ENV-020 and FR-ENV-021)
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeNamespaceComponent,
  generateNamespaceWithHash,
  generateTeamNamespace,
  generateProjectNamespace,
  generateEnvironmentNamespace,
  isValidNamespaceName,
  extractNamespaceHierarchy,
} from "@/lib/namespace-utils";

describe("namespace-utils", () => {
  describe("sanitizeNamespaceComponent", () => {
    it("should convert to lowercase", () => {
      expect(sanitizeNamespaceComponent("MyTeam")).toBe("myteam");
    });

    it("should replace invalid characters with hyphens", () => {
      expect(sanitizeNamespaceComponent("my_team")).toBe("my-team");
      expect(sanitizeNamespaceComponent("my team")).toBe("my-team");
      expect(sanitizeNamespaceComponent("my/team")).toBe("my-team");
      expect(sanitizeNamespaceComponent("my.team")).toBe("my-team");
    });

    it("should collapse multiple hyphens", () => {
      expect(sanitizeNamespaceComponent("my---team")).toBe("my-team");
      expect(sanitizeNamespaceComponent("my___team")).toBe("my-team");
    });

    it("should remove leading and trailing hyphens", () => {
      expect(sanitizeNamespaceComponent("-myteam-")).toBe("myteam");
      expect(sanitizeNamespaceComponent("--myteam--")).toBe("myteam");
    });

    it("should handle complex mixed input", () => {
      expect(sanitizeNamespaceComponent("My_Team-Name.123")).toBe(
        "my-team-name-123",
      );
    });
  });

  describe("generateNamespaceWithHash", () => {
    it("should return original name if under 63 characters", () => {
      const result = generateNamespaceWithHash(["my-team", "my-project", "dev"]);
      expect(result).toBe("my-team-my-project-dev");
      expect(result.length).toBeLessThanOrEqual(63);
    });

    it("should truncate and append hash if over 63 characters", () => {
      const longComponents = [
        "my-super-long-team-name",
        "my-super-long-project-name",
        "feature-very-long-branch-name",
      ];
      const result = generateNamespaceWithHash(longComponents);

      // Should be exactly 63 characters
      expect(result.length).toBe(63);

      // Should end with 5-character hash
      const parts = result.split("-");
      const lastPart = parts[parts.length - 1];
      expect(lastPart).toHaveLength(5);
      expect(lastPart).toMatch(/^[a-f0-9]{5}$/);
    });

    it("should produce consistent hashes for same input", () => {
      const components = ["long-team", "long-project", "long-environment"];
      const result1 = generateNamespaceWithHash(components);
      const result2 = generateNamespaceWithHash(components);

      expect(result1).toBe(result2);
    });

    it("should produce different hashes for different inputs", () => {
      const components1 = ["team1", "project1", "env1"];
      const components2 = ["team2", "project2", "env2"];

      const result1 = generateNamespaceWithHash(components1);
      const result2 = generateNamespaceWithHash(components2);

      // If both are under 63 chars, they'll be different naturally
      // If truncated, the hash should differ
      expect(result1).not.toBe(result2);
    });

    it("should handle components with invalid characters", () => {
      const result = generateNamespaceWithHash([
        "My_Team",
        "My/Project",
        "Feature.Branch",
      ]);
      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(result).not.toContain("_");
      expect(result).not.toContain("/");
      expect(result).not.toContain(".");
    });

    it("should not end with hyphen after truncation", () => {
      const longComponents = Array(20).fill("a".repeat(5));
      const result = generateNamespaceWithHash(longComponents);

      expect(result).not.toMatch(/-$/);
    });

    it("should handle edge case: exactly 63 characters", () => {
      // Create components that sum to exactly 63 chars
      const result = generateNamespaceWithHash(["a".repeat(30), "b".repeat(31)]);
      expect(result.length).toBeLessThanOrEqual(63);
    });

    it("should filter empty components", () => {
      const result = generateNamespaceWithHash(["team", "", "project"]);
      expect(result).toBe("team-project");
    });
  });

  describe("generateTeamNamespace", () => {
    it("should generate valid team namespace", () => {
      expect(generateTeamNamespace("my-team")).toBe("my-team");
    });

    it("should sanitize team name", () => {
      expect(generateTeamNamespace("My_Team")).toBe("my-team");
    });
  });

  describe("generateProjectNamespace", () => {
    it("should generate valid project namespace", () => {
      const result = generateProjectNamespace("my-team", "my-project");
      expect(result).toBe("my-team-my-project");
      expect(result.length).toBeLessThanOrEqual(63);
    });

    it("should handle long names with truncation", () => {
      const result = generateProjectNamespace(
        "my-super-long-team-name",
        "my-super-long-project-name-that-is-really-long",
      );
      expect(result.length).toBeLessThanOrEqual(63);
      expect(isValidNamespaceName(result)).toBe(true);
    });
  });

  describe("generateEnvironmentNamespace", () => {
    it("should generate valid environment namespace", () => {
      const result = generateEnvironmentNamespace(
        "my-team",
        "my-project",
        "dev",
      );
      expect(result).toBe("my-team-my-project-dev");
      expect(result.length).toBeLessThanOrEqual(63);
    });

    it("should handle long names with truncation and hashing", () => {
      const result = generateEnvironmentNamespace(
        "my-super-long-team-name",
        "my-super-long-project-name",
        "feature-very-long-branch-name",
      );

      expect(result.length).toBe(63);
      expect(isValidNamespaceName(result)).toBe(true);
    });

    it("should produce consistent results for same inputs", () => {
      const result1 = generateEnvironmentNamespace(
        "team",
        "project",
        "environment",
      );
      const result2 = generateEnvironmentNamespace(
        "team",
        "project",
        "environment",
      );

      expect(result1).toBe(result2);
    });

    it("should handle special characters", () => {
      const result = generateEnvironmentNamespace(
        "My_Team",
        "My/Project",
        "Feature.Branch",
      );

      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(isValidNamespaceName(result)).toBe(true);
    });

    it("should match spec example", () => {
      // From spec: Team: my-super-long-team-name (23), Project: my-super-long-project-name (26), Env: feature-very-long-branch-name (29)
      // Total: 80 chars (exceeds 63)
      const result = generateEnvironmentNamespace(
        "my-super-long-team-name",
        "my-super-long-project-name",
        "feature-very-long-branch-name",
      );

      expect(result.length).toBe(63);
      expect(result.startsWith("my-super-long-team-name-my-super-long-project-name-")).toBe(
        true,
      );
      // Should end with hash
      expect(result).toMatch(/-[a-f0-9]{5}$/);
    });
  });

  describe("isValidNamespaceName", () => {
    it("should validate correct namespace names", () => {
      expect(isValidNamespaceName("my-team")).toBe(true);
      expect(isValidNamespaceName("my-team-project")).toBe(true);
      expect(isValidNamespaceName("abc-123")).toBe(true);
      expect(isValidNamespaceName("a")).toBe(true);
    });

    it("should reject empty names", () => {
      expect(isValidNamespaceName("")).toBe(false);
    });

    it("should reject names over 63 characters", () => {
      expect(isValidNamespaceName("a".repeat(64))).toBe(false);
    });

    it("should reject names with uppercase", () => {
      expect(isValidNamespaceName("MyTeam")).toBe(false);
    });

    it("should reject names with invalid characters", () => {
      expect(isValidNamespaceName("my_team")).toBe(false);
      expect(isValidNamespaceName("my.team")).toBe(false);
      expect(isValidNamespaceName("my/team")).toBe(false);
    });

    it("should reject names starting with hyphen", () => {
      expect(isValidNamespaceName("-myteam")).toBe(false);
    });

    it("should reject names ending with hyphen", () => {
      expect(isValidNamespaceName("myteam-")).toBe(false);
    });

    it("should accept names with hyphens in middle", () => {
      expect(isValidNamespaceName("my-team-name")).toBe(true);
    });
  });

  describe("extractNamespaceHierarchy", () => {
    it("should extract hierarchy from labels", () => {
      const labels = {
        "catalyst.dev/team": "my-team",
        "catalyst.dev/project": "my-project",
        "catalyst.dev/environment": "dev",
      };

      const result = extractNamespaceHierarchy(labels);
      expect(result).toEqual({
        team: "my-team",
        project: "my-project",
        environment: "dev",
      });
    });

    it("should return null for undefined labels", () => {
      expect(extractNamespaceHierarchy(undefined)).toBeNull();
    });

    it("should return null for incomplete labels", () => {
      expect(
        extractNamespaceHierarchy({
          "catalyst.dev/team": "my-team",
        }),
      ).toBeNull();

      expect(
        extractNamespaceHierarchy({
          "catalyst.dev/team": "my-team",
          "catalyst.dev/project": "my-project",
        }),
      ).toBeNull();
    });

    it("should ignore extra labels", () => {
      const labels = {
        "catalyst.dev/team": "my-team",
        "catalyst.dev/project": "my-project",
        "catalyst.dev/environment": "dev",
        "app.kubernetes.io/name": "my-app",
        "extra-label": "value",
      };

      const result = extractNamespaceHierarchy(labels);
      expect(result).toEqual({
        team: "my-team",
        project: "my-project",
        environment: "dev",
      });
    });
  });

  describe("FR-ENV-021 specification compliance", () => {
    it("should never exceed 63 characters", () => {
      const testCases = [
        ["team", "project", "env"],
        ["a".repeat(30), "b".repeat(30), "c".repeat(30)],
        ["very-long-team-name", "very-long-project-name", "very-long-env-name"],
        [
          "my-super-long-team-name",
          "my-super-long-project-name",
          "feature-very-long-branch-name",
        ],
      ];

      testCases.forEach((components) => {
        const result = generateNamespaceWithHash(components);
        expect(result.length).toBeLessThanOrEqual(63);
      });
    });

    it("should use hash when length exceeds 63", () => {
      const result = generateNamespaceWithHash([
        "long-team-name-that-is-quite-lengthy",
        "long-project-name-that-is-also-quite-lengthy",
        "long-environment-name",
      ]);

      // If truncated, should have hash suffix
      if (result.length === 63) {
        expect(result).toMatch(/-[a-f0-9]{5}$/);
      }
    });

    it("should maintain uniqueness with hashing", () => {
      // Create two similar but different long names
      const result1 = generateNamespaceWithHash([
        "my-super-long-team-name",
        "my-super-long-project-name",
        "feature-branch-name-1",
      ]);

      const result2 = generateNamespaceWithHash([
        "my-super-long-team-name",
        "my-super-long-project-name",
        "feature-branch-name-2",
      ]);

      expect(result1).not.toBe(result2);
      expect(result1.length).toBeLessThanOrEqual(63);
      expect(result2.length).toBeLessThanOrEqual(63);
    });
  });
});
