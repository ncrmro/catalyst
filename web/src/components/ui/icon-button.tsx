import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
	/**
	 * Icon element to display (typically an SVG)
	 */
	icon: ReactNode;
	/**
	 * Optional text label to display next to icon
	 */
	label?: string;
	/**
	 * Visual variant
	 * @default "primary"
	 */
	variant?: "primary" | "secondary" | "ghost" | "error";
	/**
	 * Size variant
	 * @default "md"
	 */
	size?: "sm" | "md" | "lg";
	/**
	 * Whether the button is disabled
	 */
	disabled?: boolean;
	/**
	 * Additional CSS classes
	 */
	className?: string;
	/**
	 * Accessible label for screen readers (falls back to title or label)
	 */
	"aria-label"?: string;
}

/**
 * IconButton - A button component with an icon and optional text label
 *
 * Supports multiple variants (primary, secondary, ghost, error) and sizes.
 * Can be used with icon only or with an accompanying text label.
 *
 * @example
 * ```tsx
 * // Icon only
 * <IconButton
 *   icon={<TerminalIcon />}
 *   aria-label="Open terminal"
 *   onClick={handleClick}
 * />
 *
 * // Icon with label
 * <IconButton
 *   icon={<TerminalIcon />}
 *   label="Shell"
 *   onClick={handleClick}
 * />
 *
 * // Different variants
 * <IconButton icon={<TrashIcon />} variant="error" label="Delete" />
 * <IconButton icon={<EditIcon />} variant="ghost" />
 * ```
 */
export function IconButton({
	icon,
	label,
	variant = "primary",
	size = "md",
	disabled = false,
	className,
	"aria-label": ariaLabel,
	...props
}: IconButtonProps) {
	// Variant styles using Material Design 3 tokens
	const variantClasses = {
		primary: "bg-primary text-on-primary hover:opacity-90",
		secondary: "bg-secondary text-on-secondary hover:opacity-90",
		ghost:
			"bg-transparent text-on-surface hover:bg-surface-variant border border-outline/50",
		error: "bg-error text-on-error hover:opacity-90",
	};

	// Size variants
	const sizeClasses = {
		sm: label ? "px-2 py-1 text-xs gap-1" : "p-1",
		md: label ? "px-3 py-1.5 text-sm gap-1.5" : "p-1.5",
		lg: label ? "px-4 py-2 text-base gap-2" : "p-2",
	};

	// Icon size based on button size
	const iconSizeClasses = {
		sm: "w-3 h-3",
		md: "w-4 h-4",
		lg: "w-5 h-5",
	};

	// Disabled styles
	const disabledClasses = disabled
		? "opacity-50 cursor-not-allowed"
		: "transition-opacity cursor-pointer";

	return (
		<button
			className={cn(
				"inline-flex items-center justify-center rounded-lg font-medium",
				variantClasses[variant],
				sizeClasses[size],
				disabledClasses,
				className,
			)}
			disabled={disabled}
			aria-label={ariaLabel || label || props.title}
			{...props}
		>
			<span className={cn(iconSizeClasses[size], "shrink-0")}>{icon}</span>
			{label && <span>{label}</span>}
		</button>
	);
}
