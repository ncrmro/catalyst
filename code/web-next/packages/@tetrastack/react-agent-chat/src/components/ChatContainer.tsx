"use client";

import type { ReactNode } from "react";

export interface ChatContainerProps {
  /** Chat content (typically MessageList and ChatInput) */
  children: ReactNode;
  /** Optional header content */
  header?: ReactNode;
  /** Container className */
  className?: string;
  /** Header className */
  headerClassName?: string;
  /** Body className (wraps children) */
  bodyClassName?: string;
}

/**
 * Main chat container layout component
 *
 * Provides a flex column layout with optional header.
 * Consumers provide CSS for styling.
 *
 * @example
 * ```tsx
 * <ChatContainer
 *   header={<AgentHeader name="Routing Agent" />}
 * >
 *   <MessageList>
 *     {messages.map(...)}
 *   </MessageList>
 *   <ChatInput onSubmit={sendMessage} />
 * </ChatContainer>
 * ```
 */
export function ChatContainer({
  children,
  header,
  className,
  headerClassName,
  bodyClassName,
}: ChatContainerProps) {
  return (
    <div data-chat-container className={className}>
      {header && (
        <div data-chat-header className={headerClassName}>
          {header}
        </div>
      )}
      <div data-chat-body className={bodyClassName}>
        {children}
      </div>
    </div>
  );
}
