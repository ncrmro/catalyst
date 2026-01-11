import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProviderRegistry } from "../../provider-registry";
import type {
  VCSProvider,
  FileContent,
  PullRequest,
  PRComment,
  WebhookEvent,
  Branch,
} from "../../types";

// Mock Provider Implementation
class MockProvider implements VCSProvider {
  id: "github" | "gitlab" | "bitbucket" | "azure";
  name: string;
  iconName: string;

  constructor(id: "github" | "gitlab" | "bitbucket" | "azure", name: string) {
    this.id = id;
    this.name = name;
    this.iconName = name.toLowerCase();
    this.authenticate = vi
      .fn()
      .mockResolvedValue({ providerId: this.id, raw: {} });
  }

  authenticate: any;
  checkConnection = vi.fn().mockResolvedValue({ connected: true });

  listUserRepositories = vi.fn().mockResolvedValue([]);
  listUserOrganizations = vi.fn().mockResolvedValue([]);
  listOrgRepositories = vi.fn().mockResolvedValue([]);
  getRepository = vi.fn().mockImplementation(async (_client, owner, repo) => ({
    id: "1",
    name: repo,
    fullName: `${owner}/${repo}`,
    owner,
    private: false,
    defaultBranch: "main",
    htmlUrl: "",
    updatedAt: new Date(),
  }));
  getFileContent = vi.fn().mockResolvedValue(null);
  getDirectoryContent = vi.fn().mockResolvedValue([]);
  listBranches = vi.fn().mockResolvedValue([]);

  listPullRequests = vi.fn().mockResolvedValue([]);
  createPullRequest = vi.fn().mockResolvedValue({} as PullRequest);
  getPullRequest = vi.fn().mockResolvedValue({} as PullRequest);
  createPullRequest = vi.fn().mockResolvedValue({} as PullRequest);
  listPullRequestReviews = vi.fn().mockResolvedValue([]);

  listPRComments = vi.fn().mockResolvedValue([]);
  createPRComment = vi.fn().mockResolvedValue({} as PRComment);
  updatePRComment = vi.fn().mockResolvedValue({} as PRComment);
  deletePRComment = vi.fn().mockResolvedValue(undefined);

  listIssues = vi.fn().mockResolvedValue([]);

  // Git operations
  createBranch = vi
    .fn()
    .mockResolvedValue({ name: "test-branch", sha: "sha" } as Branch);
  listBranches = vi
    .fn()
    .mockResolvedValue([{ name: "main", sha: "sha" }] as Branch[]);
  updateFile = vi.fn().mockResolvedValue({
    name: "file",
    path: "path",
    content: "content",
    sha: "sha",
    htmlUrl: "url",
  } as FileContent);

  // CI/CD
  getCIStatus = vi.fn().mockResolvedValue(null);

  validateConfig = vi.fn();

  verifyWebhookSignature = vi.fn().mockReturnValue(true);
  parseWebhookEvent = vi
    .fn()
    .mockReturnValue({ type: "push", sender: "test" } as WebhookEvent);
}

describe("VCS Provider Registry", () => {
  let registry: ProviderRegistry;
  let githubProvider: MockProvider;
  let gitlabProvider: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    githubProvider = new MockProvider("github", "GitHub");
    gitlabProvider = new MockProvider("gitlab", "GitLab");
  });

  it("should register providers", () => {
    registry.register(githubProvider);
    expect(registry.has("github")).toBe(true);
    expect(registry.get("github")).toBe(githubProvider);
  });

  it("should retrieve all registered providers", () => {
    registry.register(githubProvider);
    registry.register(gitlabProvider);

    const providers = registry.getAll();
    expect(providers).toHaveLength(2);
    expect(providers).toContain(githubProvider);
    expect(providers).toContain(gitlabProvider);
  });

  it("should get default provider (github)", () => {
    registry.register(githubProvider);
    // Default is 'github'
    expect(registry.getDefault()).toBe(githubProvider);
  });

  it("should throw error if default provider is not registered", () => {
    expect(() => registry.getDefault()).toThrow(
      "Default provider 'github' not registered",
    );
  });

  it("should allow setting a new default provider", () => {
    registry.register(githubProvider);
    registry.register(gitlabProvider);

    registry.setDefault("gitlab");
    expect(registry.getDefault()).toBe(gitlabProvider);
  });

  it("should throw error when setting default to unregistered provider", () => {
    expect(() => registry.setDefault("bitbucket")).toThrow(
      "Provider 'bitbucket' not registered",
    );
  });
});
