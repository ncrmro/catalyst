/**
 * Factory for creating test project manifest data.
 *
 * @example
 * ```typescript
 * // Build in-memory manifest
 * const manifest = projectManifestFactory.build();
 *
 * // Build with overrides
 * const customManifest = projectManifestFactory.build({
 *   path: 'package.json',
 *   projectId: 'project-123',
 *   repoId: 'repo-123',
 * });
 *
 * // Persist to database
 * const persistedManifest = await projectManifestFactory.create({
 *   projectId: 'project-id',
 *   repoId: 'repo-id',
 *   path: 'manifest.yaml',
 * });
 * ```
 */

import { Factory, faker } from "@/lib/factories";
import {
	createProjectManifests,
	type InsertManifest,
} from "@/models/project-manifests";

/**
 * Project manifest factory for generating test manifest data
 */
class ProjectManifestFactory extends Factory<InsertManifest> {
	/**
	 * Create and persist project manifest to database using model layer
	 */
	async create(params?: Partial<InsertManifest>) {
		const manifest = this.build(params);
		const [created] = await createProjectManifests(manifest);
		return created;
	}
}

export const projectManifestFactory = ProjectManifestFactory.define(() => ({
	projectId: "", // Must be provided when building
	repoId: "", // Must be provided when building
	path: faker.helpers.arrayElement([
		"package.json",
		"manifest.yaml",
		"catalyst.yaml",
		"deploy.config.json",
		".catalyst/config.yml",
		"docker-compose.yml",
	]),
}));
