import React from 'react';
import { GlassCard } from './GlassCard';
import { cn } from './utils';

export interface ApplicationLayoutProps {
  /**
   * The header content, typically the application title or logo.
   * Aligned to the left of the sticky header.
   */
  header: React.ReactNode;
  /**
   * The navigation content, typically ApplicationLayoutNav.
   * Aligned to the right of the sticky header.
   */
  nav?: React.ReactNode;
  /**
   * The main content of the application.
   * Renders below the sticky header.
   */
  children: React.ReactNode;
  /**
   * Optional className for the outer container.
   * Useful for layout adjustments or spacing overrides.
   */
  className?: string;
}

/**
 * ApplicationLayout component
 *
 * A comprehensive layout shell for glass-morphism applications.
 * Provides a sticky, glass-effect header bar and a main content area.
 *
 * Features:
 * - Sticky header that stays visible on scroll
 * - Glass effect on header for content pass-through visibility
 * - Responsive padding and spacing
 * - Slot-based architecture (header, nav, children)
 *
 * @example
 * ```tsx
 * <ApplicationLayout
 *   header={<h1 className="text-xl font-bold">My App</h1>}
 *   nav={
 *     <ApplicationLayoutNav
 *       activeValue="home"
 *       options={[{ value: 'home', label: 'Home', href: '/' }]}
 *     />
 *   }
 * >
 *   <div className="grid gap-4">
 *     <GlassCard>Content 1</GlassCard>
 *     <GlassCard>Content 2</GlassCard>
 *   </div>
 * </ApplicationLayout>
 * ```
 */
export function ApplicationLayout({
  header,
  nav,
  children,
  className,
}: ApplicationLayoutProps) {
  return (
    <div
      className={cn('min-h-screen flex flex-col gap-6 p-4 sm:p-6', className)}
    >
      <GlassCard
        glass={false}
        className="flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50"
      >
        <div className="text-lg font-semibold text-on-surface">{header}</div>
        {nav && <div className="flex-shrink-0">{nav}</div>}
      </GlassCard>

      <main className="flex-1">{children}</main>
    </div>
  );
}
