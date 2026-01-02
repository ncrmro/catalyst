"use client";

import { useCallback } from "react";
import type { AddToolOutputOptions, ToolResponseHandler } from "../types";

/**
 * Options for useToolResponse hook
 */
export interface UseToolResponseOptions {
	/** Function to add tool output (from useAgentChat or AI SDK) */
	addToolOutput: (options: AddToolOutputOptions) => void;
	/** Optional callback after tool response is submitted */
	onSubmit?: (toolCallId: string, output: unknown) => void;
}

/**
 * Return type for useToolResponse hook
 */
export interface UseToolResponseReturn {
	/** Submit a response for a tool call */
	submitResponse: ToolResponseHandler;
	/** Create a bound submit handler for a specific tool call */
	createSubmitHandler: (toolCallId: string) => (output: unknown) => void;
}

/**
 * Hook for managing tool response submission
 *
 * Provides utilities for submitting tool outputs back to the agent.
 *
 * @example
 * ```tsx
 * function ToolComponent({ toolCallId, addToolOutput }) {
 *   const { submitResponse } = useToolResponse({ addToolOutput });
 *
 *   const handleClick = () => {
 *     submitResponse(toolCallId, { selected: 'option-1' });
 *   };
 *
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 * ```
 */
export function useToolResponse(
	options: UseToolResponseOptions,
): UseToolResponseReturn {
	const { addToolOutput, onSubmit } = options;

	const submitResponse: ToolResponseHandler = useCallback(
		(toolCallId: string, output: unknown) => {
			addToolOutput({
				toolCallId,
				output,
			});
			onSubmit?.(toolCallId, output);
		},
		[addToolOutput, onSubmit],
	);

	const createSubmitHandler = useCallback(
		(toolCallId: string) => {
			return (output: unknown) => {
				submitResponse(toolCallId, output);
			};
		},
		[submitResponse],
	);

	return {
		submitResponse,
		createSubmitHandler,
	};
}
