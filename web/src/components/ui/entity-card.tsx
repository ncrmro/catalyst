/**
 * EntityCard component - Re-export of GlassEntityCard from tetrastack
 *
 * This re-export ensures consistent styling and maintainability across the application.
 * Always import EntityCard from here rather than directly from tetrastack.
 *
 * @example
 * ```tsx
 * import { EntityCard } from "@/components/ui/entity-card";
 *
 * <EntityCard
 *   title="Pod Name"
 *   subtitle="Node info"
 *   metadata="2 days old"
 *   trailingContent={<StatusBadge />}
 * />
 * ```
 */

export type { GlassEntityCardProps as EntityCardProps } from "@tetrastack/react-glass-components";
export { GlassEntityCard as EntityCard } from "@tetrastack/react-glass-components";
