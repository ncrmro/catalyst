/**
 * Message types designed around AI SDK v6 UIMessage structure
 */

/**
 * Chat message role
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * Chat status from AI SDK
 */
export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

/**
 * Tool invocation state from AI SDK
 */
export type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

/**
 * Text message part
 */
export interface TextPart {
  type: "text";
  text: string;
  state?: "streaming" | "done";
}

/**
 * Reasoning message part
 */
export interface ReasoningPart {
  type: "reasoning";
  text: string;
  state?: "streaming" | "done";
}

/**
 * File message part
 */
export interface FilePart {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
}

/**
 * Dynamic tool invocation part (for tools not statically defined)
 */
export interface DynamicToolPart {
  type: "dynamic-tool";
  toolName: string;
  toolCallId: string;
  title?: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
}

/**
 * Union of all message part types
 */
export type MessagePart = TextPart | ReasoningPart | FilePart | DynamicToolPart;

/**
 * Simplified message interface compatible with AI SDK UIMessage
 */
export interface AgentMessage<TMetadata = unknown> {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
  metadata?: TMetadata;
}

/**
 * Props for rendering a message list
 */
export interface MessageListProps<
  TMessage extends AgentMessage = AgentMessage,
> {
  messages: TMessage[];
  isLoading?: boolean;
  onToolSubmit?: (toolCallId: string, output: unknown) => void;
}

/**
 * Props for rendering a single message
 */
export interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
}
