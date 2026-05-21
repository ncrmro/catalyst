/**
 * Usage Job Tests
 *
 * Tests for daily usage recording and Stripe reporting logic.
 * Spec 012 §9.1: Management fee model — per resource, per cluster, per node
 * Spec 012 §9.2: Metering — at least hourly granularity, includes resource type/quantity/duration
 * Spec 012 §9.3: Billing integration — MUST integrate with existing billing system (spec 011)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PgDatabase } from "drizzle-orm/pg-core";

// Mock the Stripe module
vi.mock("@catalyst/billing/src/stripe", () => ({
  recordUsageMeterEvent: vi.fn(),
}));

// Mock the models module
vi.mock("@catalyst/billing/src/models", () => ({
  isTeamOnPaidPlan: vi.fn(),
  getStripeCustomerByTeamId: vi.fn(),
  recordDailyUsage: vi.fn(),
  markUsageReported: vi.fn(),
}));

// Mock database schema imports
vi.mock("@/db/schema", () => ({
  projects: {
    id: "id",
    teamId: "teamId",
  },
  projectEnvironments: {
    id: "id",
    environment: "environment",
    projectId: "projectId",
  },
  stripeSubscriptions: {
    teamId: "teamId",
    status: "status",
  },
  usageRecords: {
    id: "id",
    teamId: "teamId",
    usageDate: "usageDate",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  relations: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));

import {
  countTeamEnvironments,
  recordTeamUsage,
  runDailyUsageJob,
} from "@catalyst/billing/src/usage-job";
import { recordUsageMeterEvent } from "@catalyst/billing/src/stripe";
import {
  isTeamOnPaidPlan,
  getStripeCustomerByTeamId,
  recordDailyUsage,
  markUsageReported,
} from "@catalyst/billing/src/models";

describe("countTeamEnvironments", () => {
  let mockDb: PgDatabase<any, any, any>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database with query builder
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    } as any;
  });

  it("should count environments for a team", async () => {
    // Mock database query to return 5 environments
    const mockEnvironments = [
      { id: "env1", environment: "production" },
      { id: "env2", environment: "staging" },
      { id: "env3", environment: "development" },
      { id: "env4", environment: "preview-pr-1" },
      { id: "env5", environment: "preview-pr-2" },
    ];

    mockDb.where = vi.fn().mockResolvedValue(mockEnvironments);

    const mockSchema = {
      projects: { id: "id", teamId: "teamId" },
      projectEnvironments: { id: "id", environment: "environment", projectId: "projectId" },
    };

    const result = await countTeamEnvironments(mockDb, "team-123", mockSchema);

    expect(result.activeCount).toBe(5);
    expect(result.spundownCount).toBe(0);
  });

  it("should return zero counts for team with no environments", async () => {
    mockDb.where = vi.fn().mockResolvedValue([]);

    const mockSchema = {
      projects: { id: "id", teamId: "teamId" },
      projectEnvironments: { id: "id", environment: "environment", projectId: "projectId" },
    };

    const result = await countTeamEnvironments(mockDb, "team-empty", mockSchema);

    expect(result.activeCount).toBe(0);
    expect(result.spundownCount).toBe(0);
  });
});

describe("recordTeamUsage", () => {
  let mockDb: PgDatabase<any, any, any>;
  const testDate = new Date("2024-01-15T00:00:00Z");
  const mockSchema = {
    projects: { id: "id", teamId: "teamId" },
    projectEnvironments: { id: "id", environment: "environment", projectId: "projectId" },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    } as any;
  });

  // Spec 012 §9.3: Free-tier teams should not generate billing events
  it("should skip recording for free tier teams", async () => {
    vi.mocked(isTeamOnPaidPlan).mockResolvedValue(false);

    const result = await recordTeamUsage(mockDb, "team-free", testDate, mockSchema);

    expect(result.success).toBe(true);
    expect(result.reportedToStripe).toBe(false);
    expect(recordDailyUsage).not.toHaveBeenCalled();
  });

  // Spec 012 §9.2: Usage records MUST include resource type, quantity, duration
  it("should record usage for paid teams", async () => {
    // Setup mocks
    vi.mocked(isTeamOnPaidPlan).mockResolvedValue(true);

    // Mock environment counting
    mockDb.where = vi.fn().mockResolvedValue([
      { id: "env1", environment: "production" },
      { id: "env2", environment: "staging" },
      { id: "env3", environment: "preview-pr-1" },
    ]);

    // Mock usage record creation
    const mockUsageRecord = {
      id: "usage-1",
      teamId: "team-paid",
      usageDate: testDate,
      activeEnvironmentCount: 3,
      spundownEnvironmentCount: 0,
      billableActiveCount: 0, // 3 - 3 (free tier) = 0
      billableSpundownCount: 0,
      reportedToStripe: false,
    };
    vi.mocked(recordDailyUsage).mockResolvedValue(mockUsageRecord as any);

    const result = await recordTeamUsage(mockDb, "team-paid", testDate, mockSchema);

    expect(result.success).toBe(true);
    expect(result.reportedToStripe).toBe(false); // No billable usage
    expect(recordDailyUsage).toHaveBeenCalledWith(
      mockDb,
      "team-paid",
      testDate,
      {
        activeCount: 3,
        spundownCount: 0,
      },
    );
  });

  // Spec 012 §9.3: MUST integrate with existing billing system — Stripe meter events
  it("should report to Stripe when there is billable usage", async () => {
    // Setup mocks
    vi.mocked(isTeamOnPaidPlan).mockResolvedValue(true);

    // Mock environment counting (5 environments = 2 billable after free tier)
    mockDb.where = vi.fn().mockResolvedValue([
      { id: "env1", environment: "production" },
      { id: "env2", environment: "staging" },
      { id: "env3", environment: "preview-pr-1" },
      { id: "env4", environment: "preview-pr-2" },
      { id: "env5", environment: "preview-pr-3" },
    ]);

    // Mock usage record with billable usage
    const mockUsageRecord = {
      id: "usage-2",
      teamId: "team-paid",
      usageDate: testDate,
      activeEnvironmentCount: 5,
      spundownEnvironmentCount: 0,
      billableActiveCount: 2, // 5 - 3 (free tier) = 2
      billableSpundownCount: 0,
      reportedToStripe: false,
    };
    vi.mocked(recordDailyUsage).mockResolvedValue(mockUsageRecord as any);

    // Mock customer lookup
    vi.mocked(getStripeCustomerByTeamId).mockResolvedValue({
      id: "cust-1",
      teamId: "team-paid",
      stripeCustomerId: "cus_stripe123",
      email: "team@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await recordTeamUsage(mockDb, "team-paid", testDate, mockSchema, {
      reportToStripe: true,
    });

    expect(result.success).toBe(true);
    expect(result.reportedToStripe).toBe(true);

    // Verify Stripe meter event was sent
    expect(recordUsageMeterEvent).toHaveBeenCalledWith({
      customerId: "cus_stripe123",
      eventName: "active_env_day",
      value: 2,
      timestamp: Math.floor(testDate.getTime() / 1000),
      idempotencyKey: "usage-team-paid-2024-01-15-active",
    });

    // Verify usage was marked as reported
    expect(markUsageReported).toHaveBeenCalledWith(mockDb, "usage-2");
  });

  it("should not report to Stripe in dry run mode", async () => {
    // Setup mocks
    vi.mocked(isTeamOnPaidPlan).mockResolvedValue(true);

    mockDb.where = vi.fn().mockResolvedValue([
      { id: "env1", environment: "production" },
      { id: "env2", environment: "staging" },
      { id: "env3", environment: "preview-pr-1" },
      { id: "env4", environment: "preview-pr-2" },
      { id: "env5", environment: "preview-pr-3" },
    ]);

    const mockUsageRecord = {
      id: "usage-3",
      teamId: "team-paid",
      usageDate: testDate,
      activeEnvironmentCount: 5,
      spundownEnvironmentCount: 0,
      billableActiveCount: 2,
      billableSpundownCount: 0,
      reportedToStripe: false,
    };
    vi.mocked(recordDailyUsage).mockResolvedValue(mockUsageRecord as any);

    const result = await recordTeamUsage(mockDb, "team-paid", testDate, mockSchema, {
      reportToStripe: false,
    });

    expect(result.success).toBe(true);
    expect(result.reportedToStripe).toBe(false);
    expect(recordUsageMeterEvent).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(isTeamOnPaidPlan).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const result = await recordTeamUsage(mockDb, "team-error", testDate, mockSchema);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Database connection failed");
  });
});

describe("runDailyUsageJob", () => {
  let mockDb: PgDatabase<any, any, any>;
  const mockSchema = {
    projects: { id: "id", teamId: "teamId" },
    projectEnvironments: { id: "id", environment: "environment", projectId: "projectId" },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    } as any;
  });

  it("should process all teams with active subscriptions", async () => {
    // Mock subscription query to return 3 teams
    mockDb.where = vi
      .fn()
      .mockResolvedValueOnce([
        { teamId: "team-1" },
        { teamId: "team-2" },
        { teamId: "team-3" },
      ])
      .mockResolvedValue([]); // For environment counting

    // Mock all teams as paid
    vi.mocked(isTeamOnPaidPlan).mockResolvedValue(true);

    // Mock usage records
    vi.mocked(recordDailyUsage).mockResolvedValue({
      id: "usage-1",
      teamId: "team-1",
      billableActiveCount: 0,
      billableSpundownCount: 0,
    } as any);

    const testDate = new Date("2024-01-15");
    const result = await runDailyUsageJob(mockDb, mockSchema, { date: testDate });

    expect(result.totalTeams).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
  });

  it("should normalize date to midnight UTC", async () => {
    mockDb.where = vi.fn().mockResolvedValue([]);

    const inputDate = new Date("2024-01-15T14:30:00Z");
    const result = await runDailyUsageJob(mockDb, mockSchema, { date: inputDate });

    // Result date should be normalized to midnight
    expect(result.date.getUTCHours()).toBe(0);
    expect(result.date.getUTCMinutes()).toBe(0);
    expect(result.date.getUTCSeconds()).toBe(0);
  });

  it("should default to yesterday when no date provided", async () => {
    mockDb.where = vi.fn().mockResolvedValue([]);

    const result = await runDailyUsageJob(mockDb, mockSchema);

    // Date should be yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(result.date.getUTCDate()).toBe(yesterday.getUTCDate());
  });

  // Spec 012 §9.2: Metering MUST be reliable — individual team failures should not halt the job
  it("should continue processing after individual team failures", async () => {
    // Mock 3 teams
    mockDb.where = vi
      .fn()
      .mockResolvedValueOnce([
        { teamId: "team-1" },
        { teamId: "team-2" },
        { teamId: "team-3" },
      ])
      .mockResolvedValue([]);

    // Team 2 will fail
    vi.mocked(isTeamOnPaidPlan)
      .mockResolvedValueOnce(true) // team-1 succeeds
      .mockRejectedValueOnce(new Error("Team 2 error")) // team-2 fails
      .mockResolvedValueOnce(true); // team-3 succeeds

    vi.mocked(recordDailyUsage).mockResolvedValue({
      id: "usage-1",
      billableActiveCount: 0,
      billableSpundownCount: 0,
    } as any);

    const result = await runDailyUsageJob(mockDb, mockSchema);

    expect(result.totalTeams).toBe(3);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toBe("Team 2 error");
  });
});
