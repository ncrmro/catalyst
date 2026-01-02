"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Result type for retry action */
export interface RetryResult {
	success: boolean;
	error?: string;
}

export interface RetryButtonProps {
	podId: string;
	/** Action callback for retry - passed from server component */
	onRetry: (podId: string) => Promise<RetryResult>;
}

/**
 * Client component for retrying a failed deployment
 */
export function RetryButton({ podId, onRetry }: RetryButtonProps) {
	const [isRetrying, setIsRetrying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	async function handleRetry() {
		setIsRetrying(true);
		setError(null);

		const result = await onRetry(podId);

		if (result.success) {
			router.refresh();
		} else {
			setError(result.error || "Failed to retry deployment");
			setIsRetrying(false);
		}
	}

	return (
		<div className="flex flex-col items-end">
			<button
				onClick={handleRetry}
				disabled={isRetrying}
				className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
					isRetrying
						? "bg-gray-300 text-gray-500 cursor-not-allowed"
						: "bg-blue-600 text-white hover:bg-blue-700"
				}`}
			>
				{isRetrying ? (
					<>
						<svg
							className="animate-spin h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						<span>Retrying...</span>
					</>
				) : (
					<>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						<span>Retry Deployment</span>
					</>
				)}
			</button>
			{error && <p className="text-red-600 text-sm mt-2">{error}</p>}
		</div>
	);
}
