import { describe, it, expect, vi, beforeEach } from "vitest";
import { createConventionRule, getProjectConventionRules, updateConventionRule } from "@/models/conventions";

const mocks = vi.hoisted(() => {
  // Chain for insert
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  // Chain for update
  const mockWhereReturning = vi.fn();
  const mockWhere = vi.fn(() => ({ returning: mockWhereReturning }));
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  // Queries
  const mockFindMany = vi.fn();
  const mockFindFirst = vi.fn();

  return {
    mockInsert,
    mockValues,
    mockReturning,
    mockUpdate,
    mockSet,
    mockWhere,
    mockWhereReturning,
    mockFindMany,
    mockFindFirst,
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
    query: {
      conventionRules: {
        findMany: mocks.mockFindMany,
        findFirst: mocks.mockFindFirst,
      },
    },
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

describe("Convention Model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Re-establish the chain relationships (since clearAllMocks clears return values too)
    mocks.mockInsert.mockReturnValue({ values: mocks.mockValues });
    mocks.mockValues.mockReturnValue({ returning: mocks.mockReturning });
    
    mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet });
    mocks.mockSet.mockReturnValue({ where: mocks.mockWhere });
    mocks.mockWhere.mockReturnValue({ returning: mocks.mockWhereReturning });
  });

  it("should create a convention rule", async () => {
    const mockRule = {
      id: "rule-1",
      projectId: "proj-1",
      ruleType: "lint",
      ruleName: "ESLint",
      config: { preset: "standard" },
    };

    mocks.mockReturning.mockResolvedValue([mockRule]);

    const result = await createConventionRule({
      projectId: "proj-1",
      ruleType: "lint",
      ruleName: "ESLint",
      config: { preset: "standard" },
    });

    expect(result).toEqual(mockRule);
    expect(mocks.mockInsert).toHaveBeenCalled();
    expect(mocks.mockValues).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "proj-1",
      ruleName: "ESLint"
    }));
  });

  it("should get project convention rules", async () => {
    const mockRules = [{ id: "rule-1", ruleName: "ESLint" }];
    mocks.mockFindMany.mockResolvedValue(mockRules);

    const result = await getProjectConventionRules("proj-1");
    expect(result).toEqual(mockRules);
    expect(mocks.mockFindMany).toHaveBeenCalled();
  });

  it("should update a convention rule", async () => {
    const mockUpdatedRule = { id: "rule-1", ruleName: "Updated Name" };
    mocks.mockWhereReturning.mockResolvedValue([mockUpdatedRule]);

    const result = await updateConventionRule("rule-1", { ruleName: "Updated Name" });
    expect(result).toEqual(mockUpdatedRule);
    expect(mocks.mockUpdate).toHaveBeenCalled();
    expect(mocks.mockSet).toHaveBeenCalledWith(expect.objectContaining({
      ruleName: "Updated Name"
    }));
  });
});