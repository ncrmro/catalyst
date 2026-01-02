import type { Assignee } from "@/components/tasks/types";
import { cn } from "@/lib/utils";

export interface AssigneeBadgeProps {
	assignee: Assignee;
	className?: string;
	size?: "sm" | "md";
	showType?: boolean;
}

export function AssigneeBadge({
	assignee,
	className,
	size = "sm",
	showType = true,
}: AssigneeBadgeProps) {
	const sizeClasses = {
		sm: "text-xs gap-1.5",
		md: "text-sm gap-2",
	};

	const iconSizeClasses = {
		sm: "w-4 h-4",
		md: "w-5 h-5",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center text-on-surface",
				sizeClasses[size],
				className,
			)}
		>
			{assignee.avatarUrl ? (
				<img
					src={assignee.avatarUrl}
					alt={assignee.name}
					className={cn("rounded-full", iconSizeClasses[size])}
				/>
			) : (
				<span
					className={cn(
						"rounded-full flex items-center justify-center text-[10px] font-medium",
						iconSizeClasses[size],
						assignee.type === "ai"
							? "bg-primary-container text-on-primary-container"
							: "bg-secondary-container text-on-secondary-container",
					)}
				>
					{assignee.type === "ai" ? "AI" : assignee.name[0]}
				</span>
			)}
			<span>{assignee.name}</span>
			{showType && (
				<span className="text-on-surface-variant">
					({assignee.type === "ai" ? "AI" : "Human"})
				</span>
			)}
		</span>
	);
}
