/**
 * @vitest-environment node
 *
 * Unit tests for watchAndUpdateDeploymentComment — the async poller that
 * updates the GitHub PR comment when an Environment CR transitions to a
 * terminal phase (Ready or Failed).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

vi.mock("@/lib/k8s-operator", () => ({
  getEnvironmentCR: vi.fn(),
}));

vi.mock("@/lib/vcs-providers", () => ({
  upsertDeploymentComment: vi.fn(),
  deleteDeploymentComment: vi.fn(),
  GITHUB_CONFIG: {
    WEBHOOK_SECRET: "test-secret",
    PAT: "mock-pat",
  },
}));

// Stub heavy dependencies pulled in by preview-environments.ts
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@catalyst/kubernetes-client", () => ({
  ensureProjectNamespace: vi.fn(),
}));
vi.mock("@/lib/k8s-client", () => ({
  getClusterConfig: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/logging", () => ({
  previewLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logPreviewLifecycleEvent: vi.fn(),
  startTimer: vi.fn().mockReturnValue({ end: vi.fn() }),
}));
vi.mock("@/lib/namespace-utils", () => ({
  generateProjectNamespace: vi.fn().mockReturnValue("test-ns"),
  sanitizeNamespaceComponent: vi.fn((s: string) => s),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { watchAndUpdateDeploymentComment } from "@/models/preview-environments";
import { getEnvironmentCR } from "@/lib/k8s-operator";
import { upsertDeploymentComment } from "@/lib/vcs-providers";

const mockGetEnvironmentCR = vi.mocked(getEnvironmentCR);
const mockUpsertDeploymentComment = vi.mocked(upsertDeploymentComment);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(overrides?: Partial<Parameters<typeof watchAndUpdateDeploymentComment>[0]>) {
  return {
    crNamespace: "test-project-ns",
    crName: "preview-42",
    installationId: 99,
    owner: "acme",
    repo: "widget",
    prNumber: 42,
    commitSha: "abc1234",
    targetNamespace: "env-preview-42",
    pollIntervalMs: 10, // fast for tests
    timeoutMs: 500,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("watchAndUpdateDeploymentComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertDeploymentComment.mockResolvedValue({ success: true, commentId: 1 });
  });

  it("updates the PR comment to running when CR phase becomes Ready", async () => {
    // First call returns pending, second returns Ready
    mockGetEnvironmentCR
      .mockResolvedValueOnce({
        metadata: { name: "preview-42", namespace: "test-project-ns" },
        spec: { projectRef: { name: "widget" }, type: "development" },
        status: { phase: "Pending" },
      })
      .mockResolvedValueOnce({
        metadata: { name: "preview-42", namespace: "test-project-ns" },
        spec: { projectRef: { name: "widget" }, type: "development" },
        status: { phase: "Ready", url: "https://env-preview-42.preview.example.com" },
      });

    await watchAndUpdateDeploymentComment(makeParams());

    expect(mockUpsertDeploymentComment).toHaveBeenCalledOnce();
    expect(mockUpsertDeploymentComment).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: 99,
        owner: "acme",
        repo: "widget",
        prNumber: 42,
        status: "running",
        publicUrl: "https://env-preview-42.preview.example.com",
        commitSha: "abc1234",
        namespace: "env-preview-42",
      }),
    );
  });

  it("uses generated publicUrl when CR status.url is absent on Ready", async () => {
    mockGetEnvironmentCR.mockResolvedValue({
      metadata: { name: "preview-42", namespace: "test-project-ns" },
      spec: { projectRef: { name: "widget" }, type: "development" },
      status: { phase: "Ready" }, // no url field
    });

    await watchAndUpdateDeploymentComment(makeParams());

    const call = mockUpsertDeploymentComment.mock.calls[0][0];
    expect(call.status).toBe("running");
    expect(typeof call.publicUrl).toBe("string");
    expect(call.publicUrl!.length).toBeGreaterThan(0);
  });

  it("updates the PR comment to failed when CR phase becomes Failed", async () => {
    mockGetEnvironmentCR.mockResolvedValue({
      metadata: { name: "preview-42", namespace: "test-project-ns" },
      spec: { projectRef: { name: "widget" }, type: "development" },
      status: { phase: "Failed" },
    });

    await watchAndUpdateDeploymentComment(makeParams());

    expect(mockUpsertDeploymentComment).toHaveBeenCalledOnce();
    expect(mockUpsertDeploymentComment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        prNumber: 42,
      }),
    );
  });

  it("updates the PR comment to failed when CR phase is Error", async () => {
    mockGetEnvironmentCR.mockResolvedValue({
      metadata: { name: "preview-42", namespace: "test-project-ns" },
      spec: { projectRef: { name: "widget" }, type: "development" },
      status: { phase: "Error" },
    });

    await watchAndUpdateDeploymentComment(makeParams());

    expect(mockUpsertDeploymentComment).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("includes errorMessage from CR conditions when phase is Failed", async () => {
    mockGetEnvironmentCR.mockResolvedValue({
      metadata: { name: "preview-42", namespace: "test-project-ns" },
      spec: { projectRef: { name: "widget" }, type: "development" },
      status: {
        phase: "Failed",
        conditions: [{ type: "Failed", status: "build job exited with code 1" }],
      },
    });

    await watchAndUpdateDeploymentComment(makeParams());

    const call = mockUpsertDeploymentComment.mock.calls[0][0];
    expect(call.errorMessage).toContain("build job exited");
  });

  it("posts a failed comment and returns when the timeout expires", async () => {
    // CR stays in Pending indefinitely
    mockGetEnvironmentCR.mockResolvedValue({
      metadata: { name: "preview-42", namespace: "test-project-ns" },
      spec: { projectRef: { name: "widget" }, type: "development" },
      status: { phase: "Pending" },
    });

    await watchAndUpdateDeploymentComment(
      makeParams({ pollIntervalMs: 10, timeoutMs: 50 }),
    );

    expect(mockUpsertDeploymentComment).toHaveBeenCalledOnce();
    const call = mockUpsertDeploymentComment.mock.calls[0][0];
    expect(call.status).toBe("failed");
    expect(call.errorMessage).toMatch(/timed out/i);
  });

  it("continues polling when getEnvironmentCR throws a transient error", async () => {
    // First call throws, second returns Ready
    mockGetEnvironmentCR
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce({
        metadata: { name: "preview-42", namespace: "test-project-ns" },
        spec: { projectRef: { name: "widget" }, type: "development" },
        status: { phase: "Ready", url: "https://example.com" },
      });

    await watchAndUpdateDeploymentComment(makeParams());

    expect(mockUpsertDeploymentComment).toHaveBeenCalledOnce();
    expect(mockUpsertDeploymentComment).toHaveBeenCalledWith(
      expect.objectContaining({ status: "running" }),
    );
  });

  it("does not throw when upsertDeploymentComment rejects — swallows the error", async () => {
    mockGetEnvironmentCR.mockResolvedValue({
      metadata: { name: "preview-42", namespace: "test-project-ns" },
      spec: { projectRef: { name: "widget" }, type: "development" },
      status: { phase: "Ready", url: "https://example.com" },
    });
    mockUpsertDeploymentComment.mockRejectedValue(new Error("GitHub API down"));

    // Should not throw
    await expect(
      watchAndUpdateDeploymentComment(makeParams()),
    ).resolves.toBeUndefined();
  });
});
