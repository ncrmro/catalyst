"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type {
	AddToolOutputOptions,
	ChatStatus,
	OnToolCallHandler,
} from "../types";

/**
 * Options for useAgentChat hook
 */
export interface UseAgentChatOptions {
	/** API endpoint for chat communication */
	apiEndpoint: string;
	/** Optional project ID to include in requests */
	projectId?: string;
	/** Optional session data to include in requests */
	sessionData?: Record<string, unknown>;
	/** Callback when a tool is called by the agent */
	onToolCall?: OnToolCallHandler;
	/** Initial messages to populate the chat */
	initialMessages?: Array<{
		id: string;
		role: "user" | "assistant" | "system";
		parts: Array<{ type: string; text?: string }>;
	}>;
}

/**
 * Return type for useAgentChat hook
 */
export interface UseAgentChatReturn {
	/** All messages in the conversation */
	messages: Array<{
		id: string;
		role: string;
		parts?: Array<{ type: string; text?: string; [key: string]: unknown }>;
	}>;
	/** Current chat status */
	status: ChatStatus;
	/** Error if any occurred */
	error: Error | undefined;
	/** Send a text message to the agent */
	sendMessage: (text: string) => Promise<void>;
	/** Add output for a tool call */
	addToolOutput: (options: AddToolOutputOptions) => void;
	/** Whether the chat is currently loading (streaming or submitted) */
	isLoading: boolean;
	/** Clear any error state */
	clearError: () => void;
}

/**
 * Hook for managing agent chat interactions
 *
 * Wraps AI SDK's useChat with a simplified API for common use cases.
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, isLoading } = useAgentChat({
 *   apiEndpoint: '/api/chat',
 *   projectId: 'project-123',
 * });
 *
 * return (
 *   <div>
 *     {messages.map(m => <Message key={m.id} message={m} />)}
 *     <button onClick={() => sendMessage('Hello!')}>Send</button>
 *   </div>
 * );
 * ```
 */
export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
	const { apiEndpoint, projectId, sessionData, onToolCall, initialMessages } =
		options;

	const chat = useChat({
		transport: new DefaultChatTransport({
			api: apiEndpoint,
			body: {
				...(projectId && { projectId }),
				...(sessionData && { sessionData }),
			},
		}),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		messages: initialMessages as any,
		onToolCall: onToolCall
			? ({ toolCall }) =>
					onToolCall({
						toolCall: {
							toolCallId: toolCall.toolCallId,
							toolName: toolCall.toolName,
							input: toolCall.input,
						},
					})
			: undefined,
	});

	const sendMessage = async (text: string) => {
		await chat.sendMessage({ text });
	};

	const addToolOutput = (toolOutputOptions: AddToolOutputOptions) => {
		chat.addToolOutput({
			state: "output-available",
			tool: "", // Tool name not needed for output
			toolCallId: toolOutputOptions.toolCallId,
			output: toolOutputOptions.output,
		});
	};

	return {
		messages: chat.messages,
		status: chat.status as ChatStatus,
		error: chat.error,
		sendMessage,
		addToolOutput,
		isLoading: chat.status === "streaming" || chat.status === "submitted",
		clearError: chat.clearError,
	};
}
