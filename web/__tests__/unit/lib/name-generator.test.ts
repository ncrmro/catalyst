/**
 * Tests for Memorable Name Generator
 */

import { describe, expect, it, vi } from "vitest";
import {
	generateNameUnchecked,
	generateUniqueName,
	type NameExistsCheck,
} from "@/lib/name-generator";

describe("Name Generator", () => {
	it("generates DNS-1123 compliant names", () => {
		for (let i = 0; i < 10; i++) {
			const result = generateNameUnchecked();

			// Format: adjective-noun-XX
			expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
			expect(result.name.length).toBeLessThanOrEqual(63);
			expect(result.name).not.toContain("--");
		}
	});

	it("retries on collision and falls back after max retries", async () => {
		const alwaysExists: NameExistsCheck = async () => true;
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		const result = await generateUniqueName(alwaysExists, { maxRetries: 3 });

		expect(result.name).toMatch(/^fallback-[a-f0-9]{8}$/);
		expect(result.retries).toBe(3);

		consoleWarnSpy.mockRestore();
	});

	it("succeeds without retry when name is unique", async () => {
		const neverExists: NameExistsCheck = async () => false;

		const result = await generateUniqueName(neverExists);

		expect(result.name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
		expect(result.retries).toBe(0);
	});
});
