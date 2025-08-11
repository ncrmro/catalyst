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
 * Converts FF_FOO=1 to FF.FOO = true, FF_BAR=0 to FF.BAR = false
 */
function parseFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {};
  
  // Server-side: access process.env directly
  if (typeof window === 'undefined') {
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('FF_')) {
        // Convert FF_FOO to FOO
        const flagName = key.slice(3);
        // Convert to boolean: "1" = true, anything else = false
        flags[flagName] = process.env[key] === '1';
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
 */
export function isFeatureEnabled(flagName: string): boolean {
  return FF[flagName] === true;
}