"use client";

import dynamic from "next/dynamic";

// Re-export types for consumers
export type {
  ImprovedTerminalProps,
  ImprovedTerminalModalProps,
} from "./improved-terminal";

// Dynamic import with SSR disabled - xterm.js accesses document at module level
export const ImprovedTerminal = dynamic(
  () =>
    import("./improved-terminal").then((mod) => mod.ImprovedTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[400px] bg-[#1e1e1e] rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          <span className="text-gray-400">Loading terminal...</span>
        </div>
      </div>
    ),
  },
);

export const ImprovedTerminalModal = dynamic(
  () =>
    import("./improved-terminal").then((mod) => mod.ImprovedTerminalModal),
  {
    ssr: false,
    loading: () => null,
  },
);
