#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../../src/app/api');
const terminalDir = path.join(apiDir, 'terminal');
const routeFile = path.join(terminalDir, 'route.ts');

// Create directory
fs.mkdirSync(terminalDir, { recursive: true });

// Create route file
const routeContent = `/**
 * WebSocket Terminal API Route
 *
 * Provides WebSocket-based terminal access to pod containers.
 * Uses the SOCKET export from next-ws for WebSocket support.
 */

import { NextRequest } from "next/server";
import { WebSocket } from "ws";
import { auth } from "@/auth";
import {
  createShellSession,
  getClusterConfig,
  type ShellSession,
} from "@catalyst/kubernetes-client";

// Active sessions map
const activeSessions = new Map<string, ShellSession>();

// Clean up old sessions periodically
setInterval(() => {
  for (const [id, session] of activeSessions.entries()) {
    if (!session.isActive()) {
      activeSessions.delete(id);
    }
  }
}, 60000); // Every minute

/**
 * WebSocket handler for terminal connections
 */
export async function SOCKET(client: WebSocket, request: NextRequest) {
  console.log("New WebSocket terminal connection");

  // Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    client.close(1008, "Not authenticated");
    return;
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const namespace = searchParams.get("namespace");
  const podName = searchParams.get("pod");
  const containerName = searchParams.get("container") || undefined;
  const shell = searchParams.get("shell") || "/bin/sh";

  if (!namespace || !podName) {
    client.close(1008, "Missing required parameters: namespace and pod");
    return;
  }

  // TODO: Add authorization check - verify user has access to this namespace/pod
  // This could check team membership against project/environment ownership

  let shellSession: ShellSession | null = null;

  try {
    const kubeConfig = await getClusterConfig();

    // Create shell session
    shellSession = await createShellSession(kubeConfig, {
      namespace,
      pod: podName,
      container: containerName,
      shell,
      initialSize: { cols: 80, rows: 24 },
    });

    // Track active session
    activeSessions.set(shellSession.id, shellSession);

    console.log(
      \`Shell session created: \${shellSession.id} for \${namespace}/\${podName}\`,
    );

    // Forward data from shell to WebSocket client
    shellSession.onData((data: string) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });

    // Handle shell errors
    shellSession.onError((error: Error) => {
      console.error("Shell error:", error);
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "error",
            message: error.message,
          }),
        );
      }
    });

    // Handle shell close
    shellSession.onClose((exitCode: number) => {
      console.log(\`Shell session closed with exit code \${exitCode}\`);
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "close",
            exitCode,
          }),
        );
        client.close(1000, \`Shell exited with code \${exitCode}\`);
      }
      if (shellSession) {
        activeSessions.delete(shellSession.id);
      }
    });

    // Forward data from WebSocket client to shell
    client.on("message", (data) => {
      if (!shellSession?.isActive()) return;

      try {
        const message = data.toString();

        // Check if this is a control message
        if (message.startsWith("{")) {
          try {
            const parsed = JSON.parse(message);

            // Handle resize messages
            if (parsed.type === "resize" && parsed.cols && parsed.rows) {
              shellSession.resize(parsed.cols, parsed.rows);
              return;
            }
          } catch {
            // Not JSON, treat as regular input
          }
        }

        // Send as input to shell
        shellSession.write(message);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    // Handle client disconnect
    client.on("close", async () => {
      console.log("WebSocket client disconnected");
      if (shellSession?.isActive()) {
        await shellSession.close();
        activeSessions.delete(shellSession.id);
      }
    });

    // Send ready message
    client.send(
      JSON.stringify({
        type: "ready",
        namespace,
        pod: podName,
        container: containerName,
      }),
    );
  } catch (error) {
    console.error("Failed to create shell session:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create shell session";

    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "error",
          message: errorMessage,
        }),
      );
    }

    client.close(1011, "Internal server error");

    // Clean up session if it was created
    if (shellSession?.isActive()) {
      await shellSession.close();
      activeSessions.delete(shellSession.id);
    }
  }
}
`;

fs.writeFileSync(routeFile, routeContent);
console.log('Terminal WebSocket route created:', routeFile);
