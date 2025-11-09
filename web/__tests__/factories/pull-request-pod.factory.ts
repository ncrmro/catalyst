import { Factory, faker } from "@/lib/factories";
import type { InsertPullRequestPod } from "@/types/preview-environments";

class PullRequestPodFactory extends Factory<InsertPullRequestPod> {
  /**
   * Trait: Pending deployment
   */
  pending() {
    return this.params({ status: "pending" });
  }

  /**
   * Trait: Currently deploying
   */
  deploying() {
    return this.params({ status: "deploying" });
  }

  /**
   * Trait: Successfully running
   */
  running() {
    return this.params({
      status: "running",
      publicUrl: `https://pr-${faker.number.int({ min: 1, max: 999 })}.preview.example.com`,
      lastDeployedAt: faker.date.recent(),
    });
  }

  /**
   * Trait: Failed deployment
   */
  failed() {
    return this.params({
      status: "failed",
      errorMessage: faker.lorem.sentence(),
    });
  }

  /**
   * Trait: Being deleted
   */
  deleting() {
    return this.params({ status: "deleting" });
  }

  /**
   * Create and persist pull request pod to database using model layer
   */
  async create(params?: Partial<InsertPullRequestPod>) {
    const pod = this.build(params);
    // Import model function dynamically to avoid circular dependencies
    const { createPreviewPods } = await import("@/models/preview-environments");
    const [created] = await createPreviewPods([pod]);
    return created;
  }
}

export const pullRequestPodFactory = PullRequestPodFactory.define(
  ({ sequence }) => ({
    // pullRequestId will need to be provided when building
    pullRequestId: "",
    commitSha: faker.git.commitSha(),
    namespace: `pr-test-${sequence}`,
    deploymentName: `test-deployment-${sequence}`,
    status: "pending" as const,
    branch: `feature/${faker.lorem.slug()}`,
    imageTag: `pr-${faker.number.int({ min: 1, max: 999 })}`,
    resourcesAllocated: {
      cpu: "500m",
      memory: "512Mi",
      pods: 1,
    },
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
  }),
);
