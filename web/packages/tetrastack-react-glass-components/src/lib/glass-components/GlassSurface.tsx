import * as React from 'react';
import { cn } from './utils';

type GlassSurfaceOwnProps = {
  /**
   * The HTML element to render as
   * @default 'div'
   */
  as?: React.ElementType;

  /**
   * Enable glass-morphism effect (backdrop-filter blur + semi-transparent background)
   * Set to false to disable glass effect for performance when nesting components
   * @default true
   */
  glass?: boolean;

  /**
   * Intensity of the glass effect - controls both blur and opacity
   * - 'light': Subtle glass effect with minimal blur (10% opacity)
   * - 'medium': Balanced glass effect (20% opacity)
   * - 'strong': Intense glass effect with strong blur (30% opacity)
   */
  intensity?: 'light' | 'medium' | 'strong';

  /**
   * Color variant for tinting
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error';

  /**
   * Whether to show a border
   */
  bordered?: boolean;

  /**
   * Whether to show a shadow
   */
  shadowed?: boolean;
};

export type GlassSurfaceProps<T extends React.ElementType = 'div'> =
  GlassSurfaceOwnProps &
    Omit<React.ComponentPropsWithoutRef<T>, keyof GlassSurfaceOwnProps>;

/**
 * GlassSurface - Base component for glass-morphism effect
 *
 * Creates a frosted glass appearance using backdrop-filter and semi-transparent backgrounds.
 * The intensity prop controls both blur strength and background opacity for a cohesive glass effect.
 * This component serves as the foundation for other glass components like GlassCard and GlassNav.
 *
 * Example usage:
 * ```tsx
 * <GlassSurface intensity="medium" bordered shadowed>
 *   <p>Content with glass effect</p>
 * </GlassSurface>
 * <GlassSurface as="button" intensity="strong" variant="primary">
 *   <p>Strong glass button with more opacity</p>
 * </GlassSurface>
 * ```
 */
export function GlassSurface<T extends React.ElementType = 'div'>({
  as,
  className,
  glass = true,
  intensity = 'light',
  variant = 'default',
  bordered = true,
  shadowed = true,
  children,
  ...props
}: GlassSurfaceProps<T>) {
  const Component = as || 'div';

  // Intensity controls both blur and opacity
  const intensityClasses = {
    light: 'backdrop-blur-sm',
    medium: 'backdrop-blur-md',
    strong: 'backdrop-blur-lg',
  };

  const opacityMap = {
    light: '10',
    medium: '20',
    strong: '30',
  };

  const variantColorMap = {
    default: 'surface',
    primary: 'primary',
    secondary: 'secondary',
    tertiary: 'tertiary',
    error: 'error',
  };

  // Combine variant color with intensity-based opacity for glass effect
  // When glass=false, use solid background instead
  const variantClass = glass
    ? `bg-${variantColorMap[variant]}/${opacityMap[intensity]}`
    : `bg-${variantColorMap[variant]}`;

  return (
    <Component
      className={cn(
        // Base glass effect (blur + opacity based on intensity) - only when glass=true
        glass && intensityClasses[intensity],
        variantClass,
        // Border
        bordered && 'border border-white/30 dark:border-gray-500/30',
        // Shadow
        shadowed && 'shadow-xl',
        // Custom classes
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
