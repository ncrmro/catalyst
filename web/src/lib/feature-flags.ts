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
 * In development: defaults to true unless explicitly set to "0"
 * In production: only "1" = true, anything else = false
 */
function parseFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {};
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Server-side: access process.env directly
  if (typeof window === 'undefined') {
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('FF_')) {
        // Convert FF_FOO to FOO
        const flagName = key.slice(3);
        const value = process.env[key];
        
        if (isDevelopment) {
          // In development: default to true unless explicitly set to "0"
          flags[flagName] = value !== '0';
        } else {
          // In production: only "1" = true, anything else = false
          flags[flagName] = value === '1';
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
 */
export function isFeatureEnabled(flagName: string): boolean {
  return FF[flagName] === true;
}