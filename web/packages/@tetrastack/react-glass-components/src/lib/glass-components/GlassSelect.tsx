import type React from "react";
import { GlassSurface } from "./GlassSurface";
import { cn } from "./utils";

export interface GlassSelectProps
	extends React.SelectHTMLAttributes<HTMLSelectElement> {
	/**
	 * Glass intensity - defaults to 'strong' for heavy blur
	 */
	intensity?: "light" | "medium" | "strong";
}

/**
 * GlassSelect component with glass-morphism styling
 */
export function GlassSelect({
	intensity = "strong",
	className,
	children,
	...props
}: GlassSelectProps) {
	return (
		<GlassSurface<"select">
			as="select"
			intensity={intensity}
			bordered
			shadowed
			className={cn(
				"w-full px-4 py-2 rounded-lg",
				"text-on-surface",
				"focus:outline-none focus:ring-2 focus:ring-primary",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				className,
			)}
			{...props}
		>
			{children}
		</GlassSurface>
	);
}
