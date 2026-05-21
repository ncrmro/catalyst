import { describe, it, expect } from "vitest";
import {
  detectProjectType,
  detectPackageManager,
  hasPackageJson,
  buildDetectionInput,
  type DetectionInput,
} from "@/lib/project-detection";

describe("detectProjectType", () => {
  describe("docker-compose detection (highest precedence)", () => {
    it("detects docker-compose.yml", () => {
      const input: DetectionInput = {
        files: ["docker-compose.yml", "package.json"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("docker-compose");
      expect(result.devCommand).toBe("docker compose up");
      expect(result.confidence).toBe("high");
    });

    it("detects docker-compose.yaml", () => {
      const input: DetectionInput = {
        files: ["docker-compose.yaml"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("docker-compose");
    });

    it("detects compose.yml (short form)", () => {
      const input: DetectionInput = {
        files: ["compose.yml"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("docker-compose");
    });

    it("detects compose.yaml (short form)", () => {
      const input: DetectionInput = {
        files: ["compose.yaml"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("docker-compose");
    });

    it("prioritizes docker-compose over package.json with dev script", () => {
      const input: DetectionInput = {
        files: ["docker-compose.yml", "package.json"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("docker-compose");
    });
  });

  describe("Dockerfile detection (second precedence)", () => {
    it("detects Dockerfile", () => {
      const input: DetectionInput = {
        files: ["Dockerfile"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("dockerfile");
      expect(result.devCommand).toContain("docker build");
      expect(result.confidence).toBe("medium");
    });

    it("detects Dockerfile.dev variant", () => {
      const input: DetectionInput = {
        files: ["Dockerfile.dev"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("dockerfile");
    });

    it("is case-insensitive for Dockerfile", () => {
      const input: DetectionInput = {
        files: ["dockerfile"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("dockerfile");
    });

    it("prioritizes Dockerfile over package.json dev script", () => {
      const input: DetectionInput = {
        files: ["Dockerfile", "package.json"],
        packageJson: { scripts: { dev: "npm run dev" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("dockerfile");
    });
  });

  describe("Node.js with dev script (third precedence)", () => {
    it("detects package.json with dev script using npm", () => {
      const input: DetectionInput = {
        files: ["package.json", "package-lock.json"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("nodejs");
      expect(result.devCommand).toBe("npm run dev");
      expect(result.packageManager).toBe("npm");
      expect(result.confidence).toBe("high");
    });

    it("detects package.json with dev script using pnpm", () => {
      const input: DetectionInput = {
        files: ["package.json", "pnpm-lock.yaml"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("nodejs");
      expect(result.devCommand).toBe("pnpm dev");
      expect(result.packageManager).toBe("pnpm");
    });

    it("detects package.json with dev script using yarn", () => {
      const input: DetectionInput = {
        files: ["package.json", "yarn.lock"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("nodejs");
      expect(result.devCommand).toBe("yarn dev");
      expect(result.packageManager).toBe("yarn");
    });

    it("detects package.json with dev script using bun", () => {
      const input: DetectionInput = {
        files: ["package.json", "bun.lockb"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("nodejs");
      expect(result.devCommand).toBe("bun dev");
      expect(result.packageManager).toBe("bun");
    });

    it("uses Corepack packageManager field if present", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: {
          scripts: { dev: "next dev" },
          packageManager: "pnpm@8.10.0",
        },
      };

      const result = detectProjectType(input);

      expect(result.packageManager).toBe("pnpm");
      expect(result.devCommand).toBe("pnpm dev");
    });
  });

  describe("Makefile with dev target (fourth precedence)", () => {
    it("detects Makefile with dev target", () => {
      const input: DetectionInput = {
        files: ["Makefile"],
        makefileContent: `.PHONY: dev
dev:
\tnpm run dev`,
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("makefile");
      expect(result.devCommand).toBe("make dev");
      expect(result.confidence).toBe("medium");
    });

    it("detects Makefile with dev target and dependencies", () => {
      const input: DetectionInput = {
        files: ["Makefile"],
        makefileContent: `dev: install build
\tnpm run dev`,
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("makefile");
    });

    it("does not detect Makefile without dev target", () => {
      const input: DetectionInput = {
        files: ["Makefile"],
        makefileContent: `build:
\tnpm run build`,
      };

      const result = detectProjectType(input);

      expect(result.projectType).not.toBe("makefile");
    });

    it("requires Makefile content to detect dev target", () => {
      const input: DetectionInput = {
        files: ["Makefile"],
        // No makefileContent provided
      };

      const result = detectProjectType(input);

      expect(result.projectType).not.toBe("makefile");
    });

    it("prioritizes nodejs dev script over Makefile dev", () => {
      const input: DetectionInput = {
        files: ["package.json", "Makefile"],
        packageJson: { scripts: { dev: "next dev" } },
        makefileContent: "dev:\n\tmake run",
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("nodejs");
    });
  });

  describe("Node.js with start script (lowest precedence)", () => {
    it("detects package.json with only start script", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: { start: "node server.js" } },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("nodejs");
      expect(result.devCommand).toBe("npm run start");
      expect(result.confidence).toBe("low");
    });

    it("prefers dev script over start script", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: { dev: "next dev", start: "next start" } },
      };

      const result = detectProjectType(input);

      expect(result.devCommand).toBe("npm run dev");
      expect(result.confidence).toBe("high");
    });
  });

  describe("Unknown project type", () => {
    it("returns unknown for empty files list", () => {
      const input: DetectionInput = {
        files: [],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("unknown");
      expect(result.devCommand).toBeNull();
      expect(result.confidence).toBe("low");
    });

    it("returns unknown for unrecognized files", () => {
      const input: DetectionInput = {
        files: ["main.go", "go.mod"],
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("unknown");
    });

    it("returns unknown for package.json without scripts", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: {} },
      };

      const result = detectProjectType(input);

      expect(result.projectType).toBe("unknown");
    });
  });

  describe("workdir support", () => {
    it("includes workdir in result when provided", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input, "apps/web");

      expect(result.workdir).toBe("apps/web");
    });

    it("workdir is undefined when not provided", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.workdir).toBeUndefined();
    });
  });

  describe("metadata", () => {
    it("includes detectedAt timestamp", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const before = new Date().toISOString();
      const result = detectProjectType(input);
      const after = new Date().toISOString();

      expect(result.detectedAt).toBeDefined();
      expect(result.detectedAt! >= before).toBe(true);
      expect(result.detectedAt! <= after).toBe(true);
    });

    it("sets autoDetect to true", () => {
      const input: DetectionInput = {
        files: ["package.json"],
        packageJson: { scripts: { dev: "next dev" } },
      };

      const result = detectProjectType(input);

      expect(result.autoDetect).toBe(true);
    });
  });
});

describe("detectPackageManager", () => {
  it("detects pnpm from lockfile", () => {
    const result = detectPackageManager(["pnpm-lock.yaml"]);
    expect(result).toBe("pnpm");
  });

  it("detects yarn from lockfile", () => {
    const result = detectPackageManager(["yarn.lock"]);
    expect(result).toBe("yarn");
  });

  it("detects bun from bun.lockb", () => {
    const result = detectPackageManager(["bun.lockb"]);
    expect(result).toBe("bun");
  });

  it("detects bun from bun.lock", () => {
    const result = detectPackageManager(["bun.lock"]);
    expect(result).toBe("bun");
  });

  it("detects npm from package-lock.json", () => {
    const result = detectPackageManager(["package-lock.json"]);
    expect(result).toBe("npm");
  });

  it("defaults to npm when no lockfile", () => {
    const result = detectPackageManager(["package.json"]);
    expect(result).toBe("npm");
  });

  it("uses Corepack packageManager field when present", () => {
    const result = detectPackageManager(["package.json"], {
      packageManager: "pnpm@9.0.0",
    });
    expect(result).toBe("pnpm");
  });

  it("Corepack field takes precedence over lockfile", () => {
    const result = detectPackageManager(["package.json", "yarn.lock"], {
      packageManager: "pnpm@9.0.0",
    });
    expect(result).toBe("pnpm");
  });

  it("ignores invalid packageManager field", () => {
    const result = detectPackageManager(["package.json", "yarn.lock"], {
      packageManager: "invalid-manager@1.0.0",
    });
    expect(result).toBe("yarn");
  });
});

describe("hasPackageJson", () => {
  it("returns true when package.json exists", () => {
    expect(hasPackageJson(["package.json"])).toBe(true);
  });

  it("returns true case-insensitively", () => {
    expect(hasPackageJson(["Package.json"])).toBe(true);
  });

  it("returns false when package.json does not exist", () => {
    expect(hasPackageJson(["main.go"])).toBe(false);
  });
});

describe("buildDetectionInput", () => {
  it("builds input with files only", () => {
    const input = buildDetectionInput(["package.json", "Dockerfile"]);

    expect(input.files).toEqual(["package.json", "Dockerfile"]);
    expect(input.packageJson).toBeUndefined();
    expect(input.makefileContent).toBeUndefined();
  });

  it("parses package.json content", () => {
    const input = buildDetectionInput(["package.json"], {
      packageJsonContent: '{"scripts": {"dev": "next dev"}}',
    });

    expect(input.packageJson).toEqual({ scripts: { dev: "next dev" } });
  });

  it("includes Makefile content", () => {
    const input = buildDetectionInput(["Makefile"], {
      makefileContent: "dev:\n\tnpm run dev",
    });

    expect(input.makefileContent).toBe("dev:\n\tnpm run dev");
  });

  it("handles invalid JSON gracefully", () => {
    const input = buildDetectionInput(["package.json"], {
      packageJsonContent: "not valid json",
    });

    expect(input.packageJson).toBeUndefined();
  });
});
