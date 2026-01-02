import { describe, it, expect, vi, beforeEach } from "vitest";
import { scaffoldProjectConventions } from "@/actions/conventions";
import { createConventionRule } from "@/models/conventions";
import { updateFile, createPullRequest } from "@/actions/vcs";
import { fetchProjectById } from "@/actions/projects";
import { auth } from "@/auth";

// Mock dependencies with explicit factories to avoid importing actual modules
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/projects", () => ({
  fetchProjectById: vi.fn(),
}));

vi.mock("@/models/conventions", () => ({
  createConventionRule: vi.fn(),
  getProjectConventionRules: vi.fn(),
}));

vi.mock("@/actions/vcs", () => ({
  updateFile: vi.fn(),
  createPullRequest: vi.fn(),
}));

describe("Convention Actions Integration", () => {
  const mockProjectId = "proj-123";
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Auth
    (auth as unknown as { mockResolvedValue: (val: any) => void }).mockResolvedValue({ user: { id: "user-1" } });
    
    // Mock Project Fetch
    (fetchProjectById as unknown as { mockResolvedValue: (val: any) => void }).mockResolvedValue({
      id: mockProjectId,
      repositories: [
        {
          repo: {
            fullName: "org/repo",
            defaultBranch: "main"
          }
        }
      ]
    });

    // Mock VCS Actions
    (updateFile as unknown as { mockResolvedValue: (val: any) => void }).mockResolvedValue({ success: true });
    (createPullRequest as unknown as { mockResolvedValue: (val: any) => void }).mockResolvedValue({ htmlUrl: "https://github.com/org/repo/pull/1" });
  });

  it("should scaffold conventions and create a PR", async () => {
    const result = await scaffoldProjectConventions(mockProjectId);

    expect(result.success).toBe(true);
    expect(result.rulesCreated).toBeGreaterThan(0);
    expect(result.prUrl).toBe("https://github.com/org/repo/pull/1");

    // Verify rules were created
    expect(createConventionRule).toHaveBeenCalledTimes(3); // Based on DEFAULT_CONVENTIONS length
    
    // Verify file update
    expect(updateFile).toHaveBeenCalledWith(expect.objectContaining({
      owner: "org",
      repo: "repo",
      path: ".catalyst/conventions.json",
      branch: "chore/scaffold-conventions"
    }));

    // Verify PR creation
    expect(createPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      owner: "org",
      repo: "repo",
      title: "chore: scaffold project conventions",
      head: "chore/scaffold-conventions",
      base: "main"
    }));
  });

  it("should fail if unauthorized", async () => {
    (auth as unknown as { mockResolvedValue: (val: any) => void }).mockResolvedValue(null);
    const result = await scaffoldProjectConventions(mockProjectId);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("should fail if project not found", async () => {
    (fetchProjectById as unknown as { mockResolvedValue: (val: any) => void }).mockResolvedValue(null);
    const result = await scaffoldProjectConventions(mockProjectId);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Project not found");
  });
});
