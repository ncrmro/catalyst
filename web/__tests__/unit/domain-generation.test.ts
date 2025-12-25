/**
 * Unit tests for domain generation and preview environment utilities
 */

import {
  generateNamespace,
  generatePublicUrl,
  generateImageTag,
} from "@/models/preview-environments";

describe("Preview Environment Domain Generation", () => {
  describe("generateNamespace", () => {
    it("should generate DNS-safe namespace for PR", () => {
      const namespace = generateNamespace("my-app", 123);
      expect(namespace).toBe("pr-my-app-123");
    });

    it("should handle repo with owner prefix", () => {
      const namespace = generateNamespace("owner/my-app", 456);
      expect(namespace).toBe("pr-my-app-456");
    });

    it("should sanitize special characters", () => {
      const namespace = generateNamespace("My_Special.App!", 789);
      expect(namespace).toBe("pr-my-special-app-789");
    });

    it("should truncate long names to 63 characters (DNS limit)", () => {
      const longName = "a".repeat(100);
      const namespace = generateNamespace(longName, 999);
      expect(namespace.length).toBeLessThanOrEqual(63);
      expect(namespace).toMatch(/^pr-.*-999$/);
    });

    it("should handle names with multiple hyphens", () => {
      const namespace = generateNamespace("my---special---app", 111);
      expect(namespace).toBe("pr-my-special-app-111");
    });
  });

  describe("generatePublicUrl", () => {
    const originalEnv = process.env.DEFAULT_PREVIEW_DOMAIN;

    afterEach(() => {
      if (originalEnv) {
        process.env.DEFAULT_PREVIEW_DOMAIN = originalEnv;
      } else {
        delete process.env.DEFAULT_PREVIEW_DOMAIN;
      }
    });

    it("should use default domain from environment", () => {
      process.env.DEFAULT_PREVIEW_DOMAIN = "preview.example.com";
      const url = generatePublicUrl("env-preview-123");
      expect(url).toBe("https://env-preview-123.preview.example.com");
    });

    it("should use custom domain when provided", () => {
      const url = generatePublicUrl(
        "env-preview-456",
        "custom.previews.com",
      );
      expect(url).toBe("https://env-preview-456.custom.previews.com");
    });

    it("should fallback to localhost when env not set", () => {
      delete process.env.DEFAULT_PREVIEW_DOMAIN;
      const url = generatePublicUrl("env-preview-789");
      expect(url).toBe("https://env-preview-789.preview.localhost");
    });

    it("should prioritize custom domain over environment", () => {
      process.env.DEFAULT_PREVIEW_DOMAIN = "default.example.com";
      const url = generatePublicUrl("env-preview-999", "override.example.com");
      expect(url).toBe("https://env-preview-999.override.example.com");
    });
  });

  describe("generateImageTag", () => {
    it("should generate image tag with short SHA", () => {
      const tag = generateImageTag(
        "owner/repo",
        123,
        "abcdef1234567890abcdef1234567890abcdef12",
      );
      expect(tag).toBe("owner-repo-pr-123-abcdef1");
    });

    it("should sanitize repo name for tag", () => {
      const tag = generateImageTag(
        "MyOrg/My.Special-Repo",
        456,
        "1234567890abcdef1234567890abcdef12345678",
      );
      expect(tag).toMatch(/^myorg-my-special-repo-pr-456-1234567$/);
    });

    it("should handle short SHA gracefully", () => {
      const tag = generateImageTag("owner/repo", 789, "abc123");
      expect(tag).toBe("owner-repo-pr-789-abc123");
    });
  });
});

describe("Domain Configuration Integration", () => {
  describe("Custom domain behavior", () => {
    it("should support project-specific custom domains", () => {
      // This would be tested in integration tests with actual database
      // Unit test just validates the URL generation
      const customDomain = "previews.acme-corp.com";
      const namespace = generateNamespace("acme-app", 42);
      const url = generatePublicUrl(namespace, customDomain);

      expect(url).toBe("https://pr-acme-app-42.previews.acme-corp.com");
    });

    it("should handle subdomain nesting correctly", () => {
      const url = generatePublicUrl("env-preview-123", "dev.preview.example.com");
      expect(url).toBe("https://env-preview-123.dev.preview.example.com");
    });
  });
});
