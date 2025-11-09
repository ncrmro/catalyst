/**
 * Unit tests for preview environments models layer
 *
 * Tests helper functions for preview environment deployment:
 * - generateNamespace: Create DNS-1123 compliant namespace names
 * - generatePublicUrl: Construct public URLs for preview environments
 */

import { describe, it, expect } from "vitest";
import {
  generateNamespace,
  generatePublicUrl,
} from "@/models/preview-environments";

describe("generateNamespace", () => {
  it("should generate DNS-1123 compliant namespace from repo and PR number", () => {
    const namespace = generateNamespace("my-repo", 123);
    expect(namespace).toBe("pr-my-repo-123");
  });

  it("should convert uppercase to lowercase", () => {
    const namespace = generateNamespace("My-Repo", 456);
    expect(namespace).toBe("pr-my-repo-456");
  });

  it("should replace underscores with hyphens", () => {
    const namespace = generateNamespace("my_repo_name", 789);
    expect(namespace).toBe("pr-my-repo-name-789");
  });

  it("should remove non-alphanumeric characters except hyphens", () => {
    const namespace = generateNamespace("my@repo#name!", 100);
    expect(namespace).toBe("pr-myreponame-100");
  });

  it("should handle repo names with slashes (owner/repo format)", () => {
    const namespace = generateNamespace("owner/repo-name", 200);
    expect(namespace).toBe("pr-ownerrepo-name-200");
  });

  it("should truncate to 63 characters (DNS-1123 limit)", () => {
    const longName = "a".repeat(100);
    const namespace = generateNamespace(longName, 999);
    expect(namespace.length).toBeLessThanOrEqual(63);
    expect(namespace).toMatch(/^pr-a+-999$/);
  });

  it("should not start or end with hyphens", () => {
    const namespace = generateNamespace("-my-repo-", 300);
    expect(namespace).toMatch(/^[a-z0-9]/);
    expect(namespace).toMatch(/[a-z0-9]$/);
  });
});

describe("generatePublicUrl", () => {
  it("should generate URL with namespace and domain", () => {
    const url = generatePublicUrl("pr-my-repo-123", "preview.example.com");
    expect(url).toBe("https://pr-my-repo-123.preview.example.com");
  });

  it("should handle custom domains", () => {
    const url = generatePublicUrl("pr-test-456", "apps.cluster.local");
    expect(url).toBe("https://pr-test-456.apps.cluster.local");
  });

  it("should use default domain if not provided", () => {
    const url = generatePublicUrl("pr-my-repo-789");
    expect(url).toMatch(/^https:\/\/pr-my-repo-789\./);
  });
});
