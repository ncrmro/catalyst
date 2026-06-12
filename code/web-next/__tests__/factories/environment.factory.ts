/**
 * Factory for creating test environment data.
 *
 * @example
 * ```typescript
 * // Build in-memory environment
 * const env = environmentFactory.build();
 *
 * // Build with overrides
 * const customEnv = environmentFactory.build({
 *   environment: 'staging',
 *   projectId: 'project-123',
 * });
 *
 * // Use traits
 * const preview = environmentFactory.preview().build();
 * const production = environmentFactory.production().build();
 * const staging = environmentFactory.staging().build();
 *
 * // Persist to database
 * const persistedEnv = await environmentFactory.create({
 *   projectId: 'project-id',
 *   repoId: 'repo-id',
 * });
 * ```
 */

import { Factory, faker } from "@/lib/factories";
import {
  createEnvironments,
  type InsertEnvironment,
} from "@/models/environments";

/**
 * Environment factory with trait methods for common environment types
 */
class EnvironmentFactory extends Factory<InsertEnvironment> {
  /**
   * Create a preview environment
   */
  preview() {
    return this.params({
      environment: "preview",
      latestDeployment: `preview-${faker.git.commitSha()}`,
    });
  }

  /**
   * Create a production environment
   */
  production() {
    return this.params({
      environment: "production",
      latestDeployment: `v${faker.system.semver()}`,
    });
  }

  /**
   * Create a staging environment
   */
  staging() {
    return this.params({
      environment: "staging",
      latestDeployment: `staging-${faker.git.commitSha()}`,
    });
  }

  /**
   * Create and persist environment to database using model layer
   */
  async create(params?: Partial<InsertEnvironment>) {
    const environment = this.build(params);
    const [created] = await createEnvironments(environment);
    return created;
  }
}

export const environmentFactory = EnvironmentFactory.define(() => ({
  projectId: "", // Must be provided when building
  repoId: "", // Must be provided when building
  environment: faker.helpers.arrayElement([
    "preview",
    "production",
    "staging",
    "development",
  ]),
  latestDeployment:
    faker.helpers.maybe(() => faker.git.commitSha(), { probability: 0.7 }) ??
    null,
}));
