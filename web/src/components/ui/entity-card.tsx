/**
 * EntityCard component - Re-export of GlassEntityCard from tetrastack
 *
 * This re-export ensures consistent styling and maintainability across the application.
 * Always import EntityCard from here rather than directly from tetrastack.
 *
 * @example
 * ```tsx
 * import { EntityCard, EntityCardTabSelector } from "@/components/ui/entity-card";
 *
 * <EntityCard
 *   title="Pod Name"
 *   subtitle="Node info"
 *   metadata="2 days old"
 *   trailingContent={
 *     <EntityCardTabSelector
 *       tabs={[{ value: "status", label: "Status" }, { value: "config", label: "Config" }]}
 *       activeTab="status"
 *       onTabChange={setActiveTab}
 *     />
 *   }
 * />
 * ```
 */
export {
  GlassEntityCard as EntityCard,
  EntityCardTabSelector,
  TabbedGlassEntityCard as TabbedEntityCard,
} from "@tetrastack/react-glass-components";
export type {
  GlassEntityCardProps as EntityCardProps,
  EntityCardTab,
  EntityCardTabSelectorProps,
  TabbedGlassEntityCardProps as TabbedEntityCardProps,
} from "@tetrastack/react-glass-components";
