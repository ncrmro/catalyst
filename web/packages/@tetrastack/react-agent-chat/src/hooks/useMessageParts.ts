"use client";

import { useMemo } from "react";
import type {
  AgentMessage,
  MessagePart,
  TextPart,
  DynamicToolPart,
} from "../types";
import {
  isTextPart,
  isToolPart,
  getToolState,
  getToolCallId,
  getToolInput,
} from "../utils";

/**
 * Extracted text content from a message
 */
export interface ExtractedText {
  /** Combined text from all text parts */
  text: string;
  /** Whether any text part is still streaming */
  isStreaming: boolean;
}

/**
 * Extracted tool invocation from a message
 */
export interface ExtractedTool<TInput = unknown, TOutput = unknown> {
  toolCallId: string;
  toolName: string;
  state: string;
  input: TInput | undefined;
  output: TOutput | undefined;
  part: MessagePart;
}

/**
 * Return type for useMessageParts hook
 */
export interface UseMessagePartsReturn {
  /** All text parts combined */
  text: ExtractedText;
  /** All tool invocations */
  tools: ExtractedTool[];
  /** Tool invocations filtered by name */
  getToolsByName: <T = unknown>(name: string) => ExtractedTool<T>[];
  /** Check if message has any tool parts */
  hasTools: boolean;
  /** Check if message has text content */
  hasText: boolean;
  /** Check if any part is streaming */
  isStreaming: boolean;
  /** All raw parts from the message */
  parts: MessagePart[];
}

/**
 * Hook for extracting and working with message parts
 *
 * @example
 * ```tsx
 * function MessageDisplay({ message }: { message: AgentMessage }) {
 *   const { text, tools, hasTools } = useMessageParts(message);
 *
 *   return (
 *     <div>
 *       <p>{text.text}</p>
 *       {hasTools && tools.map(t => (
 *         <ToolInvocation key={t.toolCallId} tool={t} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessageParts(message: AgentMessage): UseMessagePartsReturn {
  const parts = message.parts || [];

  const text = useMemo<ExtractedText>(() => {
    const textParts = parts.filter(isTextPart) as TextPart[];
    return {
      text: textParts.map((p) => p.text).join(""),
      isStreaming: textParts.some((p) => p.state === "streaming"),
    };
  }, [parts]);

  const tools = useMemo<ExtractedTool[]>(() => {
    return parts
      .filter((p) => isToolPart(p))
      .map((part) => {
        const toolPart = part as DynamicToolPart;
        return {
          toolCallId: getToolCallId(part) || "",
          toolName:
            toolPart.type === "dynamic-tool"
              ? toolPart.toolName
              : part.type.slice(5), // Remove 'tool-' prefix
          state: getToolState(part) || "unknown",
          input: getToolInput(part),
          output: "output" in part ? part.output : undefined,
          part,
        };
      });
  }, [parts]);

  const getToolsByName = useMemo(() => {
    return <T = unknown>(name: string): ExtractedTool<T>[] => {
      return tools.filter((t) => t.toolName === name) as ExtractedTool<T>[];
    };
  }, [tools]);

  const hasTools = tools.length > 0;
  const hasText = text.text.length > 0;
  const isStreaming =
    text.isStreaming || tools.some((t) => t.state === "input-streaming");

  return {
    text,
    tools,
    getToolsByName,
    hasTools,
    hasText,
    isStreaming,
    parts,
  };
}
