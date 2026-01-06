import * as React from "react";
import {
  GlassEntityCard,
  type GlassEntityCardProps,
  EntityCardTabSelector,
  type EntityCardTab,
} from "./GlassEntityCard";

/**
 * Props for the TabbedGlassEntityCard component.
 *
 * This component is stateless and relies on external state management for both
 * its active tab and its expansion state. This allows it to be used in various
 * contexts, including:
 * 1.  **Controlled Client Component**: Managed by React `useState`.
 * 2.  **URL-Driven Component**: State derived from URL search params or path segments,
 *     enabling the card to function as a Server Component when the tab selector
 *     is implemented with links (though the default EntityCardTabSelector uses buttons).
 * 3.  **Synchronized State**: Multiple cards can be synchronized to the same tab state.
 */
export interface TabbedGlassEntityCardProps extends Omit<
  GlassEntityCardProps,
  "trailingContent" | "expandedContent"
> {
  /**
   * List of tabs to display in the trailing content area
   */
  tabs: EntityCardTab[];

  /**
   * Currently active tab value
   */
  activeTab: string;

  /**
   * Callback when the active tab should change
   */
  onTabChange: (tab: string) => void;

  /**
   * Content for each tab, keyed by tab value
   */
  tabContent: Record<string, React.ReactNode>;
}

/**
 * TabbedGlassEntityCard - A reusable entity card with integrated tab switching.
 *
 * This component provides a standardized layout for an entity card that displays
 * different content based on an active tab. It combines the GlassEntityCard
 * and EntityCardTabSelector into a single cohesive unit.
 *
 * NOTE: This component is stateless. The caller is responsible for managing
 * `activeTab`, `onTabChange`, `expanded`, and `onToggle`.
 */
export function TabbedGlassEntityCard({
  tabs,
  activeTab,
  onTabChange,
  tabContent,
  ...props
}: TabbedGlassEntityCardProps) {
  return (
    <GlassEntityCard
      {...props}
      showRing={false}
      trailingContent={
        <EntityCardTabSelector
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      }
      expandedContent={tabContent[activeTab]}
    />
  );
}
