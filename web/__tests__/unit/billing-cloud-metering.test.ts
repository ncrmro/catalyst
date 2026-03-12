/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the models module for recording tests
vi.mock("@catalyst/billing/src/models", () => ({
  isTeamOnPaidPlan: vi.fn(),
}));

import { recordTeamCloudUsage } from "@catalyst/billing/src/cloud-usage-job";
import { isTeamOnPaidPlan } from "@catalyst/billing/src/models";

const mockIsTeamOnPaidPlan = vi.mocked(isTeamOnPaidPlan);

// Spec 012 §9.1: Management fee MUST be based on resources under management
// Spec 012 §9.2: Catalyst MUST meter resource usage per target account
describe("recordTeamCloudUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Spec 012 §9.3: Catalyst MUST integrate with the existing billing system (spec 011-billing)
  // Free-tier teams should not be billed for cloud resource management
  it("should skip free-tier teams", async () => {
    mockIsTeamOnPaidPlan.mockResolvedValue(false);

    const mockDb = {} as any;
    const result = await recordTeamCloudUsage(
      mockDb,
      "free-team",
      new Date(),
      {
        managedClusters: {} as any,
        nodePools: {} as any,
        cloudResourceUsageRecords: {} as any,
      },
    );

    expect(result.reportedToStripe).toBe(false);
  });
});
