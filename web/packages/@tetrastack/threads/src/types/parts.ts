/**
 * Message part types (AI SDK compatible).
 * These represent the content of a thread item.
 */

/** Plain text content */
export type TextPart = {
  type: 'text';
  text: string;
};

/** Image content */
export type ImagePart = {
  type: 'image';
  /** Base64 encoded data or URL */
  image: string | Uint8Array;
  mimeType?: string;
};

/** File attachment */
export type FilePart = {
  type: 'file';
  /** URL or identifier */
  data: string;
  mimeType: string;
  name?: string;
};

/** Tool call request */
export type ToolCallPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown;
};

/** Tool call result */
export type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  result: unknown;
  isError?: boolean;
};

/** MCP server call request */
export type McpCallPart = {
  type: 'mcp-call';
  server: string;
  method: string;
  params: unknown;
  correlationId: string;
};

/** MCP server call result */
export type McpResultPart = {
  type: 'mcp-result';
  correlationId: string;
  result: unknown;
  isError?: boolean;
};

/** Source/citation reference */
export type SourcePart = {
  type: 'source';
  url?: string;
  title?: string;
  data?: unknown;
};

/** Error information */
export type ErrorPart = {
  type: 'error';
  message: string;
  code?: string;
};

/** Union of all message part types */
export type MessagePart =
  | TextPart
  | ImagePart
  | FilePart
  | ToolCallPart
  | ToolResultPart
  | McpCallPart
  | McpResultPart
  | SourcePart
  | ErrorPart;
