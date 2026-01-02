"use client";

import type { ReactNode } from "react";

export interface MessageBubbleProps {
  /** Message role */
  role: "user" | "assistant";
  /** Message content */
  children: ReactNode;
  /** Optional timestamp */
  timestamp?: Date;
  /** Whether message is still streaming */
  isStreaming?: boolean;
  /** Container className */
  className?: string;
  /** Content wrapper className */
  contentClassName?: string;
  /** Timestamp className */
  timestampClassName?: string;
}

/**
 * Single message bubble component
 *
 * Renders a message with role-based styling via data attributes.
 * Consumers provide CSS for styling.
 *
 * @example
 * ```tsx
 * <MessageBubble role="user">
 *   Hello, can you help me?
 * </MessageBubble>
 *
 * <MessageBubble role="assistant" isStreaming>
 *   <TextPart text={part.text} />
 * </MessageBubble>
 * ```
 */
export function MessageBubble({
  role,
  children,
  timestamp,
  isStreaming = false,
  className,
  contentClassName,
  timestampClassName,
}: MessageBubbleProps) {
  return (
    <div
      data-message-bubble
      data-role={role}
      data-streaming={isStreaming}
      className={className}
    >
      <div data-message-content className={contentClassName}>
        {children}
      </div>
      {timestamp && (
        <time
          data-message-timestamp
          dateTime={timestamp.toISOString()}
          className={timestampClassName}
        >
          {formatTime(timestamp)}
        </time>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
