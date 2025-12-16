import React from 'react';
import { cn } from './utils';
import { GlassSurface, GlassSurfaceProps } from './GlassSurface';

export interface GlassCardProps extends GlassSurfaceProps {
  /**
   * Whether to apply default padding (p-6)
   * Set to false when you need full-bleed content (like images) or custom padding
   * @default true
   */
  padded?: boolean;
}

/**
 * GlassCard component
 *
 * A high-level container component that implements the glass-morphism effect
 * with standard card styling (rounded corners, overflow handling).
 *
 * Features:
 * - Extends GlassSurface capabilities (intensity, variants, etc.)
 * - Standardized rounded corners (rounded-xl)
 * - Optional default padding
 * - Overflow protection
 *
 * @example
 * ```tsx
 * // Standard card
 * <GlassCard>
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </GlassCard>
 *
 * // Full-bleed card (e.g., for images)
 * <GlassCard padded={false}>
 *   <img src="..." />
 *   <div className="p-4">Caption</div>
 * </GlassCard>
 * ```
 */
export function GlassCard({
  className,
  padded = true,
  children,
  ...props
}: GlassCardProps) {
  return (
    <GlassSurface
      className={cn('rounded-xl overflow-hidden', padded && 'p-6', className)}
      intensity="light"
      {...props}
    >
      {children}
    </GlassSurface>
  );
}
