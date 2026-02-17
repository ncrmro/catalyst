/**
 * Unit tests for billing limits logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FREE_TIER_LIMITS } from "../../src/constants";

// Mock schema objects
const mockProjectEnvironments = {
  projectId: "projectId",
  id: "id",
};

const mockProjects = {
  id: "id",
  teamId: "teamId",
};

// Mock isTeamOnPaidPlan function  
const { mockIsTeamOnPaidPlan } = vi.hoisted(() => {
  return {
    mockIsTeamOnPaidPlan: vi.fn(),
  };
});

// Mock the models module
vi.mock("../../src/models", () => ({
  isTeamOnPaidPlan: mockIsTeamOnPaidPlan,
}));

// Mock the schema module
vi.mock("../../src/db/schema", () => ({
  projectEnvironments: mockProjectEnvironments,
  projects: mockProjects,
}));

// Mock drizzle-orm functions
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  count: vi.fn(() => "count_fn"),
}));

// Import after mocks are set up
const { canCreateEnvironment, getTeamEnvironmentUsage } = await import("../../src/limits");

// Mock database
const createMockDb = () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  return mockDb as any;
};

describe("canCreateEnvironment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow paid teams to create environments regardless of count", async () => {
    const mockDb = createMockDb();
    const teamId = "team-paid-123";

    // Mock paid team
    mockIsTeamOnPaidPlan.mockResolvedValue(true);

    const result = await canCreateEnvironment(mockDb, teamId);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(mockIsTeamOnPaidPlan).toHaveBeenCalledWith(mockDb, teamId);
  });

  it("should allow free team under limit to create environments", async () => {
    const mockDb = createMockDb();
    const teamId = "team-free-under-limit";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);

    // Mock environment count under limit (2 out of 3)
    mockDb.where.mockResolvedValue([{ count: 2 }]);

    const result = await canCreateEnvironment(mockDb, teamId);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should block free team at limit from creating environments", async () => {
    const mockDb = createMockDb();
    const teamId = "team-free-at-limit";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);

    // Mock environment count at limit (3 out of 3)
    mockDb.where.mockResolvedValue([{ count: FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS }]);

    const result = await canCreateEnvironment(mockDb, teamId);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain("free tier limit");
    expect(result.reason).toContain(FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS.toString());
    expect(result.reason).toContain("Upgrade");
  });

  it("should block free team over limit from creating environments", async () => {
    const mockDb = createMockDb();
    const teamId = "team-free-over-limit";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);

    // Mock environment count over limit (4 out of 3)
    mockDb.where.mockResolvedValue([{ count: 4 }]);

    const result = await canCreateEnvironment(mockDb, teamId);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain("free tier limit");
  });

  it("should allow free team with zero environments", async () => {
    const mockDb = createMockDb();
    const teamId = "team-free-zero";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);

    // Mock zero environments
    mockDb.where.mockResolvedValue([{ count: 0 }]);

    const result = await canCreateEnvironment(mockDb, teamId);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should handle edge case where count query returns empty array", async () => {
    const mockDb = createMockDb();
    const teamId = "team-no-data";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);

    // Mock empty result (edge case)
    mockDb.where.mockResolvedValue([]);

    const result = await canCreateEnvironment(mockDb, teamId);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe("getTeamEnvironmentUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unlimited for paid teams", async () => {
    const mockDb = createMockDb();
    const teamId = "team-paid-123";

    // Mock paid team
    mockIsTeamOnPaidPlan.mockResolvedValue(true);
    mockDb.where.mockResolvedValue([{ count: 10 }]);

    const result = await getTeamEnvironmentUsage(mockDb, teamId);

    expect(result.isPaid).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.currentCount).toBe(10);
  });

  it("should return limit for free teams", async () => {
    const mockDb = createMockDb();
    const teamId = "team-free-123";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);
    mockDb.where.mockResolvedValue([{ count: 2 }]);

    const result = await getTeamEnvironmentUsage(mockDb, teamId);

    expect(result.isPaid).toBe(false);
    expect(result.limit).toBe(FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS);
    expect(result.currentCount).toBe(2);
  });

  it("should handle zero count for free teams", async () => {
    const mockDb = createMockDb();
    const teamId = "team-free-zero";

    // Mock free team
    mockIsTeamOnPaidPlan.mockResolvedValue(false);
    mockDb.where.mockResolvedValue([{ count: 0 }]);

    const result = await getTeamEnvironmentUsage(mockDb, teamId);

    expect(result.isPaid).toBe(false);
    expect(result.limit).toBe(FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS);
    expect(result.currentCount).toBe(0);
  });
});
