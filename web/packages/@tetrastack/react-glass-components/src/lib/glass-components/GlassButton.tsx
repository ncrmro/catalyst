import React from 'react';
import { cn } from './utils';
import { GlassSurface } from './GlassSurface';

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The variant of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error';
  /**
   * The size of the button
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Whether to render as a link-style button
   */
  asChild?: boolean;
}

/**
 * GlassButton component with glass-morphism styling
 *
 * Features:
 * - Glass effect with backdrop blur (using GlassSurface)
 * - Multiple color variants (primary, secondary, tertiary, error)
 * - Multiple sizes (small, medium, large)
 * - Hover and active states
 * - Accessible with proper focus styles
 *
 * @example
 * ```tsx
 * <GlassButton variant="primary">Click me</GlassButton>
 * <GlassButton variant="secondary" size="small">Small button</GlassButton>
 * ```
 */
export function GlassButton({
  variant = 'primary',
  size = 'medium',
  className,
  children,
  ...props
}: GlassButtonProps) {
  const variantStyles = {
    primary:
      'bg-primary/20 text-primary hover:bg-primary/30 active:bg-primary/40',
    secondary:
      'bg-secondary/20 text-secondary hover:bg-secondary/30 active:bg-secondary/40',
    tertiary:
      'bg-tertiary/20 text-tertiary hover:bg-tertiary/30 active:bg-tertiary/40',
    error: 'bg-error/20 text-error hover:bg-error/30 active:bg-error/40',
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <GlassSurface<'button'>
      as="button"
      intensity="medium"
      bordered
      shadowed={false}
      className={cn(
        'rounded-lg font-medium transition-all duration-200',
        variantStyles[variant],
        sizeStyles[size],
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

/**
 * GlassButton component as a link (anchor tag)
 */
export interface GlassButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error';
  size?: 'small' | 'medium' | 'large';
}

export function GlassButtonLink({
  variant = 'primary',
  size = 'medium',
  className,
  children,
  ...props
}: GlassButtonLinkProps) {
  const variantStyles = {
    primary:
      'bg-primary/20 text-primary hover:bg-primary/30 active:bg-primary/40',
    secondary:
      'bg-secondary/20 text-secondary hover:bg-secondary/30 active:bg-secondary/40',
    tertiary:
      'bg-tertiary/20 text-tertiary hover:bg-tertiary/30 active:bg-tertiary/40',
    error: 'bg-error/20 text-error hover:bg-error/30 active:bg-error/40',
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <GlassSurface<'a'>
      as="a"
      intensity="medium"
      bordered
      shadowed={false}
      className={cn(
        'inline-block rounded-lg font-medium transition-all duration-200 no-underline text-center',
        variantStyles[variant],
        sizeStyles[size],
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}
