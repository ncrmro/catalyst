import React from 'react';
import { GlassCard } from './GlassCard';
import { cn } from './utils';

export interface ApplicationLayoutNavOption {
  /** Unique value identifier for the option */
  value: string;
  /** Display label for the option */
  label: string;
  /**
   * Optional URL for navigation.
   * If present, renders as a link (using linkComponent).
   * If absent, renders as a button (using onSelect).
   */
  href?: string;
}

export interface ApplicationLayoutNavProps {
  /** Array of navigation options */
  options: ApplicationLayoutNavOption[];
  /** Currently active value matching one of the options */
  activeValue: string;
  /** Callback fired when a button option (no href) is clicked */
  onSelect?: (value: string) => void;
  /**
   * Accessible label for the navigation group
   * @default 'View selection'
   */
  ariaLabel?: string;
  /**
   * Component to use for rendering links.
   * Useful for integrating with Next.js Link, React Router Link, etc.
   * @default 'a'
   */
  linkComponent?: React.ElementType;
}

/**
 * ApplicationLayoutNav component
 *
 * A pill-shaped navigation toggle designed to sit within the ApplicationLayout header.
 * Supports both client-side state switching (buttons) and routing (links).
 *
 * Features:
 * - Glass effect container
 * - Pill-shaped active state indicator
 * - Mixed mode support (links and buttons in same group)
 * - Framework-agnostic link rendering via `linkComponent`
 *
 * @example
 * ```tsx
 * // Client-side state switching
 * <ApplicationLayoutNav
 *   activeValue="tab1"
 *   options={[
 *     { value: 'tab1', label: 'Tab 1' },
 *     { value: 'tab2', label: 'Tab 2' }
 *   ]}
 *   onSelect={setTab}
 * />
 *
 * // Routing with Next.js Link
 * import Link from 'next/link';
 * <ApplicationLayoutNav
 *   linkComponent={Link}
 *   activeValue="home"
 *   options={[
 *     { value: 'home', label: 'Home', href: '/' },
 *     { value: 'settings', label: 'Settings', href: '/settings' }
 *   ]}
 * />
 * ```
 */
export function ApplicationLayoutNav({
  options,
  activeValue,
  onSelect,
  ariaLabel = 'View selection',
  linkComponent: LinkComponent = 'a',
}: ApplicationLayoutNavProps) {
  return (
    <div role="tablist" aria-label={ariaLabel}>
      <GlassCard padded={false} className="p-2 inline-flex gap-2 rounded-lg">
        {options.map((option) => {
          const isActive = option.value === activeValue;
          const className = cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface',
          );

          // Use LinkComponent if the option has an href
          if (option.href) {
            return (
              <LinkComponent
                key={option.value}
                href={option.href}
                role="tab"
                aria-selected={isActive}
                className={className}
              >
                {option.label}
              </LinkComponent>
            );
          }

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect?.(option.value)}
              className={className}
            >
              {option.label}
            </button>
          );
        })}
      </GlassCard>
    </div>
  );
}
