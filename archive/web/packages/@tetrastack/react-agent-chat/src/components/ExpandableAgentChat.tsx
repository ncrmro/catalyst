"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { MessageBubble } from "./MessageBubble";
import type { AgentMessage } from "../types";
import { getMessageText } from "../utils";

export interface SpecContext {
  specSlug: string;
  projectSlug: string;
  repoSlug?: string;
}

export interface ExpandableAgentChatProps {
  /** Context for the agent (e.g., spec info) */
  context?: SpecContext;
  /** Whether chat is expanded by default */
  defaultExpanded?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Callback when user submits a message */
  onSubmit?: (message: string, context?: SpecContext) => void;
  /** Current messages to display */
  messages?: AgentMessage[];
  /** Whether the agent is currently responding */
  isLoading?: boolean;
  /** Container className */
  className?: string;
  /** Input container className */
  inputContainerClassName?: string;
  /** Messages container className */
  messagesClassName?: string;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
}

/**
 * Expandable chat component that shows a collapsed input by default
 * and expands downward to show message history.
 *
 * @example
 * ```tsx
 * <ExpandableAgentChat
 *   context={{ specSlug: "009-projects", projectSlug: "catalyst" }}
 *   placeholder="Ask about this spec..."
 *   autoFocus
 *   onSubmit={(msg, ctx) => sendToAgent(msg, ctx)}
 * />
 * ```
 */
export function ExpandableAgentChat({
  context,
  defaultExpanded = false,
  placeholder = "Ask about this spec...",
  onSubmit,
  messages = [],
  isLoading = false,
  className,
  inputContainerClassName,
  messagesClassName,
  autoFocus: _autoFocus = false,
}: ExpandableAgentChatProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [localMessages, setLocalMessages] = useState<AgentMessage[]>(messages);
  const inputRef = useRef<HTMLDivElement>(null);

  // Sync external messages
  useEffect(() => {
    setLocalMessages(messages);
    // Auto-expand when there are messages
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages]);

  const handleSubmit = useCallback(
    (content: string) => {
      // Add user message locally
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: content }],
      };
      setLocalMessages((prev) => [...prev, userMessage]);
      setIsExpanded(true);

      // Call external handler
      onSubmit?.(content, context);
    },
    [context, onSubmit],
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const hasMessages = localMessages.length > 0;

  return (
    <div
      data-expandable-agent-chat
      data-expanded={isExpanded}
      className={className}
    >
      {/* Collapsed Header / Toggle Bar */}
      <div
        data-chat-header
        className="flex items-center gap-2 cursor-pointer"
        onClick={hasMessages ? toggleExpanded : undefined}
      >
        <AgentIcon />
        <span data-chat-title className="text-sm font-medium flex-1">
          {context?.specSlug ? `Chat about ${context.specSlug}` : "Agent Chat"}
        </span>
        {hasMessages && (
          <button
            type="button"
            data-toggle-button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
            aria-expanded={isExpanded}
          >
            <ChevronIcon direction={isExpanded ? "up" : "down"} />
          </button>
        )}
      </div>

      {/* Expandable Messages Area */}
      {isExpanded && hasMessages && (
        <div data-messages-container className={messagesClassName}>
          <MessageList autoScroll scrollOnMount={false}>
            {localMessages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  data-message
                  data-role={message.role}
                  className={isAssistant ? "justify-start" : "justify-end"}
                >
                  {isAssistant && (
                    <div data-avatar data-role="assistant">
                      <AgentIcon small />
                    </div>
                  )}
                  <MessageBubble
                    role={
                      message.role === "system" ? "assistant" : message.role
                    }
                    data-bubble
                  >
                    <div data-message-text>{getMessageText(message)}</div>
                  </MessageBubble>
                  {!isAssistant && message.role === "user" && (
                    <div data-avatar data-role="user">
                      <UserIcon />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div data-message data-role="assistant" data-loading>
                <div data-avatar data-role="assistant">
                  <AgentIcon small />
                </div>
                <div data-typing-indicator>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </MessageList>
        </div>
      )}

      {/* Chat Input */}
      <div
        ref={inputRef}
        data-input-container
        className={inputContainerClassName}
      >
        <ChatInput
          onSubmit={handleSubmit}
          placeholder={placeholder}
          disabled={isLoading}
          multiline
          maxRows={3}
        />
      </div>
    </div>
  );
}

function AgentIcon({ small = false }: { small?: boolean }) {
  const size = small ? "w-4 h-4" : "w-5 h-5";
  return (
    <svg
      data-agent-icon
      className={size}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      data-user-icon
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      data-chevron-icon
      data-direction={direction}
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {direction === "up" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      )}
    </svg>
  );
}
