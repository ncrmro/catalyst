/**
 * Debug logging utility
 * 
 * Only outputs debug logs when debug logging is explicitly enabled
 * via NODE_ENV=development or DEBUG environment variable
 */

type DebugLog = (...args: unknown[]) => void;

/**
 * Check if debug logging should be enabled
 */
function isDebugEnabled(): boolean {
  // Enable debug in development environment
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Enable debug if DEBUG environment variable is set
  if (process.env.DEBUG) {
    return true;
  }
  
  // Default to disabled (including in test environment)
  return false;
}

/**
 * Debug logger that respects environment configuration
 * Only outputs when debug logging is enabled
 */
export const debug: DebugLog = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    console.debug(...args);
  }
};

/**
 * Check if debug logging is currently enabled
 */
export const isDebugLoggingEnabled = isDebugEnabled;