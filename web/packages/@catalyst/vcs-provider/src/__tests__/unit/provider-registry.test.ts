import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProviderRegistry } from "../../provider-registry";
import { getVCSClient } from "../../index";
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
  storeTokens = vi.fn().mockResolvedValue(undefined);
  refreshTokensIfNeeded = vi.fn().mockResolvedValue(null);

  listUserRepositories = vi.fn().mockResolvedValue([]);
  listOrgRepositories = vi.fn().mockResolvedValue([]);
  getRepository = vi
    .fn()
    .mockImplementation(async (_client, owner, repo) => ({
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

  listPullRequests = vi.fn().mockResolvedValue([]);
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
  updateFile = vi
    .fn()
    .mockResolvedValue({
      name: "file",
      path: "path",
      content: "content",
      sha: "sha",
      htmlUrl: "url",
    } as FileContent);

  // CI/CD
  getCIStatus = vi.fn().mockResolvedValue(null);

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

describe("getVCSClient", () => {
  // We need to mock the exported providerRegistry instance from the module
  // depending on how it's used. Since getVCSClient uses the exported singleton,
  // we might need to manipulate that singleton or mock the module.
  // Ideally, for unit testing `getVCSClient` in isolation without side effects,
  // we should be able to inject the registry, but the API doesn't allow it.

  // A simpler approach for this specific codebase structure where a singleton is exported:
  // We can just rely on the side-effects if we run tests sequentially or mock the module.

  // Let's mock the module 'provider-registry' to return our test registry if possible,
  // or just register our mocks into the actual singleton and clean up.
  // Using the actual singleton is easier here given the simple state.

  it("should return authenticated client for default provider", async () => {
    // Import the actual singleton to register our mock
    const { providerRegistry } = await import("../../provider-registry");
    const mockProvider = new MockProvider("github", "GitHub");
    providerRegistry.register(mockProvider);

    const client = await getVCSClient("user-123");

    expect(client).toBeDefined();
    expect(mockProvider.authenticate).toHaveBeenCalledWith("user-123");
  });

  it("should return authenticated client for specific provider", async () => {
    const { providerRegistry } = await import("../../provider-registry");
    const mockProvider = new MockProvider("gitlab", "GitLab");
    providerRegistry.register(mockProvider);

    const client = await getVCSClient("user-456", "gitlab");

    expect(client).toBeDefined();
    expect(mockProvider.authenticate).toHaveBeenCalledWith("user-456");
  });

  it("should throw error for non-existent provider", async () => {
    await expect(getVCSClient("user-789", "bitbucket")).rejects.toThrow(
      "VCS provider 'bitbucket' not found",
    );
  });
});
