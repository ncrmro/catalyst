import { cn } from "@/lib/utils";

export type EnvironmentStatus =
	| "pending"
	| "deploying"
	| "running"
	| "failed"
	| "deleting";

interface EnvironmentStatusBadgeProps {
	status: EnvironmentStatus;
	size?: "sm" | "md";
	showDot?: boolean;
	className?: string;
}

/**
 * Status badge for preview environments with color-coded states.
 */
export function EnvironmentStatusBadge({
	status,
	size = "md",
	showDot = true,
	className,
}: EnvironmentStatusBadgeProps) {
	const statusConfig: Record<
		EnvironmentStatus,
		{ label: string; color: string; dotColor: string; animate?: boolean }
	> = {
		pending: {
			label: "Pending",
			color: "bg-surface-variant text-on-surface-variant",
			dotColor: "bg-on-surface-variant",
		},
		deploying: {
			label: "Deploying",
			color: "bg-primary/10 text-primary",
			dotColor: "bg-primary",
			animate: true,
		},
		running: {
			label: "Running",
			color: "bg-success/10 text-success",
			dotColor: "bg-success",
		},
		failed: {
			label: "Failed",
			color: "bg-error/10 text-error",
			dotColor: "bg-error",
		},
		deleting: {
			label: "Deleting",
			color: "bg-surface-variant text-on-surface-variant",
			dotColor: "bg-on-surface-variant",
			animate: true,
		},
	};

	const config = statusConfig[status];

	const sizeClasses = {
		sm: "px-2 py-0.5 text-xs",
		md: "px-2.5 py-1 text-sm",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full font-medium",
				config.color,
				sizeClasses[size],
				className,
			)}
		>
			{showDot && (
				<span
					className={cn(
						"w-2 h-2 rounded-full",
						config.dotColor,
						config.animate && "animate-pulse",
					)}
				/>
			)}
			{config.label}
		</span>
	);
}
