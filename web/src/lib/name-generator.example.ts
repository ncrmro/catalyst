/**
 * Usage Examples for Name Generator
 *
 * This file demonstrates how to use the name generator in various scenarios.
 * These are examples only - not production code.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import {
	createNameGeneratorFactory,
	generateNameUnchecked,
	type NameExistsCheck,
	nameGenerator,
} from "./name-generator";

/**
 * Example 1: Simple unchecked name generation
 *
 * Use this when you don't need to check for collisions
 * (e.g., generating temporary names for testing)
 */
export function example1_SimpleGeneration() {
	const name = generateNameUnchecked();

	console.log("Generated name:", name.name);
	// Output: "purple-elephant-42"

	console.log("Parts:", {
		adjective: name.adjective, // "purple"
		noun: name.noun, // "elephant"
		number: name.number, // 42
	});
}

/**
 * Example 2: Unique name with database collision check
 *
 * Use this for production code where uniqueness is critical
 */
export async function example2_UniqueNameWithDB() {
	// Define collision check function
	const checkExists: NameExistsCheck = async (name: string) => {
		const existing = await db
			.select()
			.from(pullRequestPods)
			.where(eq(pullRequestPods.namespace, name))
			.limit(1);

		return existing.length > 0;
	};

	// Generate unique name
	const result = await nameGenerator.generateUnique(checkExists);

	console.log("Unique name:", result.name);
	console.log("Retries needed:", result.retries);

	return result.name;
}

/**
 * Example 3: Custom configuration
 *
 * Use this when you need different number ranges or separators
 */
export function example3_CustomConfig() {
	// Generate with custom number range (1-1000)
	const largeName = generateNameUnchecked({
		minNumber: 1,
		maxNumber: 1000,
	});

	console.log("Large range:", largeName.name);
	// Output: "swift-river-734"

	// Generate with underscore separator
	const underscoreName = generateNameUnchecked({
		separator: "_",
	});

	console.log("Underscore:", underscoreName.name);
	// Output: "calm_ocean_42"
}

/**
 * Example 4: Factory pattern with preset config
 *
 * Use this when you need to generate many names with the same configuration
 */
export function example4_FactoryPattern() {
	// Create factory with custom defaults
	const factory = createNameGeneratorFactory({
		minNumber: 100,
		maxNumber: 1000,
		maxRetries: 10,
	});

	// Generate multiple names with same config
	const names = [];
	for (let i = 0; i < 5; i++) {
		const name = factory.generateUnchecked();
		names.push(name.name);
	}

	console.log("Generated names:", names);
	// Output: ["bold-tiger-543", "quick-wolf-892", ...]
}

/**
 * Example 5: Production integration - Manual preview environment
 *
 * This shows how to integrate the name generator into the models layer
 * for creating manual (non-PR) preview environments.
 */
export async function example5_ManualPreviewEnvironment(params: {
	userId: string;
	repoId: string;
	branch?: string;
	imageUri: string;
}) {
	const { branch } = params;

	// Step 1: Generate namespace name
	let namespace: string;

	if (branch) {
		// Use branch name if provided
		namespace = `manual-${branch.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
	} else {
		// Auto-generate memorable name
		const checkExists: NameExistsCheck = async (name: string) => {
			const existing = await db
				.select()
				.from(pullRequestPods)
				.where(eq(pullRequestPods.namespace, name))
				.limit(1);

			return existing.length > 0;
		};

		const result = await nameGenerator.generateUnique(checkExists);
		namespace = result.name;

		console.log(`Auto-generated namespace: ${namespace}`);
		if (result.retries > 0) {
			console.log(`Required ${result.retries} retries for uniqueness`);
		}
	}

	// Step 2: Create preview environment record
	// (This is pseudocode - actual implementation would be in models layer)
	/*
  const pod = await db.insert(pullRequestPods).values({
    pullRequestId: null, // Manual environments don't have PRs
    namespace,
    deploymentName: `preview-${namespace}`,
    branch: branch || "main",
    commitSha: "manual-deployment", // Could be from git API
    imageTag: imageUri.split(":")[1] || "latest",
    status: "pending",
    source: "manual", // New field to differentiate
    createdBy: userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
  }).returning();
  */

	return {
		namespace,
		publicUrl: `https://${namespace}.preview.example.com`,
	};
}

/**
 * Example 6: Batch generation with uniqueness check
 *
 * Generate multiple unique names at once
 */
export async function example6_BatchGeneration(count: number = 10) {
	const existingNames = new Set<string>();

	const checkExists: NameExistsCheck = async (name: string) => {
		// Check in-memory set (fast) before database
		if (existingNames.has(name)) {
			return true;
		}

		// Check database
		const result = await db
			.select()
			.from(pullRequestPods)
			.where(eq(pullRequestPods.namespace, name))
			.limit(1);

		return result.length > 0;
	};

	const names: string[] = [];

	for (let i = 0; i < count; i++) {
		const result = await nameGenerator.generateUnique(checkExists);
		names.push(result.name);
		existingNames.add(result.name); // Remember for next iteration
	}

	return names;
}

/**
 * Example 7: Error handling and fallback
 *
 * Handle cases where unique name generation fails
 */
export async function example7_ErrorHandling() {
	const checkExists: NameExistsCheck = async (name: string) => {
		// Simulate database check
		const result = await db
			.select()
			.from(pullRequestPods)
			.where(eq(pullRequestPods.namespace, name))
			.limit(1);

		return result.length > 0;
	};

	try {
		const result = await nameGenerator.generateUnique(checkExists, {
			maxRetries: 3,
		});

		if (result.adjective === "fallback") {
			console.warn("Using fallback name - collision limit reached");
			// You might want to alert ops or try again later
		}

		return result.name;
	} catch (error) {
		console.error("Name generation failed:", error);
		// Fallback to timestamp-based name
		return `manual-${Date.now()}`;
	}
}
