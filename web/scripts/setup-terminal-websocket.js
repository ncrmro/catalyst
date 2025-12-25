#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up terminal WebSocket support...');

// Step 1: Create terminal API directory
const terminalDir = path.join(__dirname, '../src/app/api/terminal');
console.log('Creating directory:', terminalDir);
fs.mkdirSync(terminalDir, { recursive: true });

// Step 2: Create the WebSocket route file
const routeContent = `/**
 * WebSocket Terminal API Route
 *
 * Provides WebSocket-based terminal access to pod containers.
 * Uses next-ws for WebSocket support.
 */

import { WebSocket } from "ws";
import { NextRequest } from "next/server";
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
 * 
 * Uses next-ws SOCKET export pattern
 */
export const SOCKET = {
  async open(ws: WebSocket, request: NextRequest) {
    console.log("New WebSocket terminal connection");

    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      ws.close(1008, "Not authenticated");
      return;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace");
    const podName = searchParams.get("pod");
    const containerName = searchParams.get("container") || undefined;
    const shell = searchParams.get("shell") || "/bin/sh";

    if (!namespace || !podName) {
      ws.close(1008, "Missing required parameters: namespace and pod");
      return;
    }

    // TODO: Add authorization check - verify user has access to this namespace/pod

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
      (ws as any)._shellSessionId = shellSession.id;

      console.log(
        \`Shell session created: \${shellSession.id} for \${namespace}/\${podName}\`,
      );

      // Forward data from shell to WebSocket client
      shellSession.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle shell errors
      shellSession.onError((error: Error) => {
        console.error("Shell error:", error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
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
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "close",
              exitCode,
            }),
          );
          ws.close(1000, \`Shell exited with code \${exitCode}\`);
        }
        activeSessions.delete(shellSession!.id);
      });

      // Send ready message
      ws.send(
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

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: errorMessage,
          }),
        );
      }

      ws.close(1011, "Internal server error");

      // Clean up session if it was created
      if (shellSession?.isActive()) {
        await shellSession.close();
        activeSessions.delete(shellSession.id);
      }
    }
  },

  message(ws: WebSocket, msg: Buffer | string) {
    const sessionId = (ws as any)._shellSessionId;
    if (!sessionId) return;

    const shellSession = activeSessions.get(sessionId);
    if (!shellSession?.isActive()) return;

    try {
      const message = msg.toString();

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
  },

  async close(ws: WebSocket) {
    const sessionId = (ws as any)._shellSessionId;
    if (!sessionId) return;

    console.log("WebSocket client disconnected");
    const shellSession = activeSessions.get(sessionId);
    if (shellSession?.isActive()) {
      await shellSession.close();
      activeSessions.delete(sessionId);
    }
  },

  error(ws: WebSocket, error: Error) {
    console.error("WebSocket error:", error);
    const sessionId = (ws as any)._shellSessionId;
    if (sessionId) {
      const shellSession = activeSessions.get(sessionId);
      if (shellSession?.isActive()) {
        shellSession.close();
        activeSessions.delete(sessionId);
      }
    }
  },
};
`;

const routeFile = path.join(terminalDir, 'route.ts');
console.log('Creating route file:', routeFile);
fs.writeFileSync(routeFile, routeContent);

// Step 3: Run next-ws patch
console.log('Running next-ws patch...');
try {
  execSync('npx next-ws patch', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✓ next-ws patched successfully');
} catch (error) {
  console.error('Failed to run next-ws patch:', error.message);
  console.log('You may need to run: npm run prepare or npx next-ws patch manually');
}

console.log('\n✓ Terminal WebSocket support setup complete!');
console.log('Files created:');
console.log('  -', routeFile);
