import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { Breadcrumbs, BreadcrumbItem } from "./breadcrumbs";

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
 * On mobile: Shows a back button + current page title instead of full breadcrumbs
 * On desktop: Shows full breadcrumbs
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
  const hasBreadcrumbs = breadcrumbs.length > 0;
  // Get parent link (nearest previous item with href) for mobile back button
  const parentItem = hasBreadcrumbs
    ? breadcrumbs
        .slice(0, -1)
        .reverse()
        .find((item) => item.href)
    : undefined;
  // Get current page (last item) for mobile title
  const currentItem = hasBreadcrumbs ? breadcrumbs[breadcrumbs.length - 1] : undefined;

  return (
    <GlassCard>
      {/* Desktop: Full breadcrumbs with children inline */}
      <div className="hidden md:flex items-center justify-between">
        <Breadcrumbs items={breadcrumbs} />
        {action || children}
      </div>

      {/* Mobile: Stacked layout with back button */}
      <div className="md:hidden space-y-4">
        {/* Back button + Title row */}
        <div className="flex items-center gap-3">
          {parentItem?.href && (
            <Link
              href={parentItem.href}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-variant/50 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
              aria-label={`Back to ${parentItem.label}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          )}
          <span className="text-base font-medium text-on-surface uppercase tracking-wide">
            {currentItem?.label}
          </span>
        </div>

        {/* Children (e.g., ProjectNav) on its own row */}
        {(action || children) && <div>{action || children}</div>}
      </div>
    </GlassCard>
  );
}
