import * as React from "react";
import { useState } from "react";
import {
  GlassEntityCard,
  type GlassEntityCardProps,
  EntityCardTabSelector,
  type EntityCardTab,
} from "./GlassEntityCard";

export interface TabbedGlassEntityCardProps
  extends Omit<
    GlassEntityCardProps,
    "trailingContent" | "expanded" | "expandedContent" | "onToggle"
  > {
  /**
   * List of tabs to display
   */
  tabs: EntityCardTab[];

  /**
   * Content for each tab, keyed by tab value
   */
  tabContent: Record<string, React.ReactNode>;

  /**
   * Default active tab value
   */
  defaultTab?: string;

  /**
   * Optional callback when tab changes
   */
  onTabChange?: (tab: string) => void;

  /**
   * Default expanded state
   * @default true
   */
  defaultExpanded?: boolean;
}

/**
 * TabbedGlassEntityCard - A tailored GlassEntityCard that handles tab state and switching.
 *
 * This component simplifies the pattern of an entity card with
 * tabs in the trailing content area, switching the content body based on selection.
 * It also manages its own expansion state.
 */
export function TabbedGlassEntityCard({
  tabs,
  tabContent,
  defaultTab,
  onTabChange,
  defaultExpanded = true,
  expandable = true,
  ...props
}: TabbedGlassEntityCardProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.value);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onTabChange?.(value);
  };

  return (
    <GlassEntityCard
      {...props}
      expandable={expandable}
      expanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      trailingContent={
        <EntityCardTabSelector
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      }
      expandedContent={tabContent[activeTab]}
    />
  );
}
