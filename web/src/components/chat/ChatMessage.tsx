"use client";

import type { ChatMessageProps } from "./types";

export function ChatMessage({ message }: ChatMessageProps) {
  const isAgent = message.role === "agent";

  return (
    <div className={`flex gap-3 ${isAgent ? "justify-start" : "justify-end"}`}>
      {isAgent && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isAgent
            ? "bg-surface-variant text-on-surface"
            : "bg-primary text-on-primary"
        }`}
      >
        {typeof message.content === "string" ? (
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        ) : (
          message.content
        )}
        {message.timestamp && (
          <div
            className={`text-xs mt-2 ${
              isAgent ? "text-on-surface-variant" : "text-on-primary/70"
            }`}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
      {!isAgent && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
