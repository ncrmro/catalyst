"use client";

import dynamic from "next/dynamic";

// Re-export types for consumers
export type { TerminalProps, TerminalModalProps } from "./terminal-client";

// Dynamic import with SSR disabled - react-xtermjs accesses document at module level
export const Terminal = dynamic(
  () => import("./terminal-client").then((mod) => mod.Terminal),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[400px] bg-[#1e1e1e] rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Loading terminal...</span>
      </div>
    ),
  },
);

export const TerminalModal = dynamic(
  () => import("./terminal-client").then((mod) => mod.TerminalModal),
  {
    ssr: false,
    loading: () => null,
  },
);
