"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Terminal as XTerminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";

/**
 * Props for the Terminal component
 */
export interface TerminalProps {
  /** Namespace of the pod */
  namespace: string;
  /** Name of the pod */
  podName: string;
  /** Container name (optional) */
  containerName?: string;
  /** Execute command callback */
  onExec: (command: string) => Promise<{ stdout: string; stderr: string }>;
  /** Close callback */
  onClose?: () => void;
  /** CSS class for the container */
  className?: string;
}

/**
 * Terminal component using xterm.js
 *
 * Note: Due to Next.js 15 not supporting WebSocket route handlers,
 * this terminal uses a request/response model via server actions
 * rather than a true interactive shell.
 */
export function Terminal({
  namespace,
  podName,
  containerName,
  onExec,
  onClose,
  className = "",
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [commandBuffer, setCommandBuffer] = useState("");
  const promptRef = useRef<string>(`${namespace}/${podName}$ `);

  // Initialize terminal
  useEffect(() => {
    let terminal: XTerminal | null = null;
    let fitAddon: FitAddon | null = null;

    const initTerminal = async () => {
      // Dynamically import xterm.js to avoid SSR issues
      const { Terminal: XTerm } = await import("@xterm/xterm");
      const { FitAddon: Fit } = await import("@xterm/addon-fit");

      // Import CSS - ignore TypeScript error for CSS module import
      // @ts-expect-error - CSS import works at runtime
      await import("@xterm/xterm/css/xterm.css");

      if (!terminalRef.current) return;

      terminal = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#aeafad",
          selectionBackground: "#264f78",
        },
        rows: 24,
        cols: 80,
      });

      fitAddon = new Fit();
      terminal.loadAddon(fitAddon);

      terminal.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Write welcome message
      terminal.writeln(
        `\x1b[32mConnected to ${namespace}/${podName}${containerName ? ` (${containerName})` : ""}\x1b[0m`,
      );
      terminal.writeln(
        "\x1b[33mNote: This is a command-by-command terminal. Type a command and press Enter.\x1b[0m",
      );
      terminal.writeln("");
      terminal.write(promptRef.current);

      // Handle input
      terminal.onData(handleData);
    };

    initTerminal();

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (terminal) {
        terminal.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, podName, containerName]);

  // Handle terminal data input
  const handleData = useCallback(
    (data: string) => {
      const term = xtermRef.current;
      if (!term) return;

      // Handle special keys
      const charCode = data.charCodeAt(0);

      if (charCode === 13) {
        // Enter key
        term.writeln("");
        if (commandBuffer.trim()) {
          executeCommand(commandBuffer.trim());
        } else {
          term.write(promptRef.current);
        }
        setCommandBuffer("");
      } else if (charCode === 127 || charCode === 8) {
        // Backspace
        if (commandBuffer.length > 0) {
          setCommandBuffer((prev) => prev.slice(0, -1));
          term.write("\b \b");
        }
      } else if (charCode === 3) {
        // Ctrl+C
        term.writeln("^C");
        setCommandBuffer("");
        term.write(promptRef.current);
      } else if (charCode === 4) {
        // Ctrl+D
        onClose?.();
      } else if (charCode >= 32) {
        // Printable characters
        setCommandBuffer((prev) => prev + data);
        term.write(data);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commandBuffer, onClose],
  );

  // Execute command
  const executeCommand = async (command: string) => {
    const term = xtermRef.current;
    if (!term || isLoading) return;

    setIsLoading(true);

    try {
      const result = await onExec(command);

      // Write output
      if (result.stdout) {
        result.stdout.split("\n").forEach((line) => {
          term.writeln(line);
        });
      }

      if (result.stderr) {
        term.writeln(`\x1b[31m${result.stderr}\x1b[0m`);
      }
    } catch (error) {
      term.writeln(
        `\x1b[31mError: ${error instanceof Error ? error.message : "Command failed"}\x1b[0m`,
      );
    } finally {
      setIsLoading(false);
      term.write(promptRef.current);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={terminalRef}
        className="h-full w-full min-h-[400px] bg-[#1e1e1e] rounded-lg overflow-hidden"
      />
      {isLoading && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
          Running...
        </div>
      )}
    </div>
  );
}

/**
 * Terminal modal component
 */
export interface TerminalModalProps extends Omit<TerminalProps, "className"> {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalModal({
  isOpen,
  onClose,
  ...terminalProps
}: TerminalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className="bg-surface rounded-lg shadow-xl border border-outline/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface-variant border-b border-outline/50">
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
          <Terminal
            {...terminalProps}
            onClose={onClose}
            className="h-[500px]"
          />
        </div>
      </div>
    </div>
  );
}
