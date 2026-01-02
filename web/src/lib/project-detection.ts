import { z } from "zod";

export interface ProjectDetectionResult {
  type: "node" | "python" | "go" | "docker" | "static" | "unknown";
  devCommand?: string;
  workdir?: string; // For monorepos
  confidence: number; // 0.0 to 1.0
  indicators: string[]; // What triggered this detection
}

/**
 * Interface for file system access to allow testing and different providers (local vs GitHub)
 */
export interface FileSystemAdapter {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string | null>;
}

/**
 * Heuristics for project type detection
 */
export async function detectProjectType(
  fs: FileSystemAdapter,
  workdir: string = ""
): Promise<ProjectDetectionResult> {
  const indicators: string[] = [];
  const getPath = (p: string) => (workdir ? `${workdir}/${p}` : p);

  // 1. Docker Compose (Highest Priority)
  if (await fs.exists(getPath("docker-compose.yml")) || await fs.exists(getPath("compose.yml"))) {
    return {
      type: "docker",
      devCommand: "docker compose up",
      confidence: 1.0,
      indicators: ["docker-compose.yml"],
    };
  }

  // 2. Dockerfile
  if (await fs.exists(getPath("Dockerfile"))) {
    // Basic Dockerfile support - build and run?
    // For now, we just identify it.
    return {
      type: "docker",
      confidence: 0.8,
      indicators: ["Dockerfile"],
    };
  }

  // 3. Node.js (package.json)
  const packageJsonContent = await fs.read(getPath("package.json"));
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      indicators.push("package.json");
      
      const scripts = pkg.scripts || {};
      let devCommand = "";
      
      // Check lockfiles for package manager
      let pm = "npm";
      if (await fs.exists(getPath("yarn.lock"))) pm = "yarn";
      else if (await fs.exists(getPath("pnpm-lock.yaml"))) pm = "pnpm";
      else if (await fs.exists(getPath("bun.lockb"))) pm = "bun";

      if (scripts.dev) {
        devCommand = `${pm} run dev`;
        indicators.push("scripts.dev");
      } else if (scripts.start) {
        devCommand = `${pm} start`;
        indicators.push("scripts.start");
      }

      return {
        type: "node",
        devCommand: devCommand || undefined,
        confidence: devCommand ? 0.9 : 0.6,
        indicators,
      };
    } catch (e) {
      console.warn("Failed to parse package.json", e);
    }
  }

  // 4. Makefile
  const makefileContent = await fs.read(getPath("Makefile"));
  if (makefileContent) {
    if (makefileContent.includes("dev:")) {
      return {
        type: "unknown", // Generic make
        devCommand: "make dev",
        confidence: 0.7,
        indicators: ["Makefile", "dev target"],
      };
    }
  }

  // 5. Go
  if (await fs.exists(getPath("go.mod"))) {
    return {
      type: "go",
      devCommand: "go run .",
      confidence: 0.8,
      indicators: ["go.mod"],
    };
  }

  // 6. Python
  if (await fs.exists(getPath("requirements.txt")) || await fs.exists(getPath("pyproject.toml"))) {
    return {
      type: "python",
      // Python is tricky - flask run? uvicorn? python main.py?
      // Leaving command empty for manual config
      confidence: 0.7,
      indicators: ["requirements.txt/pyproject.toml"],
    };
  }

  return {
    type: "unknown",
    confidence: 0.0,
    indicators: [],
  };
}
