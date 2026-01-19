/**
 * Unit tests for Git Credential Helper Library
 *
 * Tests the helper functions for setting up git credential helpers in pods
 */

import { describe, it, expect } from "vitest";
import {
  generateGitCredentialHelperInitCommands,
  createInstallationIdEnvVar,
  createInstallationIdLabels,
} from "../../src/lib/git-credential-helper";

describe("Git Credential Helper Library", () => {
  describe("generateGitCredentialHelperInitCommands", () => {
    it("should generate init commands with installation ID", () => {
      const commands = generateGitCredentialHelperInitCommands({
        installationId: 12345,
      });

      expect(commands).toContain("INSTALLATION_ID=12345");
      expect(commands).toContain("/usr/local/bin/git-credential-catalyst");
      expect(commands).toContain("git config --global credential.helper");
      expect(commands).toContain("Git Setup Complete");
    });

    it("should include repository cloning commands when repoUrl provided", () => {
      const commands = generateGitCredentialHelperInitCommands({
        installationId: 12345,
        repoUrl: "https://github.com/test/repo.git",
        targetDir: "/workspace",
      });

      expect(commands).toContain(
        "git clone https://github.com/test/repo.git /workspace",
      );
      expect(commands).toContain("Cloning Repository");
    });

    it("should include checkout commands when commitSha provided", () => {
      const commands = generateGitCredentialHelperInitCommands({
        installationId: 12345,
        repoUrl: "https://github.com/test/repo.git",
        commitSha: "abc123",
        targetDir: "/workspace",
      });

      expect(commands).toContain("git checkout abc123");
      expect(commands).toContain("Commit SHA: abc123");
    });

    it("should not include cloning commands when repoUrl is not provided", () => {
      const commands = generateGitCredentialHelperInitCommands({
        installationId: 12345,
      });

      expect(commands).not.toContain("git clone");
      expect(commands).not.toContain("Cloning Repository");
    });
  });

  describe("createInstallationIdEnvVar", () => {
    it("should create environment variable spec with installation ID", () => {
      const envVar = createInstallationIdEnvVar(12345);

      expect(envVar).toEqual({
        name: "INSTALLATION_ID",
        value: "12345",
      });
    });

    it("should handle different installation IDs", () => {
      const envVar1 = createInstallationIdEnvVar(1);
      const envVar2 = createInstallationIdEnvVar(999999);

      expect(envVar1.value).toBe("1");
      expect(envVar2.value).toBe("999999");
    });
  });

  describe("createInstallationIdLabels", () => {
    it("should create labels with installation ID", () => {
      const labels = createInstallationIdLabels(12345);

      expect(labels).toEqual({
        "catalyst.dev/installation-id": "12345",
      });
    });

    it("should handle different installation IDs in labels", () => {
      const labels1 = createInstallationIdLabels(1);
      const labels2 = createInstallationIdLabels(999999);

      expect(labels1["catalyst.dev/installation-id"]).toBe("1");
      expect(labels2["catalyst.dev/installation-id"]).toBe("999999");
    });
  });
});
