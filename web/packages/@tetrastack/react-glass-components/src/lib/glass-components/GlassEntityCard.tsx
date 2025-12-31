import * as React from 'react';
import { cn } from './utils';
import { GlassCard, type GlassCardProps } from './GlassCard';

/**
 * Tab definition for the entity card tab selector
 */
export interface EntityCardTab {
  /** Unique value identifier for this tab */
  value: string;
  /** Display label for the tab */
  label: string;
}

/**
 * Props for the GlassEntityCard component
 */
export interface GlassEntityCardProps
  extends Omit<GlassCardProps, 'onClick' | 'padded'> {
  /**
   * Image element to display on the left side of the card.
   * Should be a React element (e.g., an Image component or img tag).
   */
  image?: React.ReactNode;

  /**
   * Title of the entity
   */
  title: string;

  /**
   * Optional subtitle or description
   */
  subtitle?: React.ReactNode;

  /**
   * Optional metadata to display below the subtitle (e.g., ingredient count, time)
   */
  metadata?: React.ReactNode;

  /**
   * Content to display on the right side of the card (before any trailing content).
   * This is where tab selectors, macro circles, or other inline content goes.
   */
  trailingContent?: React.ReactNode;

  /**
   * Controls/actions to display at the far right (e.g., increment controls, buttons).
   * This receives onClick stopPropagation handling.
   */
  controls?: React.ReactNode;

  /**
   * Whether this card is expandable
   */
  expandable?: boolean;

  /**
   * Whether this card is currently expanded
   */
  expanded?: boolean;

  /**
   * Callback when the card is clicked (for expand/collapse or selection)
   */
  onToggle?: () => void;

  /**
   * Whether the card is in a selected state
   */
  selected?: boolean;

  /**
   * Loading state for when expanded content is being fetched
   */
  loading?: boolean;

  /**
   * Content to render when expanded
   */
  expandedContent?: React.ReactNode;

  /**
   * Custom loading content to show when loading
   */
  loadingContent?: React.ReactNode;

  /**
   * Size variant affecting image size and padding
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Optional href for making the main content area a link
   */
  href?: string;

  /**
   * Link component to use for navigation (for framework-agnostic design)
   * @default 'a'
   */
  LinkComponent?: React.ElementType;

  /**
   * Test ID for testing purposes
   */
  testId?: string;

  /**
   * Data attributes for testing
   */
  dataAttributes?: Record<string, string>;
}

/**
 * GlassEntityCard - A reusable entity card component with glass-morphism styling.
 *
 * This component provides a flexible card layout for displaying entities like meals,
 * recipes, products, etc. It supports:
 * - Left-aligned image
 * - Title/subtitle/metadata content
 * - Trailing content (tabs, badges, etc.)
 * - Right-side controls (buttons, incrementors)
 * - Expandable content area
 * - Selection and loading states
 *
 * The component is framework-agnostic and can be used with any React router
 * by passing a custom LinkComponent.
 *
 * @example
 * // Basic usage
 * <GlassEntityCard
 *   image={<img src="/meal.jpg" alt="Meal" />}
 *   title="Chicken Stir Fry"
 *   subtitle="A quick and healthy dinner option"
 *   metadata="4 ingredients"
 * />
 *
 * @example
 * // With controls and expansion
 * <GlassEntityCard
 *   image={<img src="/meal.jpg" alt="Meal" />}
 *   title="Chicken Stir Fry"
 *   expandable
 *   expanded={isExpanded}
 *   onToggle={() => setIsExpanded(!isExpanded)}
 *   controls={<Incrementor value={count} onChange={setCount} />}
 *   expandedContent={<IngredientsList ingredients={ingredients} />}
 * />
 */
