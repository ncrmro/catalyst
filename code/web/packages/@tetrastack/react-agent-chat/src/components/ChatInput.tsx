"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";

export interface ChatInputProps {
  /** Callback when user submits a message */
  onSubmit: (message: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled (e.g., while agent is responding) */
  disabled?: boolean;
  /** Whether to allow multi-line input */
  multiline?: boolean;
  /** Maximum rows for multiline textarea */
  maxRows?: number;
  /** Container className */
  className?: string;
  /** Input/textarea className */
  inputClassName?: string;
  /** Submit button className */
  buttonClassName?: string;
}

/**
 * Chat input component with submit button
 *
 * Supports both single-line input and multi-line textarea modes.
 * Enter submits (Shift+Enter for newline in multiline mode).
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSubmit={(msg) => sendMessage(msg)}
 *   placeholder="Type a message..."
 *   disabled={isLoading}
 *   multiline
 * />
 * ```
 */
export function ChatInput({
  onSubmit,
  placeholder = "Type a message...",
  disabled = false,
  multiline = false,
  maxRows = 5,
  className,
  inputClassName,
  buttonClassName,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSubmit(trimmed);
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (multiline && e.shiftKey) {
          // Allow newline in multiline mode with Shift+Enter
          return;
        }
        e.preventDefault();
        handleSubmit();
      }
    },
    [multiline, handleSubmit],
  );

  // Auto-resize textarea
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);

      // Auto-resize
      const textarea = e.target;
      textarea.style.height = "auto";
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const maxHeight = lineHeight * maxRows;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    },
    [maxRows],
  );

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <div data-chat-input className={className}>
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          data-input-field
          data-multiline
          aria-label="Message input"
          className={inputClassName}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          data-input-field
          aria-label="Message input"
          className={inputClassName}
        />
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        data-submit-button
        aria-label="Send message"
        className={buttonClassName}
      >
        <SendIcon />
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      data-send-icon
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
