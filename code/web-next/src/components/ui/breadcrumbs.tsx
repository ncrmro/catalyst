import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs - Navigation breadcrumb component
 *
 * Displays a list of navigation items with separators.
 * Items with href are rendered as links, the final item is typically non-interactive.
 *
 * @example
 * ```tsx
 * <Breadcrumbs items={[
 *   { label: "Projects", href: "/projects" },
 *   { label: "Catalyst" }
 * ]} />
 * ```
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      className={cn(
        "flex items-center gap-2 text-sm text-on-surface-variant uppercase",
        className,
      )}
    >
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-on-surface">
              {item.label}
            </Link>
          ) : (
            <span className="text-on-surface">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
