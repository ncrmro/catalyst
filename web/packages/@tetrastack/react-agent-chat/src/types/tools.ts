import type { ToolState } from "./messages";

/**
 * Generic tool call structure
 */
export interface ToolCall<TInput = unknown> {
  toolCallId: string;
  toolName: string;
  input: TInput;
  dynamic?: boolean;
}

/**
 * Tool invocation with full state
 */
export interface ToolInvocation<TInput = unknown, TOutput = unknown> {
  toolCallId: string;
  toolName: string;
  title?: string;
  state: ToolState;
  input: TInput;
  output?: TOutput;
  errorText?: string;
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
}

/**
 * Options for adding tool output
 */
export interface AddToolOutputOptions {
  toolCallId: string;
  output: unknown;
}

/**
 * Tool response handler callback
 */
export type ToolResponseHandler = (
  toolCallId: string,
  output: unknown,
) => void | Promise<void>;

/**
 * Tool call callback for handling tool invocations
 */
export type OnToolCallHandler = (options: {
  toolCall: ToolCall;
}) => void | Promise<void>;
