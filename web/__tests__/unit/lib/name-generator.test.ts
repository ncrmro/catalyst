/**
 * Tests for Memorable Name Generator
 */

import { describe, it, expect, vi } from "vitest";
import {
  generateNameUnchecked,
  generateUniqueName,
  createNameGeneratorFactory,
  nameGenerator,
  type NameExistsCheck,
} from "@/lib/name-generator";

describe("Name Generator", () => {
  describe("generateNameUnchecked", () => {
    it("should generate a name with default format", () => {
      const result = generateNameUnchecked();

      expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
      expect(result.adjective).toBeTruthy();
      expect(result.noun).toBeTruthy();
      expect(result.number).toBeGreaterThanOrEqual(10);
      expect(result.number).toBeLessThan(100);
    });

    it("should use custom separator", () => {
      const result = generateNameUnchecked({ separator: "_" });

      expect(result.name).toMatch(/^[a-z]+_[a-z]+_\d{2}$/);
    });

    it("should use custom number range", () => {
      const result = generateNameUnchecked({
        minNumber: 1,
        maxNumber: 10,
      });

      expect(result.number).toBeGreaterThanOrEqual(1);
      expect(result.number).toBeLessThan(10);
    });

    it("should generate different names on multiple calls", () => {
      const names = new Set<string>();

      // Generate 100 names - should have high diversity
      for (let i = 0; i < 100; i++) {
        const result = generateNameUnchecked();
        names.add(result.name);
      }

      // With ~100 adjectives × ~100 nouns × 90 numbers = 900,000 combinations,
      // we expect very few collisions in 100 attempts
      expect(names.size).toBeGreaterThan(90);
    });
  });

  describe("generateUniqueName", () => {
    it("should generate unique name when no collisions", async () => {
      const existsCheck: NameExistsCheck = async () => false;

      const result = await generateUniqueName(existsCheck);

      expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
      expect(result.retries).toBe(0);
    });

    it("should retry on collision and succeed", async () => {
      let callCount = 0;
      const existsCheck: NameExistsCheck = async (name: string) => {
        callCount++;
        // First 2 calls return true (collision), 3rd returns false (success)
        return callCount <= 2;
      };

      const result = await generateUniqueName(existsCheck);

      expect(result.retries).toBe(2);
      expect(callCount).toBe(3);
      expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    });

    it("should use fallback after max retries", async () => {
      const existsCheck: NameExistsCheck = async () => true; // Always collision

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await generateUniqueName(existsCheck, { maxRetries: 3 });

      expect(result.name).toMatch(/^fallback-[a-f0-9]{8}$/);
      expect(result.retries).toBe(3);
      expect(result.adjective).toBe("fallback");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate unique name"),
      );

      consoleWarnSpy.mockRestore();
    });

    it("should respect custom maxRetries config", async () => {
      let callCount = 0;
      const existsCheck: NameExistsCheck = async () => {
        callCount++;
        return true; // Always collision
      };

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await generateUniqueName(existsCheck, { maxRetries: 2 });

      expect(callCount).toBe(2);

      consoleWarnSpy.mockRestore();
    });
  });

  describe("createNameGeneratorFactory", () => {
    it("should create factory with default config", () => {
      const factory = createNameGeneratorFactory({
        minNumber: 1,
        maxNumber: 1000,
      });

      const result = factory.generateUnchecked();

      expect(result.number).toBeGreaterThanOrEqual(1);
      expect(result.number).toBeLessThan(1000);
    });

    it("should allow config override", () => {
      const factory = createNameGeneratorFactory({
        minNumber: 1,
        maxNumber: 10,
      });

      const result = factory.generateUnchecked({
        minNumber: 100,
        maxNumber: 200,
      });

      expect(result.number).toBeGreaterThanOrEqual(100);
      expect(result.number).toBeLessThan(200);
    });

    it("should expose config", () => {
      const factory = createNameGeneratorFactory({
        maxRetries: 10,
        separator: "_",
      });

      const config = factory.getConfig();

      expect(config.maxRetries).toBe(10);
      expect(config.separator).toBe("_");
    });

    it("should support async unique generation", async () => {
      const factory = createNameGeneratorFactory();
      const existsCheck: NameExistsCheck = async () => false;

      const result = await factory.generateUnique(existsCheck);

      expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
      expect(result.retries).toBe(0);
    });
  });

  describe("default nameGenerator", () => {
    it("should be pre-configured", () => {
      const config = nameGenerator.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.minNumber).toBe(10);
      expect(config.maxNumber).toBe(100);
      expect(config.separator).toBe("-");
    });

    it("should generate valid names", () => {
      const result = nameGenerator.generateUnchecked();

      expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    });
  });

  describe("DNS-1123 compliance", () => {
    it("should generate names that are DNS-1123 compliant", () => {
      // DNS-1123 rules:
      // - lowercase alphanumeric and hyphens only
      // - cannot start or end with hyphen
      // - max 63 characters

      for (let i = 0; i < 50; i++) {
        const result = generateNameUnchecked();

        // Check format
        expect(result.name).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);

        // Check length
        expect(result.name.length).toBeLessThanOrEqual(63);

        // Check no consecutive hyphens
        expect(result.name).not.toContain("--");
      }
    });
  });

  describe("Integration scenario", () => {
    it("should work like real database collision check", async () => {
      // Simulate database with existing names
      const existingNames = new Set([
        "purple-elephant-42",
        "swift-river-73",
        "calm-ocean-15",
      ]);

      const checkExists: NameExistsCheck = async (name: string) => {
        return existingNames.has(name);
      };

      // Generate names until we get a unique one
      const results: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await generateUniqueName(checkExists);
        results.push(result.name);

        // Add to "database"
        existingNames.add(result.name);
      }

      // All generated names should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);

      // None should be in the original set
      for (const name of results) {
        expect([
          "purple-elephant-42",
          "swift-river-73",
          "calm-ocean-15",
        ]).not.toContain(name);
      }
    });
  });
});
