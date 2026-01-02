import { cn } from "@/lib/utils";

export interface LogViewerProps {
	/**
	 * Log content to display
	 */
	logs: string;
	/**
	 * Maximum height of the log viewer (with scrolling)
	 * @default "max-h-64"
	 */
	maxHeight?: string;
	/**
	 * Additional CSS classes
	 */
	className?: string;
	/**
	 * Whether to show line numbers
	 * @default false
	 */
	showLineNumbers?: boolean;
}

/**
 * LogViewer - A molecule component for displaying logs in a terminal-style format
 *
 * Displays logs with monospace font, dark background, and optional line numbers.
 * Automatically scrollable when content exceeds max height.
 *
 * @example
 * ```tsx
 * <LogViewer
 *   logs="[10:15:00] Build started\n[10:15:30] Build complete"
 *   maxHeight="max-h-96"
 * />
 *
 * <LogViewer
 *   logs={agentLogs}
 *   showLineNumbers
 * />
 * ```
 */
export function LogViewer({
	logs,
	maxHeight = "max-h-64",
	className,
	showLineNumbers = false,
}: LogViewerProps) {
	const lines = logs.split("\n");

	return (
		<div
			className={cn(
				"bg-gray-900 p-4 overflow-y-auto rounded",
				maxHeight,
				className,
			)}
			role="log"
			aria-label="Log output"
		>
			{showLineNumbers ? (
				<div className="flex">
					<div className="select-none pr-4 text-gray-500 text-right">
						{lines.map((_, index) => (
							<div key={index} className="text-xs font-mono leading-relaxed">
								{index + 1}
							</div>
						))}
					</div>
					<pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap flex-1">
						{logs}
					</pre>
				</div>
			) : (
				<pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
					{logs}
				</pre>
			)}
		</div>
	);
}
