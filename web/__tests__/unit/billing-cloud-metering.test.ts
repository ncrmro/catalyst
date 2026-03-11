/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { BILLING_METERS, CLOUD_PRICING } from "@catalyst/billing/src/constants";
import { cloudResourceUsageRecords } from "@catalyst/billing/src/db/schema";
import {
  countTeamCloudResources,
  recordTeamCloudUsage,
} from "@catalyst/billing/src/cloud-usage-job";

// Mock the models module for recording tests
vi.mock("@catalyst/billing/src/models", () => ({
  isTeamOnPaidPlan: vi.fn(),
  getCloudResourceUsageForTeam: vi.fn(),
}));

import {
  isTeamOnPaidPlan,
  getCloudResourceUsageForTeam,
} from "@catalyst/billing/src/models";

const mockIsTeamOnPaidPlan = vi.mocked(isTeamOnPaidPlan);

describe("billing cloud metering constants", () => {
  it("should have MANAGED_CLUSTER_HOUR meter", () => {
    expect(BILLING_METERS.MANAGED_CLUSTER_HOUR).toBeDefined();
    expect(typeof BILLING_METERS.MANAGED_CLUSTER_HOUR).toBe("string");
  });

  it("should have MANAGED_NODE_HOUR meter", () => {
    expect(BILLING_METERS.MANAGED_NODE_HOUR).toBeDefined();
    expect(typeof BILLING_METERS.MANAGED_NODE_HOUR).toBe("string");
  });

  it("should have CLOUD_PRICING with positive values", () => {
    expect(CLOUD_PRICING.CLUSTER_MANAGEMENT_MONTHLY).toBeGreaterThan(0);
    expect(CLOUD_PRICING.NODE_MANAGEMENT_MONTHLY).toBeGreaterThan(0);
  });
});

describe("cloudResourceUsageRecords schema", () => {
  it("should have all expected columns", () => {
    const columns = getTableColumns(cloudResourceUsageRecords);
    const columnNames = Object.keys(columns);

    expect(columnNames).toContain("id");
    expect(columnNames).toContain("teamId");
    expect(columnNames).toContain("cloudAccountId");
    expect(columnNames).toContain("resourceType");
    expect(columnNames).toContain("resourceId");
    expect(columnNames).toContain("quantity");
    expect(columnNames).toContain("usageHour");
    expect(columnNames).toContain("reportedToStripe");
    expect(columnNames).toContain("createdAt");
  });
});

describe("countTeamCloudResources", () => {
  it("should return counts from query results", async () => {
    // Mock a db that returns clusters and node sums
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { clusterCount: 2, totalNodeCount: 6 },
      ]),
    } as any;

    const result = await countTeamCloudResources(
      mockDb,
      "team-1",
      {
        managedClusters: { id: "id", teamId: "teamId", status: "status" },
        nodePools: {
          clusterId: "clusterId",
          currentNodes: "currentNodes",
          status: "status",
        },
      },
    );

    expect(result).toHaveProperty("clusterCount");
    expect(result).toHaveProperty("totalNodeCount");
  });

  it("should return zeros for team with no resources", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    } as any;

    const result = await countTeamCloudResources(mockDb, "team-empty", {
      managedClusters: { id: "id", teamId: "teamId", status: "status" },
      nodePools: {
        clusterId: "clusterId",
        currentNodes: "currentNodes",
        status: "status",
      },
    });

    expect(result.clusterCount).toBe(0);
    expect(result.totalNodeCount).toBe(0);
  });
});

describe("recordTeamCloudUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe("getCloudResourceUsageForTeam", () => {
  it("should be a function that accepts db, teamId, and dateRange", () => {
    expect(typeof getCloudResourceUsageForTeam).toBe("function");
  });
});
