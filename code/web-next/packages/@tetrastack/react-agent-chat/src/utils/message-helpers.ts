import type { AgentMessage, MessagePart, TextPart } from "../types";
import { isTextPart, isToolPart, getToolState } from "./part-guards";

/**
 * Extract all text content from a message
 */
export function getMessageText(message: AgentMessage): string {
  return message.parts
    .filter(isTextPart)
    .map((part) => (part as TextPart).text)
    .join("");
}

/**
 * Check if a message has any text content
 */
export function hasTextContent(message: AgentMessage): boolean {
  return message.parts.some(isTextPart);
}

/**
 * Check if a message has any tool parts
 */
export function hasToolParts(message: AgentMessage): boolean {
  return message.parts.some((part) => isToolPart(part));
}

/**
 * Get all tool parts from a message
 */
export function getToolParts(message: AgentMessage): MessagePart[] {
  return message.parts.filter((part) => isToolPart(part));
}

/**
 * Get tool parts for a specific tool name
 */
export function getToolPartsByName(
  message: AgentMessage,
  toolName: string,
): MessagePart[] {
  return message.parts.filter((part) => isToolPart(part, toolName));
}

/**
 * Check if a message is from the user
 */
export function isUserMessage(message: AgentMessage): boolean {
  return message.role === "user";
}

/**
 * Check if a message is from the assistant
 */
export function isAssistantMessage(message: AgentMessage): boolean {
  return message.role === "assistant";
}

/**
 * Check if a message is a system message
 */
export function isSystemMessage(message: AgentMessage): boolean {
  return message.role === "system";
}

/**
 * Check if a message is currently streaming
 */
export function isMessageStreaming(message: AgentMessage): boolean {
  return message.parts.some((part) => {
    if ("state" in part) {
      return part.state === "streaming" || part.state === "input-streaming";
    }
    return false;
  });
}

/**
 * Check if all tool parts in a message are completed
 */
export function areAllToolsCompleted(message: AgentMessage): boolean {
  const toolParts = getToolParts(message);
  if (toolParts.length === 0) return true;

  return toolParts.every((part) => {
    const state = getToolState(part);
    return (
      state === "output-available" ||
      state === "output-error" ||
      state === "output-denied"
    );
  });
}

/**
 * Get the first text part from a message, or undefined if none
 */
export function getFirstTextPart(message: AgentMessage): TextPart | undefined {
  return message.parts.find(isTextPart) as TextPart | undefined;
}

/**
 * Create a simple text message
 */
export function createTextMessage(
  role: "user" | "assistant" | "system",
  text: string,
  id?: string,
): AgentMessage {
  return {
    id: id || crypto.randomUUID(),
    role,
    parts: [{ type: "text", text }],
  };
}

/**
 * Filter messages to only include those with text content
 */
export function filterTextMessages(messages: AgentMessage[]): AgentMessage[] {
  return messages.filter(hasTextContent);
}

/**
 * Get the last message from a list
 */
export function getLastMessage(
  messages: AgentMessage[],
): AgentMessage | undefined {
  return messages[messages.length - 1];
}

/**
 * Get the last assistant message from a list
 */
export function getLastAssistantMessage(
  messages: AgentMessage[],
): AgentMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      return messages[i];
    }
  }
  return undefined;
}
