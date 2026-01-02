import type { WorkItemPriority } from "@fixtures/types";
import { cn } from "@/lib/utils";

type PriorityLevel = "high" | "medium" | "low";

interface PriorityScoreDisplayProps {
	priority: WorkItemPriority;
	showFactors?: boolean;
	showAppliedRules?: boolean;
	className?: string;
}

function getPriorityLevel(score: number): PriorityLevel {
	if (score >= 70) return "high";
	if (score >= 40) return "medium";
	return "low";
}

const levelConfig: Record<
	PriorityLevel,
	{ label: string; className: string; barClassName: string }
> = {
	high: {
		label: "High",
		className: "text-red-600 dark:text-red-400",
		barClassName: "bg-red-500",
	},
	medium: {
		label: "Medium",
		className: "text-yellow-600 dark:text-yellow-400",
		barClassName: "bg-yellow-500",
	},
	low: {
		label: "Low",
		className: "text-green-600 dark:text-green-400",
		barClassName: "bg-green-500",
	},
};

const factorLabels: Record<keyof WorkItemPriority["factors"], string> = {
	impact: "Impact",
	effort: "Effort",
	urgency: "Urgency",
	alignment: "Alignment",
	risk: "Risk",
};

/**
 * Displays a work item's priority score with optional factor breakdown.
 *
 * @example
 * <PriorityScoreDisplay priority={workItem.priority} />
 * <PriorityScoreDisplay priority={workItem.priority} showFactors />
 * <PriorityScoreDisplay priority={workItem.priority} showAppliedRules />
 */
export function PriorityScoreDisplay({
	priority,
	showFactors = false,
	showAppliedRules = false,
	className,
}: PriorityScoreDisplayProps) {
	const level = getPriorityLevel(priority.score);
	const config = levelConfig[level];

	return (
		<div className={cn("space-y-2", className)}>
			{/* Score header */}
			<div className="flex items-center gap-2">
				<span className={cn("text-lg font-semibold", config.className)}>
					{priority.score}
				</span>
				<span className="text-sm text-on-surface-variant">{config.label}</span>
			</div>

			{/* Progress bar */}
			<div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					className={cn("h-2 rounded-full transition-all", config.barClassName)}
					style={{ width: `${priority.score}%` }}
				/>
			</div>

			{/* Factor breakdown */}
			{showFactors && (
				<div className="mt-3 space-y-1">
					<p className="text-xs font-medium text-on-surface-variant">Factors</p>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
						{(
							Object.entries(priority.factors) as [
								keyof WorkItemPriority["factors"],
								number,
							][]
						).map(([key, value]) => (
							<div key={key} className="flex justify-between">
								<span className="text-on-surface-variant">
									{factorLabels[key]}
								</span>
								<span className="font-medium text-on-surface">{value}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Applied rules */}
			{showAppliedRules && priority.appliedRules.length > 0 && (
				<div className="mt-3 space-y-1">
					<p className="text-xs font-medium text-on-surface-variant">
						Applied Rules
					</p>
					<div className="flex flex-wrap gap-1">
						{priority.appliedRules.map((rule) => (
							<span
								key={rule}
								className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
							>
								{rule}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
