/**
 * Custom error types for Kubernetes operations
 */

/**
 * Base error for Kubernetes API errors
 */
export class KubernetesError extends Error {
  readonly code: number;
  readonly reason?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: number,
    reason?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "KubernetesError";
    this.code = code;
    this.reason = reason;
    this.details = details;
  }

  static isNotFound(error: unknown): error is KubernetesError {
    return error instanceof KubernetesError && error.code === 404;
  }

  static isConflict(error: unknown): error is KubernetesError {
    return error instanceof KubernetesError && error.code === 409;
  }

  static isUnauthorized(error: unknown): error is KubernetesError {
    return error instanceof KubernetesError && error.code === 401;
  }

  static isForbidden(error: unknown): error is KubernetesError {
    return error instanceof KubernetesError && error.code === 403;
  }

  static fromApiError(error: unknown): KubernetesError {
    if (error instanceof KubernetesError) {
      return error;
    }

    // Handle @kubernetes/client-node ApiException with .body and .code
    if (error && typeof error === "object") {
      const err = error as {
        code?: number;
        statusCode?: number; // Keep for backwards compatibility
        body?:
          | string
          | {
              message?: string;
              reason?: string;
              details?: Record<string, unknown>;
            };
      };

      // Support both .code (ApiException) and .statusCode (HttpError)
      const errorCode = err.code ?? err.statusCode;

      if (errorCode) {
        // Try to parse body if it exists
        let parsedBody: {
          message?: string;
          reason?: string;
          details?: Record<string, unknown>;
        } | null = null;

        if (err.body) {
          if (typeof err.body === "string") {
            // Try to parse JSON string
            try {
              parsedBody = JSON.parse(err.body);
            } catch {
              // If parsing fails, body is not JSON - use generic message
            }
          } else if (typeof err.body === "object") {
            // Body is already an object
            parsedBody = err.body;
          }
        }

        // If we have parsed body data, use it
        if (parsedBody && typeof parsedBody === "object") {
          return new KubernetesError(
            parsedBody.message || "Unknown Kubernetes API error",
            errorCode,
            parsedBody.reason,
            parsedBody.details,
          );
        }

        // If body is missing or not parseable, use errorCode with generic message
        return new KubernetesError("Kubernetes API error", errorCode);
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      return new KubernetesError(error.message, 500);
    }

    return new KubernetesError("Unknown error", 500);
  }
}

/**
 * Error for connection failures
 */
export class ConnectionError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "ConnectionError";
    this.cause = cause;
  }
}

/**
 * Error for exec/shell command failures
 */
export class ExecError extends Error {
  readonly exitCode: number;
  readonly stderr: string;

  constructor(message: string, exitCode: number, stderr: string = "") {
    super(message);
    this.name = "ExecError";
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Error for watch stream failures
 */
export class WatchError extends Error {
  readonly cause?: Error;
  readonly resourceVersion?: string;

  constructor(message: string, cause?: Error, resourceVersion?: string) {
    super(message);
    this.name = "WatchError";
    this.cause = cause;
    this.resourceVersion = resourceVersion;
  }
}