export function GlassEntityCard({
  image,
  title,
  subtitle,
  metadata,
  trailingContent,
  controls,
  expandable = false,
  expanded = false,
  onToggle,
  selected = false,
  loading = false,
  expandedContent,
  loadingContent,
  size = 'md',
  href,
  LinkComponent = 'a',
  testId,
  dataAttributes,
  className,
  rounded = 'lg',
  ...cardProps
}: GlassEntityCardProps) {
  const isInteractive = expandable || onToggle !== undefined;

  // Size-based classes
  const sizeClasses = {
    sm: {
      padding: 'p-2 sm:p-3',
      gap: 'gap-2 sm:gap-3',
      image: 'w-16 h-14 sm:w-20 sm:h-16',
      title: 'text-sm sm:text-base',
    },
    md: {
      padding: 'p-3 sm:p-4',
      gap: 'gap-3 sm:gap-4',
      image: 'w-24 h-20 sm:w-32 sm:h-24',
      title: 'text-base sm:text-lg',
    },
    lg: {
      padding: 'p-4 sm:p-6',
      gap: 'gap-4 sm:gap-6',
      image: 'w-32 h-24 sm:w-40 sm:h-32',
      title: 'text-lg sm:text-xl',
    },
  };

  const sizes = sizeClasses[size];

  const handleClick = () => {
    if (isInteractive && onToggle) {
      onToggle();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isInteractive) {
      e.preventDefault();
      handleClick();
    }
  };

  const handleControlsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Main content area (image + text + trailing)
  const mainContent = (
    <>
      {/* Image */}
      {image && (
        <div
          className={cn(
            'relative flex-shrink-0 rounded-lg overflow-hidden bg-surface-container',
            sizes.image,
          )}
        >
          {image}
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4
          className={cn(
            'font-semibold text-on-surface leading-tight',
            sizes.title,
          )}
        >
          {title}
        </h4>
        {subtitle && (
          <p className="text-sm text-on-surface-variant mt-1 line-clamp-2 max-w-prose">
            {subtitle}
          </p>
        )}
        {metadata && (
          <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
            {metadata}
          </div>
        )}
      </div>

      {/* Trailing content (tabs, badges, etc.) */}
      {trailingContent && (
        <div className="flex-shrink-0 self-center hidden sm:flex items-center gap-2">
          {trailingContent}
        </div>
      )}
    </>
  );

  // Wrap content based on whether it's a link or interactive
  const wrappedContent = href ? (
    <LinkComponent
      href={href}
      className={cn(
        'flex-1 min-w-0 flex hover:opacity-90 transition-opacity',
        sizes.gap,
      )}
    >
      {mainContent}
    </LinkComponent>
  ) : isInteractive ? (
    <div
      className={cn(
        'flex-1 min-w-0 flex cursor-pointer hover:opacity-90 transition-opacity',
        sizes.gap,
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={
        expandable
          ? `${expanded ? 'Collapse' : 'Expand'} ${title}`
          : `Select ${title}`
      }
      aria-expanded={expandable ? expanded : undefined}
    >
      {mainContent}
    </div>
  ) : (
    <div className={cn('flex-1 min-w-0 flex', sizes.gap)}>{mainContent}</div>
  );

  // Default loading content
  const defaultLoadingContent = (
    <div className="flex items-center justify-center py-8">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-surface-container" />
        <span className="text-sm text-on-surface-variant">
          Loading details...
        </span>
      </div>
    </div>
  );

  // Build data attributes for the card
  const dataAttrs: Record<string, string> = {
    'data-testid': testId || 'glass-entity-card',
    ...dataAttributes,
  };

  return (
    <GlassCard
      rounded={rounded}
      padded={false}
      className={cn(
        sizes.padding,
        'transition-all duration-200',
        (selected || expanded) && 'ring-2 ring-primary',
        isInteractive && !href && 'hover:shadow-lg',
        className,
      )}
      {...dataAttrs}
      {...cardProps}
    >
      {/* Header Row */}
      <div className={cn('flex', sizes.gap)}>
        {wrappedContent}

        {/* Controls (right side) */}
        {controls && (
          <div
            className="flex items-center flex-shrink-0 self-center"
            onClick={handleControlsClick}
          >
            {controls}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 pt-3">
          {loading ? loadingContent || defaultLoadingContent : expandedContent}
        </div>
      )}
    </GlassCard>
  );
}

/**
 * Tab selector component for entity cards.
 * Displays pill-style tab buttons that can be placed in the trailing content area.
 */
export interface EntityCardTabSelectorProps {
  /** Available tabs */
  tabs: EntityCardTab[];
  /** Currently active tab value */
  activeTab: string;
  /** Callback when a tab is selected */
  onTabChange: (value: string) => void;
  /** Additional class names */
  className?: string;
}

export function EntityCardTabSelector({
  tabs,
  activeTab,
  onTabChange,
  className,
}: EntityCardTabSelectorProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange(tab.value);
          }}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
            activeTab === tab.value
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
