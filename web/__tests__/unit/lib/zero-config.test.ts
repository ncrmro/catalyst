/**
 * @jest-environment node
 */

import { isZeroConfigProject, getZeroConfigStatus } from "@/lib/zero-config";
import type { EnvironmentConfig } from "@/types/environment-config";

describe("isZeroConfigProject", () => {
  it("should return true for a successfully detected docker-compose project", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "docker-compose",
      devCommand: "docker compose up",
      autoDetect: true,
      confidence: "high",
      detectedAt: new Date().toISOString(),
    };

    expect(isZeroConfigProject(config)).toBe(true);
  });

  it("should return true for a successfully detected Node.js project", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "nodejs",
      devCommand: "npm run dev",
      packageManager: "npm",
      autoDetect: true,
      confidence: "high",
      detectedAt: new Date().toISOString(),
    };

    expect(isZeroConfigProject(config)).toBe(true);
  });

  it("should return false for an unknown project type", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "unknown",
      devCommand: null,
      autoDetect: true,
      confidence: "low",
      detectedAt: new Date().toISOString(),
    };

    expect(isZeroConfigProject(config)).toBe(false);
  });

  it("should return false when autoDetect is explicitly disabled", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "nodejs",
      devCommand: "npm run dev",
      autoDetect: false,
      confidence: "high",
      detectedAt: new Date().toISOString(),
    };

    expect(isZeroConfigProject(config)).toBe(false);
  });

  it("should return false when detection has not been run", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "nodejs",
      devCommand: "npm run dev",
      autoDetect: true,
      confidence: "high",
      // No detectedAt timestamp
    };

    expect(isZeroConfigProject(config)).toBe(false);
  });

  it("should return false for null or undefined config", () => {
    expect(isZeroConfigProject(null)).toBe(false);
    expect(isZeroConfigProject(undefined)).toBe(false);
  });
});

describe("getZeroConfigStatus", () => {
  it("should return correct status for zero-config project", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "nodejs",
      devCommand: "npm run dev",
      autoDetect: true,
      confidence: "high",
      detectedAt: new Date().toISOString(),
    };

    const status = getZeroConfigStatus(config);

    expect(status.isZeroConfig).toBe(true);
    expect(status.title).toBe("Zero-Config Ready");
    expect(status.description).toContain("auto-detected");
  });

  it("should return correct status for failed detection", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      projectType: "unknown",
      devCommand: null,
      autoDetect: true,
      confidence: "low",
      detectedAt: new Date().toISOString(),
    };

    const status = getZeroConfigStatus(config);

    expect(status.isZeroConfig).toBe(false);
    expect(status.title).toBe("Manual Configuration Required");
    expect(status.description).toContain("Could not auto-detect");
  });

  it("should return correct status for pending detection", () => {
    const config: EnvironmentConfig = {
      method: "docker",
      dockerfilePath: "Dockerfile",
      // No detection fields
    };

    const status = getZeroConfigStatus(config);

    expect(status.isZeroConfig).toBe(false);
    expect(status.title).toBe("Configuration Pending");
    expect(status.description).toContain("not yet performed");
  });

  it("should return correct status for null config", () => {
    const status = getZeroConfigStatus(null);

    expect(status.isZeroConfig).toBe(false);
    expect(status.title).toBe("No Configuration");
    expect(status.description).toContain("No repository connected");
  });
});
