import { Factory, faker } from "@/lib/factories";
import { EnvironmentCR, EnvironmentType } from "@/types/crd";

/**
 * Transient params for EnvironmentCRFactory
 * These are used to control factory behavior without being part of the final object
 */
interface EnvironmentCRTransientParams {
  envType?: EnvironmentType;
  branch?: string;
  prNumber?: number;
}

/**
 * Factory for generating EnvironmentCR (Kubernetes Custom Resource) mock data
 *
 * Note: This is for the Kubernetes CR, NOT the database projectEnvironments table.
 * EnvironmentCR is used by the operator to manage preview environments.
 *
 * Usage:
 *   const env = environmentCRFactory.build();
 *   const readyEnv = environmentCRFactory.ready().build();
 *   const previewEnv = environmentCRFactory.preview().ready().build();
 */
class EnvironmentCRFactory extends Factory<
  EnvironmentCR,
  EnvironmentCRTransientParams
> {
  // State traits
  pending() {
    return this.params({
      status: {
        phase: "Pending",
        conditions: [{ type: "Ready", status: "False" }],
      },
    });
  }

  provisioning() {
    return this.params({
      status: {
        phase: "Provisioning",
        conditions: [
          { type: "Ready", status: "False" },
          { type: "BuildStarted", status: "True" },
        ],
      },
    });
  }

  deploying() {
    return this.params({
      status: {
        phase: "Deploying",
        conditions: [
          { type: "BuildComplete", status: "True" },
          { type: "DeploymentStarted", status: "True" },
        ],
      },
    });
  }

  ready() {
    const baseUrl = faker.internet.url({ protocol: "https" });
    return this.params({
      status: {
        phase: "Ready",
        url: baseUrl,
        conditions: [
          { type: "Ready", status: "True" },
          { type: "BuildComplete", status: "True" },
          { type: "DeploymentReady", status: "True" },
        ],
      },
    });
  }

  failed() {
    return this.params({
      status: {
        phase: "Failed",
        conditions: [
          { type: "Ready", status: "False" },
          { type: "BuildFailed", status: "True" },
        ],
      },
    });
  }

  // Environment type traits (use transient params to override type)
  deployment() {
    return this.transient({ envType: "deployment" as const });
  }

  development() {
    return this.transient({ envType: "development" as const });
  }

  // Convenience method for PR-based environments
  withPullRequest(prNumber: number) {
    const branch = `pr-${prNumber}-${faker.git.branch()}`;
    return this.transient({ prNumber, branch });
  }

  // Convenience method for branch-based environments
  withBranch(branch: string) {
    return this.transient({ branch });
  }
}

export const environmentCRFactory = EnvironmentCRFactory.define(
  ({ sequence, transientParams }) => {
    const projectName = faker.word.noun().toLowerCase();
    const commitSha = faker.git.commitSha();
    const defaultBranch = faker.git.branch();
    const defaultEnvType: EnvironmentType = faker.helpers.arrayElement([
      "deployment",
      "development",
    ]);

    // Use transient params if provided, otherwise use defaults
    const envType = transientParams.envType || defaultEnvType;
    const branch = transientParams.branch || defaultBranch;
    const prNumber = transientParams.prNumber;

    // Generate realistic environment name
    const envName =
      envType === "deployment"
        ? `${projectName}-${faker.helpers.arrayElement(["prod", "staging"])}`
        : `${projectName}-${branch.replace(/[^a-z0-9-]/g, "-").toLowerCase()}-${sequence}`;

    return {
      metadata: {
        name: envName,
        namespace: "default",
        creationTimestamp: faker.date.recent({ days: 7 }).toISOString(),
      },
      spec: {
        projectRef: {
          name: projectName,
        },
        type: envType,
        source: {
          commitSha,
          branch,
          prNumber:
            prNumber !== undefined
              ? prNumber
              : envType === "development"
                ? faker.number.int({ min: 1, max: 999 })
                : undefined,
        },
        config: {
          envVars: [
            {
              name: "NODE_ENV",
              value: envType === "deployment" ? "production" : "development",
            },
            { name: "API_URL", value: faker.internet.url() },
            {
              name: "LOG_LEVEL",
              value: faker.helpers.arrayElement([
                "debug",
                "info",
                "warn",
                "error",
              ]),
            },
          ],
        },
      },
      status: {
        phase: "Ready",
        url: `https://${envName}.preview.${faker.internet.domainName()}`,
        conditions: [
          { type: "Ready", status: "True" },
          { type: "DeploymentReady", status: "True" },
        ],
      },
    };
  },
);
