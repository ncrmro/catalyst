"use client";

import { useRef, useEffect, type ReactNode } from "react";

export interface MessageListProps {
  /** Message elements to render */
  children: ReactNode;
  /** Whether to auto-scroll to bottom on new messages */
  autoScroll?: boolean;
  /** Whether to scroll into view on initial mount (default: false) */
  scrollOnMount?: boolean;
  /** Container className */
  className?: string;
}

/**
 * Scrollable message list container
 *
 * Handles auto-scrolling to bottom when new messages arrive.
 * Uses IntersectionObserver for smart scroll behavior.
 *
 * @example
 * ```tsx
 * <MessageList autoScroll>
 *   {messages.map(msg => (
 *     <MessageBubble key={msg.id} role={msg.role}>
 *       {msg.content}
 *     </MessageBubble>
 *   ))}
 * </MessageList>
 * ```
 */
export function MessageList({
  children,
  autoScroll = true,
  scrollOnMount = false,
  className,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track if user is near bottom of scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Consider "near bottom" if within 100px
      isNearBottomRef.current = distanceFromBottom < 100;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll when children change (new messages)
  // Only scroll if both autoScroll AND scrollOnMount are enabled
  useEffect(() => {
    if (!scrollOnMount) return; // Disable all scrolling when scrollOnMount is false

    if (autoScroll && isNearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [children, autoScroll, scrollOnMount]);

  return (
    <div
      ref={containerRef}
      data-message-list
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className={className}
    >
      {children}
      <div ref={bottomRef} data-scroll-anchor aria-hidden="true" />
    </div>
  );
}
