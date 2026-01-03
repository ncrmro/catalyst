/**
 * Project Detection Logic
 *
 * Auto-detects project type and development configuration from repository structure.
 * Used when creating PR preview environments to determine how to run the project.
 *
 * Detection Precedence (FR-ENV-007):
 * 1. docker-compose (highest)
 * 2. Dockerfile
 * 3. package.json with dev script
 * 4. Makefile with dev target
 * 5. package.json with start script (lowest)
 */

import type {
  ProjectType,
  PackageManager,
  DetectionConfidence,
  DetectionFields,
} from "@/types/environment-config";

/**
 * Result of project detection analysis.
 */
export interface DetectionResult extends DetectionFields {
  projectType: ProjectType;
  confidence: DetectionConfidence;
  detectedAt: string;
}

/**
 * Files to check for detection.
 */
export interface DetectionInput {
  /** List of file paths relative to workdir (or repo root) */
  files: string[];
  /** Content of package.json if present */
  packageJson?: {
    scripts?: Record<string, string>;
    packageManager?: string;
  };
  /** Content of Makefile if present */
  makefileContent?: string;
}

/**
 * Detect project type and dev configuration from repository structure.
 *
 * @param input - Detection input containing file list and file contents
 * @param workdir - Working directory relative to repo root (for monorepos)
 * @returns Detection result with project type, dev command, and confidence level
 */
export function detectProjectType(
  input: DetectionInput,
  workdir?: string,
): DetectionResult {
  const files = input.files.map((f) => f.toLowerCase());
  const timestamp = new Date().toISOString();

  // 1. Check for docker-compose (highest precedence)
  if (hasDockerCompose(files)) {
    return {
      projectType: "docker-compose",
      devCommand: "docker compose up",
      workdir,
      confidence: "high",
      detectedAt: timestamp,
      autoDetect: true,
    };
  }

  // 2. Check for Dockerfile
  if (hasDockerfile(files)) {
    return {
      projectType: "dockerfile",
      devCommand: "docker build -t app . && docker run -p 3000:3000 app",
      workdir,
      confidence: "medium",
      detectedAt: timestamp,
      autoDetect: true,
    };
  }

  // 3. Check for package.json with dev script
  if (input.packageJson?.scripts?.dev) {
    const packageManager = detectPackageManager(files, input.packageJson);
    const runPrefix = getRunPrefix(packageManager);

    return {
      projectType: "nodejs",
      devCommand: `${runPrefix} dev`,
      packageManager,
      workdir,
      confidence: "high",
      detectedAt: timestamp,
      autoDetect: true,
    };
  }

  // 4. Check for Makefile with dev target
  if (hasMakefileWithDev(files, input.makefileContent)) {
    return {
      projectType: "makefile",
      devCommand: "make dev",
      workdir,
      confidence: "medium",
      detectedAt: timestamp,
      autoDetect: true,
    };
  }

  // 5. Check for package.json with start script (lowest precedence)
  if (input.packageJson?.scripts?.start) {
    const packageManager = detectPackageManager(files, input.packageJson);
    const runPrefix = getRunPrefix(packageManager);

    return {
      projectType: "nodejs",
      devCommand: `${runPrefix} start`,
      packageManager,
      workdir,
      confidence: "low",
      detectedAt: timestamp,
      autoDetect: true,
    };
  }

  // No recognizable project type
  return {
    projectType: "unknown",
    devCommand: null,
    workdir,
    confidence: "low",
    detectedAt: timestamp,
    autoDetect: true,
  };
}

/**
 * Check for docker-compose.yml or compose.yml
 */
function hasDockerCompose(files: string[]): boolean {
  return files.some(
    (f) =>
      f === "docker-compose.yml" ||
      f === "docker-compose.yaml" ||
      f === "compose.yml" ||
      f === "compose.yaml",
  );
}

/**
 * Check for Dockerfile
 */
function hasDockerfile(files: string[]): boolean {
  return files.some((f) => f === "dockerfile" || f.startsWith("dockerfile."));
}

/**
 * Check for Makefile with 'dev' target
 */
function hasMakefileWithDev(
  files: string[],
  makefileContent?: string,
): boolean {
  if (!files.includes("makefile")) return false;
  if (!makefileContent) return false;

  // Check for 'dev:' target in Makefile
  // Matches both 'dev:' and 'dev: ' with possible dependencies
  return /^dev:/m.test(makefileContent);
}

/**
 * Detect package manager from lockfiles and package.json.
 */
export function detectPackageManager(
  files: string[],
  packageJson?: { packageManager?: string },
): PackageManager {
  // Check explicit packageManager field first (Corepack)
  if (packageJson?.packageManager) {
    const pm = packageJson.packageManager.split("@")[0];
    if (pm === "pnpm" || pm === "yarn" || pm === "npm" || pm === "bun") {
      return pm;
    }
  }

  // Check lockfiles
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "bun";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("package-lock.json")) return "npm";

  // Default to npm
  return "npm";
}

/**
 * Get the run command prefix for a package manager.
 */
function getRunPrefix(packageManager: PackageManager): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "yarn";
    case "bun":
      return "bun";
    case "npm":
    default:
      return "npm run";
  }
}

/**
 * Check if a file list contains a package.json
 */
export function hasPackageJson(files: string[]): boolean {
  return files.map((f) => f.toLowerCase()).includes("package.json");
}

/**
 * Build detection input from a list of files and optional file contents.
 *
 * This is a helper for when you have file contents available.
 */
export function buildDetectionInput(
  files: string[],
  options?: {
    packageJsonContent?: string;
    makefileContent?: string;
  },
): DetectionInput {
  const input: DetectionInput = { files };

  if (options?.packageJsonContent) {
    try {
      input.packageJson = JSON.parse(options.packageJsonContent);
    } catch {
      // Invalid JSON, ignore
    }
  }

  if (options?.makefileContent) {
    input.makefileContent = options.makefileContent;
  }

  return input;
}
