import type {
  MessagePart,
  TextPart,
  ReasoningPart,
  FilePart,
  DynamicToolPart,
  ToolState,
} from "../types";

/**
 * Check if a message part is a text part
 */
export function isTextPart(part: MessagePart): part is TextPart {
  return part.type === "text";
}

/**
 * Check if a message part is a reasoning part
 */
export function isReasoningPart(part: MessagePart): part is ReasoningPart {
  return part.type === "reasoning";
}

/**
 * Check if a message part is a file part
 */
export function isFilePart(part: MessagePart): part is FilePart {
  return part.type === "file";
}

/**
 * Check if a message part is a dynamic tool part
 */
export function isDynamicToolPart(part: MessagePart): part is DynamicToolPart {
  return part.type === "dynamic-tool";
}

/**
 * Check if a message part is any tool part (static or dynamic)
 * Static tool parts have type like 'tool-{toolName}'
 */
export function isToolPart(
  part: MessagePart,
  toolName?: string,
): part is DynamicToolPart {
  if (part.type === "dynamic-tool") {
    return toolName ? (part as DynamicToolPart).toolName === toolName : true;
  }
  // Static tool parts start with 'tool-'
  if (part.type.startsWith("tool-")) {
    return toolName ? part.type === `tool-${toolName}` : true;
  }
  return false;
}

/**
 * Check if a message part is a clarifying questions tool part
 */
export function isClarifyingQuestionsPart(
  part: MessagePart,
): part is DynamicToolPart {
  return isToolPart(part, "askClarifyingQuestions");
}

/**
 * Get the tool state from a message part
 */
export function getToolState(part: MessagePart): ToolState | undefined {
  if ("state" in part && part.state) {
    return part.state as ToolState;
  }
  return undefined;
}

/**
 * Get the tool input from a message part
 */
export function getToolInput<T>(part: MessagePart): T | undefined {
  if ("input" in part) {
    return part.input as T;
  }
  return undefined;
}

/**
 * Get the tool call ID from a message part
 */
export function getToolCallId(part: MessagePart): string | undefined {
  if ("toolCallId" in part) {
    return part.toolCallId;
  }
  return undefined;
}

/**
 * Get the tool name from a message part
 */
export function getToolName(part: MessagePart): string | undefined {
  if (part.type === "dynamic-tool") {
    return (part as DynamicToolPart).toolName;
  }
  if (part.type.startsWith("tool-")) {
    return part.type.slice(5); // Remove 'tool-' prefix
  }
  return undefined;
}

/**
 * Get the tool output from a message part
 */
export function getToolOutput<T>(part: MessagePart): T | undefined {
  if ("output" in part) {
    return part.output as T;
  }
  return undefined;
}

/**
 * Check if a tool part is in a completed state (has output or error)
 */
export function isToolCompleted(part: MessagePart): boolean {
  const state = getToolState(part);
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  );
}

/**
 * Check if a tool part is waiting for user input
 */
export function isToolWaitingForInput(part: MessagePart): boolean {
  const state = getToolState(part);
  return state === "input-available" || state === "approval-requested";
}

/**
 * Check if a tool part is streaming
 */
export function isToolStreaming(part: MessagePart): boolean {
  const state = getToolState(part);
  return state === "input-streaming";
}
