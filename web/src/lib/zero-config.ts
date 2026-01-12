/**
 * Zero-Config Project Detection Utilities
 *
 * Helper functions to determine if a project has been successfully auto-detected
 * and can be deployed without manual configuration (zero-config).
 */

import type { EnvironmentConfig } from "@/types/environment-config";

/**
 * Determine if an environment configuration represents a zero-config project.
 *
 * A project is considered "zero-config" if:
 * 1. Auto-detection has run (detectedAt is present)
 * 2. Project type was successfully identified (not "unknown")
 * 3. Auto-detection hasn't been explicitly disabled (autoDetect !== false)
 *
 * @param config - Environment configuration to check
 * @returns true if the project is zero-config, false otherwise
 */
export function isZeroConfigProject(
  config: EnvironmentConfig | null | undefined,
): boolean {
  if (!config) return false;

  const hasSuccessfulDetection =
    config.autoDetect !== false &&
    config.projectType &&
    config.projectType !== "unknown" &&
    config.detectedAt;

  return !!hasSuccessfulDetection;
}

/**
 * Get a human-readable status message for zero-config detection.
 *
 * @param config - Environment configuration to check
 * @returns Status object with title and description
 */
export function getZeroConfigStatus(config: EnvironmentConfig | null | undefined): {
  isZeroConfig: boolean;
  title: string;
  description: string;
} {
  if (!config) {
    return {
      isZeroConfig: false,
      title: "No Configuration",
      description: "No repository connected for auto-detection",
    };
  }

  const isZeroConfig = isZeroConfigProject(config);

  if (isZeroConfig) {
    return {
      isZeroConfig: true,
      title: "Zero-Config Ready",
      description:
        "Project type auto-detected. Ready to deploy without manual configuration.",
    };
  }

  // Check if detection ran but failed
  if (config.detectedAt && config.projectType === "unknown") {
    return {
      isZeroConfig: false,
      title: "Manual Configuration Required",
      description:
        "Could not auto-detect project type. Manual configuration needed.",
    };
  }

  // Detection hasn't run yet or was disabled
  return {
    isZeroConfig: false,
    title: "Configuration Pending",
    description: "Auto-detection not yet performed or configuration needed.",
  };
}
