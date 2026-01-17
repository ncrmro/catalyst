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

    // Handle @kubernetes/client-node HttpError with message format:
    // "HTTP-Code: 404\nMessage: ...\nBody: {...}"
    if (error && typeof error === "object" && "message" in error) {
      const errorMessage = (error as { message?: string }).message;
      if (typeof errorMessage === "string") {
        // Extract HTTP code from message
        const codeMatch = errorMessage.match(/HTTP-Code:\s*(\d+)/);
        if (codeMatch) {
          const code = parseInt(codeMatch[1], 10);
          
          // Try to extract and parse the JSON body
          // Match Body: "..." where ... is the escaped JSON, ending at newline or end of string
          const bodyMatch = errorMessage.match(/Body:\s*"(.+?)"\s*\n/s);
          if (bodyMatch) {
            try {
              // The body is escaped JSON, need to unescape it
              const bodyStr = bodyMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
              const body = JSON.parse(bodyStr);
              
              return new KubernetesError(
                body.message || "Unknown Kubernetes API error",
                code,
                body.reason,
                body.details,
              );
            } catch {
              // If JSON parsing fails, extract message from the error text
              const msgMatch = errorMessage.match(/Message:\s*(.+?)(?:\n|$)/);
              return new KubernetesError(
                msgMatch?.[1] || errorMessage,
                code,
              );
            }
          }
          
          // If no body, just use the code and message
          const msgMatch = errorMessage.match(/Message:\s*(.+?)(?:\n|$)/);
          return new KubernetesError(
            msgMatch?.[1] || errorMessage,
            code,
          );
        }
      }
    }

    // Handle @kubernetes/client-node HttpError format (older/alternative format)
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object"
    ) {
      const response = error.response as {
        statusCode?: number;
        body?: { message?: string; reason?: string };
      };
      const statusCode = response.statusCode || 500;
      const body = response.body || {};
      return new KubernetesError(
        body.message || "Unknown Kubernetes API error",
        statusCode,
        body.reason,
      );
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
