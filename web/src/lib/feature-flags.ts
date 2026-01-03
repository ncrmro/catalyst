/**
 * Feature Flag System
 *
 * Reads environment variables prefixed with FF_ and creates an FF object
 * where FF_FOO becomes FF.FOO
 */

interface FeatureFlags {
  [key: string]: boolean;
}

/**
 * Parse feature flags from environment variables
 * In development (NODE_ENV !== 'production'): defaults to true unless explicitly set to "0"
 * In production: only "1" = true, anything else = false
 */
function parseFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {};
  const isDevelopment = process.env.NODE_ENV !== "production";

  // Server-side: access process.env directly
  if (typeof window === "undefined") {
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("FF_")) {
        // Convert FF_FOO to FOO
        const flagName = key.slice(3);
        const value = process.env[key];

        if (isDevelopment) {
          // In development: default to true unless explicitly set to "0"
          // If not set at all (undefined), default to true
          flags[flagName] = value === undefined ? true : value !== "0";
        } else {
          // In production: only "1" = true, anything else = false
          flags[flagName] = value === "1";
        }
      }
    });
  }

  return flags;
}

// Create the FF object
export const FF = parseFeatureFlags();

/**
 * Hook to get feature flags (for React components)
 */
export function useFeatureFlags() {
  return FF;
}

/**
 * Check if a specific feature flag is enabled
 * In development: defaults to true if not explicitly set
 * In production: defaults to false if not explicitly set
 */
export function isFeatureEnabled(flagName: string): boolean {
  // If the flag exists in the FF object, use its value
  if (flagName in FF) {
    return FF[flagName] === true;
  }

  // If the flag doesn't exist, use default behavior
  const isDevelopment = process.env.NODE_ENV !== "production";
  return isDevelopment;
}
