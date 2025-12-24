/**
 * Central export point for all test factories.
 *
 * Import factories from here in your tests:
 * @example
 * ```typescript
 * import { userFactory, teamFactory, projectFactory } from '../factories';
 *
 * const user = await userFactory.create();
 * const team = await teamFactory.create({ ownerId: user.id });
 * const project = await projectFactory.create({ teamId: team.id });
 * ```
 */
// Database model factories
export { userFactory } from "./user.factory";
export { teamFactory } from "./team.factory";
export { projectFactory } from "./project.factory";
export { repoFactory } from "./repo.factory";
export { projectRepoFactory } from "./project-repo.factory";
export { pullRequestFactory } from "./pull-request.factory";
export { reportFactory } from "./report.factory";
export { environmentFactory } from "./environment.factory";
export { projectManifestFactory } from "./project-manifest.factory";

// Kubernetes Custom Resource factories
export { environmentCRFactory } from "./environment-cr.factory";

// Component/UI data factories (for stories and component tests)
export { agentRunFactory } from "./agent-run.factory";
export type { AgentRun } from "./agent-run.factory";
export { containerFactory } from "./container.factory";
export type { Container } from "./container.factory";
