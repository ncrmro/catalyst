import { GlassCard } from "@tetrastack/react-glass-components";
import { type BreadcrumbItem, Breadcrumbs } from "./breadcrumbs";

export interface PageHeaderProps {
	/**
	 * Breadcrumb items to display
	 */
	breadcrumbs: BreadcrumbItem[];
	/**
	 * Optional action element (e.g., button) to display on the right
	 */
	action?: React.ReactNode;
	/**
	 * Alternative to action - any children will be rendered on the right side
	 */
	children?: React.ReactNode;
}

/**
 * PageHeader - Consistent page header with breadcrumbs and optional action
 *
 * Wraps breadcrumbs in a GlassCard with optional action button on the right.
 * Used for consistent page headers across dashboard pages.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   breadcrumbs={[{ label: "Projects" }]}
 *   action={<Link href="/projects/create">Create Project</Link>}
 * />
 * ```
 */
export function PageHeader({ breadcrumbs, action, children }: PageHeaderProps) {
	return (
		<GlassCard>
			<div className="flex items-center justify-between">
				<Breadcrumbs items={breadcrumbs} />
				{action || children}
			</div>
		</GlassCard>
	);
}
