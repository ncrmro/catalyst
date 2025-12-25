"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

/**
 * Props for the improved Terminal component
 */
export interface ImprovedTerminalProps {
  /** Namespace of the pod */
  namespace: string;
  /** Name of the pod */
  podName: string;
  /** Container name (optional) */
  containerName?: string;
  /** CSS class for the container */
  className?: string;
  /** WebSocket mode (true) or request/response mode (false) */
  useWebSocket?: boolean;
  /** Execute command callback (used in request/response mode) */
  onExec?: (command: string) => Promise<{ stdout: string; stderr: string }>;
  /** Close callback */
  onClose?: () => void;
}

/**
 * Improved Terminal component using xterm.js directly
 *
 * Supports both WebSocket mode (for real-time interactive shells)
 * and request/response mode (for command-by-command execution).
 */
export function ImprovedTerminal({
  namespace,
  podName,
  containerName,
  className = "",
  useWebSocket = false,
  onExec,
  onClose,
}: ImprovedTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const commandBufferRef = useRef("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#aeafad",
        selectionBackground: "#264f78",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      rows: 24,
      cols: 80,
      scrollback: 1000,
      convertEol: true,
    });

    terminal.open(terminalRef.current);
    xtermRef.current = terminal;

    // Auto-fit terminal to container
    const fitTerminal = () => {
      if (terminalRef.current && terminal) {
        const parent = terminalRef.current.parentElement;
        if (parent) {
          const dims = {
            cols: Math.floor((parent.clientWidth - 20) / 9), // Approximate char width
            rows: Math.floor((parent.clientHeight - 20) / 17), // Approximate char height
          };
          terminal.resize(dims.cols, dims.rows);
        }
      }
    };

    fitTerminal();
    window.addEventListener("resize", fitTerminal);

    return () => {
      window.removeEventListener("resize", fitTerminal);
      terminal.dispose();
      xtermRef.current = null;
    };
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!useWebSocket || !xtermRef.current) return;

    const terminal = xtermRef.current;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/terminal?namespace=${namespace}&pod=${podName}${containerName ? `&container=${containerName}` : ""}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);
        terminal.writeln(
          `\x1b[32m✓ Connected to ${namespace}/${podName}${containerName ? ` (${containerName})` : ""}\x1b[0m`,
        );
        terminal.writeln("");
      };

      ws.onmessage = (event) => {
        try {
          // Check if message is JSON (control message)
          if (event.data.startsWith("{")) {
            const message = JSON.parse(event.data);

            if (message.type === "error") {
              terminal.writeln(`\x1b[31mError: ${message.message}\x1b[0m`);
              setError(message.message);
            } else if (message.type === "close") {
              terminal.writeln(
                `\x1b[33m\nShell exited with code ${message.exitCode}\x1b[0m`,
              );
              setIsConnected(false);
            } else if (message.type === "ready") {
              // Ready message handled in onopen
            }
          } else {
            // Regular terminal output
            terminal.write(event.data);
          }
        } catch {
          // Not JSON, write as regular output
          terminal.write(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("WebSocket connection error");
        terminal.writeln("\x1b[31m✗ Connection error\x1b[0m");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setIsConnected(false);
        terminal.writeln("\x1b[33m\nConnection closed\x1b[0m");
      };

      // Send terminal input to WebSocket
      const disposable = terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Send resize events
      const resizeObserver = new ResizeObserver(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "resize",
              cols: terminal.cols,
              rows: terminal.rows,
            }),
          );
        }
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => {
        disposable.dispose();
        resizeObserver.disconnect();
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError("Failed to establish connection");
      terminal.writeln("\x1b[31m✗ Failed to connect\x1b[0m");
    }
  }, [useWebSocket, namespace, podName, containerName]);

  // Request/response mode (fallback)
  const executeCommand = useCallback(
    async (command: string) => {
      if (!xtermRef.current || !onExec) return;

      const terminal = xtermRef.current;
      setIsLoading(true);

      try {
        const result = await onExec(command);

        if (result.stdout) {
          result.stdout.split("\n").forEach((line) => {
            terminal.writeln(line);
          });
        }

        if (result.stderr) {
          terminal.writeln(`\x1b[31m${result.stderr}\x1b[0m`);
        }
      } catch (error) {
        terminal.writeln(
          `\x1b[31mError: ${error instanceof Error ? error.message : "Command failed"}\x1b[0m`,
        );
      } finally {
        setIsLoading(false);
        terminal.write(`${namespace}/${podName}$ `);
      }
    },
    [namespace, podName, onExec],
  );

  // Request/response mode input handling
  useEffect(() => {
    if (useWebSocket || !xtermRef.current) return;

    const terminal = xtermRef.current;
    const prompt = `${namespace}/${podName}$ `;

    // Welcome message
    terminal.writeln(
      `\x1b[32mConnected to ${namespace}/${podName}${containerName ? ` (${containerName})` : ""}\x1b[0m`,
    );
    terminal.writeln(
      "\x1b[33mNote: Command-by-command mode. Type a command and press Enter.\x1b[0m",
    );
    terminal.writeln("");
    terminal.write(prompt);

    const disposable = terminal.onData((data) => {
      const charCode = data.charCodeAt(0);

      if (charCode === 13) {
        // Enter
        terminal.writeln("");
        if (commandBufferRef.current.trim()) {
          executeCommand(commandBufferRef.current.trim());
        } else {
          terminal.write(prompt);
        }
        commandBufferRef.current = "";
      } else if (charCode === 127 || charCode === 8) {
        // Backspace
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (charCode === 3) {
        // Ctrl+C
        terminal.writeln("^C");
        commandBufferRef.current = "";
        terminal.write(prompt);
      } else if (charCode === 4) {
        // Ctrl+D
        onClose?.();
      } else if (charCode >= 32) {
        // Printable
        commandBufferRef.current += data;
        terminal.write(data);
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [
    useWebSocket,
    namespace,
    podName,
    containerName,
    executeCommand,
    onClose,
  ]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={terminalRef}
        className="h-full w-full min-h-[400px] bg-[#1e1e1e] rounded-lg overflow-hidden p-2"
      />
      {isLoading && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
          Running...
        </div>
      )}
      {useWebSocket && isConnected && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded flex items-center gap-1">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          Connected
        </div>
      )}
      {error && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Terminal modal component
 */
export interface ImprovedTerminalModalProps
  extends Omit<ImprovedTerminalProps, "className"> {
  isOpen: boolean;
  onClose: () => void;
}

export function ImprovedTerminalModal({
  isOpen,
  onClose,
  ...terminalProps
}: ImprovedTerminalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-6xl mx-4 h-[80vh]">
        <div className="bg-surface rounded-lg shadow-xl border border-outline/50 overflow-hidden h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface-variant border-b border-outline/50 shrink-0">
            <h3 className="text-sm font-medium text-on-surface">
              Terminal - {terminalProps.namespace}/{terminalProps.podName}
              {terminalProps.containerName
                ? ` (${terminalProps.containerName})`
                : ""}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface rounded transition-colors"
            >
              <svg
                className="w-5 h-5 text-on-surface-variant"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Terminal */}
          <div className="flex-1 overflow-hidden">
            <ImprovedTerminal
              {...terminalProps}
              onClose={onClose}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
