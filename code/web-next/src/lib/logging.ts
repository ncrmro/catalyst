/**
 * Structured Logging Library
 *
 * Provides consistent, structured logging across the application.
 * Logs are formatted as JSON for easy parsing and monitoring.
 */

/** Log levels for application operations */
export type LogLevel = "info" | "warn" | "error" | "debug";

/** Base log context that can be extended with specific fields */
export interface LogContext {
  [key: string]: unknown;
}

/** Log entry structure */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  [key: string]: unknown;
}

/**
 * Core logging function with structured output.
 *
 * @param level - Log level
 * @param message - Human-readable message
 * @param context - Additional context data
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const timestamp = new Date().toISOString();
  const logData: LogEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  // Use appropriate console method based on level
  switch (level) {
    case "error":
      console.error(JSON.stringify(logData));
      break;
    case "warn":
      console.warn(JSON.stringify(logData));
      break;
    case "debug":
      console.debug(JSON.stringify(logData));
      break;
    case "info":
    default:
      console.log(JSON.stringify(logData));
      break;
  }
}

/**
 * Create a scoped logger for a specific component.
 * Automatically adds component name to all log entries.
 *
 * @param component - Component name
 * @returns Logger functions scoped to component
 */
export function createLogger(component: string) {
  return {
    info: (message: string, context?: LogContext) =>
      log("info", message, { component, ...context }),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, { component, ...context }),
    error: (message: string, context?: LogContext) =>
      log("error", message, { component, ...context }),
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { component, ...context }),
  };
}

/**
 * Preview environment specific log context.
 * Used for tracking deployment lifecycle events.
 */
export interface PreviewLogContext extends LogContext {
  podId?: string;
  namespace?: string;
  prNumber?: number;
  commitSha?: string;
  status?: string;
  phase?:
    | "created"
    | "deploying"
    | "running"
    | "failed"
    | "deleted"
    | "retrying";
  duration?: number; // milliseconds
  errorMessage?: string;
}

/**
 * Create a logger specifically for preview environment operations.
 * Provides lifecycle event tracking with consistent structure.
 */
export const previewLogger = createLogger("preview-environments");

/**
 * Log a deployment lifecycle event with timing information.
 *
 * @param event - Lifecycle event name
 * @param context - Event context
 */
export function logPreviewLifecycleEvent(
  event: string,
  context: PreviewLogContext,
): void {
  previewLogger.info(`Lifecycle event: ${event}`, {
    event,
    ...context,
  });
}

/**
 * Create a performance timer for measuring operation duration.
 *
 * @param operationName - Name of the operation being timed
 * @returns Timer object with end() method
 */
export function startTimer(operationName: string) {
  const startTime = Date.now();

  return {
    end: (context?: LogContext) => {
      const duration = Date.now() - startTime;
      previewLogger.info(`Operation completed: ${operationName}`, {
        operation: operationName,
        duration,
        ...context,
      });
      return duration;
    },
  };
}
