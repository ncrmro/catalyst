import { cn } from "@/lib/utils";
import { IconButton } from "./ui/icon-button";
import { StatusIndicator } from "./ui/status-indicator";

export interface ContainerRowProps {
	/**
	 * Container name
	 */
	name: string;
	/**
	 * Container status
	 */
	status: "running" | "pending" | "failed" | "completed";
	/**
	 * Number of times the container has restarted
	 */
	restarts: number;
	/**
	 * Whether this container is selected
	 * @default false
	 */
	isSelected?: boolean;
	/**
	 * Callback when container is clicked
	 */
	onClick?: () => void;
	/**
	 * Callback when shell button is clicked
	 */
	onOpenShell?: () => void;
	/**
	 * Additional CSS classes
	 */
	className?: string;
}

const TerminalIcon = (
	<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
		/>
	</svg>
);

/**
 * ContainerRow - A molecule component for displaying container information
 *
 * Shows container status, name, restart count, and provides a shell button.
 * Used in container lists to display individual container details.
 *
 * @example
 * ```tsx
 * <ContainerRow
 *   name="workspace"
 *   status="running"
 *   restarts={0}
 *   onOpenShell={() => openTerminal("workspace")}
 * />
 *
 * <ContainerRow
 *   name="proxy"
 *   status="failed"
 *   restarts={3}
 *   isSelected
 *   onClick={() => setSelected("proxy")}
 *   onOpenShell={() => openTerminal("proxy")}
 * />
 * ```
 */
export function ContainerRow({
	name,
	status,
	restarts,
	isSelected = false,
	onClick,
	onOpenShell,
	className,
}: ContainerRowProps) {
	const isRunning = status === "running";

	return (
		<div
			className={cn(
				"flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors",
				isSelected ? "bg-primary/10" : "hover:bg-surface/50",
				className,
			)}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.();
				}
			}}
		>
			<StatusIndicator status={status} size="sm" />
			<span className="font-medium text-on-surface flex-1">{name}</span>
			<span className="text-sm text-on-surface-variant capitalize">
				{status}
			</span>
			<span className="text-sm text-on-surface-variant">
				{restarts} {restarts === 1 ? "restart" : "restarts"}
			</span>
			<IconButton
				icon={TerminalIcon}
				label="Shell"
				size="sm"
				onClick={(e) => {
					e.stopPropagation();
					onOpenShell?.();
				}}
				disabled={!isRunning}
				title={
					isRunning ? "Open shell" : "Container must be running to open shell"
				}
			/>
		</div>
	);
}
