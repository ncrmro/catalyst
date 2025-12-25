/**
 * Tests for Fixtures
 * 
 * Validates that fixtures are properly loaded and validated
 */

import { describe, it, expect } from "vitest";
import { ADJECTIVES, NOUNS, SYSTEM_NAMESPACES } from "@/fixtures";

describe("Fixtures", () => {
  describe("ADJECTIVES", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(ADJECTIVES)).toBe(true);
      expect(ADJECTIVES.length).toBeGreaterThan(0);
    });

    it("should contain expected adjectives", () => {
      expect(ADJECTIVES).toContain("purple");
      expect(ADJECTIVES).toContain("swift");
      expect(ADJECTIVES).toContain("ancient");
    });

    it("should only contain lowercase strings", () => {
      ADJECTIVES.forEach((adj) => {
        expect(typeof adj).toBe("string");
        expect(adj).toBe(adj.toLowerCase());
      });
    });

    it("should have at least 100 adjectives", () => {
      expect(ADJECTIVES.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe("NOUNS", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(NOUNS)).toBe(true);
      expect(NOUNS.length).toBeGreaterThan(0);
    });

    it("should contain expected nouns", () => {
      expect(NOUNS).toContain("elephant");
      expect(NOUNS).toContain("river");
      expect(NOUNS).toContain("mountain");
    });

    it("should only contain lowercase strings", () => {
      NOUNS.forEach((noun) => {
        expect(typeof noun).toBe("string");
        expect(noun).toBe(noun.toLowerCase());
      });
    });

    it("should have at least 100 nouns", () => {
      expect(NOUNS.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe("SYSTEM_NAMESPACES", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(SYSTEM_NAMESPACES)).toBe(true);
      expect(SYSTEM_NAMESPACES.length).toBeGreaterThan(0);
    });

    it("should contain expected system namespaces", () => {
      expect(SYSTEM_NAMESPACES).toContain("default");
      expect(SYSTEM_NAMESPACES).toContain("kube-system");
      expect(SYSTEM_NAMESPACES).toContain("catalyst-system");
    });

    it("should only contain valid kubernetes namespace names", () => {
      SYSTEM_NAMESPACES.forEach((ns) => {
        expect(typeof ns).toBe("string");
        // K8s namespace names must be lowercase alphanumeric with hyphens
        expect(ns).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it("should have exactly 5 system namespaces", () => {
      expect(SYSTEM_NAMESPACES.length).toBe(5);
    });
  });

  describe("Type Safety", () => {
    it("should provide readonly types", () => {
      // TypeScript compile-time check - these should not be modifiable
      // @ts-expect-error - Cannot assign to readonly array
      ADJECTIVES[0] = "test";
      
      // @ts-expect-error - Cannot push to readonly array
      ADJECTIVES.push("test");
    });
  });
});
