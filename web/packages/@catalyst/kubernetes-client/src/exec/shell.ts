/**
 * Interactive shell sessions
 *
 * Provides bidirectional terminal access to pod containers.
 */

import type { KubeConfig } from "../config";
import { ConnectionError } from "../errors";
import { loadKubernetesClient } from "../loader";

/**
 * Terminal dimensions
 */
export interface TerminalSize {
  cols: number;
  rows: number;
}

/**
 * Options for creating a shell session
 */
export interface ShellOptions {
  /** Namespace of the pod */
  namespace: string;
  /** Name of the pod */
  pod: string;
  /** Container name (required if pod has multiple containers) */
  container?: string;
  /** Shell to use (default: /bin/sh) */
  shell?: string;
  /** Initial terminal size */
  initialSize?: TerminalSize;
}

/**
 * Interactive shell session handle
 */
export interface ShellSession {
  /** Unique session ID */
  readonly id: string;

  /** Write data to the shell stdin */
  write(data: string | Uint8Array): void;

  /** Resize the terminal */
  resize(cols: number, rows: number): void;

  /** Close the shell session */
  close(): Promise<void>;

  /** Register callback for stdout/stderr data */
  onData(callback: (data: string) => void): void;

  /** Register callback for errors */
  onError(callback: (error: Error) => void): void;

  /** Register callback for session close */
  onClose(callback: (exitCode: number) => void): void;

  /** Check if session is active */
  isActive(): boolean;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `shell-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an interactive shell session in a pod container
 */
export async function createShellSession(
  kubeConfig: KubeConfig,
  options: ShellOptions,
): Promise<ShellSession> {
  const k8s = await loadKubernetesClient();
  const execClient = new k8s.Exec(kubeConfig.getRawConfig());

  const {
    namespace,
    pod,
    container,
    shell = "/bin/sh",
    initialSize = { cols: 80, rows: 24 },
  } = options;

  const sessionId = generateSessionId();
  let active = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webSocket: any = null;

  // Callbacks
  let dataCallback: ((data: string) => void) | null = null;
  let _errorCallback: ((error: Error) => void) | null = null;
  let closeCallback: ((exitCode: number) => void) | null = null;

  // Create passthrough streams for bidirectional communication
  const { PassThrough } = await import("stream");
  const stdinStream = new PassThrough();
  const stdoutStream = new PassThrough();

  // Handle stdout data
  stdoutStream.on("data", (chunk: Buffer) => {
    if (active && dataCallback) {
      dataCallback(chunk.toString());
    }
  });

  // Start the exec session with TTY
  try {
    webSocket = await execClient.exec(
      namespace,
      pod,
      container || "",
      [shell],
      stdoutStream, // stdout
      stdoutStream, // stderr (merge into stdout for TTY)
      stdinStream, // stdin
      true, // tty
      (status) => {
        active = false;
        let exitCode = 0;
        if (status.status !== "Success") {
          const match = status.message?.match(/exit code (\d+)/i);
          exitCode = match ? parseInt(match[1], 10) : 1;
        }
        closeCallback?.(exitCode);
      },
    );

    // Send initial terminal size
    if (webSocket && initialSize) {
      sendResize(webSocket, initialSize.cols, initialSize.rows);
    }
  } catch (error) {
    active = false;
    throw new ConnectionError(
      `Failed to create shell session: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined,
    );
  }

  return {
    id: sessionId,

    write(data: string | Uint8Array): void {
      if (!active) return;

      if (typeof data === "string") {
        stdinStream.write(data);
      } else {
        stdinStream.write(Buffer.from(data));
      }
    },

    resize(cols: number, rows: number): void {
      if (!active || !webSocket) return;
      sendResize(webSocket, cols, rows);
    },

    async close(): Promise<void> {
      if (!active) return;

      active = false;
      stdinStream.end();

      if (webSocket && typeof webSocket.close === "function") {
        webSocket.close();
      }
    },

    onData(callback: (data: string) => void): void {
      dataCallback = callback;
    },

    onError(callback: (error: Error) => void): void {
      _errorCallback = callback;

      // Also attach to streams
      stdinStream.on("error", callback);
      stdoutStream.on("error", callback);
    },

    onClose(callback: (exitCode: number) => void): void {
      closeCallback = callback;
    },

    isActive(): boolean {
      return active;
    },
  };
}

/**
 * Send a terminal resize message over the WebSocket
 *
 * K8s exec protocol uses channel 4 for resize messages.
 * Format: JSON { Width: number, Height: number }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendResize(ws: any, cols: number, rows: number): void {
  try {
    // K8s uses SPDY-style multiplexing
    // Channel 4 is the resize channel
    const resizeMessage = JSON.stringify({ Width: cols, Height: rows });

    // The message format depends on the WebSocket implementation
    // For @kubernetes/client-node, we need to send on channel 4
    if (typeof ws.send === "function") {
      // Create a buffer with channel prefix
      const channelByte = Buffer.alloc(1);
      channelByte.writeUInt8(4, 0); // Channel 4 for resize

      const messageBuffer = Buffer.from(resizeMessage);
      const fullMessage = Buffer.concat([channelByte, messageBuffer]);

      ws.send(fullMessage);
    }
  } catch (error) {
    console.warn("Failed to send resize message:", error);
  }
}
