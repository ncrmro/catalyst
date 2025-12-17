import * as React from 'react';
import { cn } from './utils';
import { GlassSurface, GlassSurfaceProps } from './GlassSurface';

export interface GlassCardProps
  extends Omit<GlassSurfaceProps, 'bordered' | 'shadowed'> {
  /**
   * Enable glass-morphism effect (backdrop-filter blur + semi-transparent background)
   * Set to false to disable glass effect for performance when nesting components
   * @default true
   */
  glass?: boolean;

  /**
   * Whether to add padding to the card
   */
  padded?: boolean;

  /**
   * Corner radius variant
   */
  rounded?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Color variant for the card
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error';
}

/**
 * GlassCard - Card component with glass-morphism effect
 */
export function GlassCard({
  className,
  glass = true,
  padded = true,
  rounded = 'xl',
  intensity = 'medium',
  variant = 'default',
  children,
  ...props
}: GlassCardProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
  };

  return (
    <GlassSurface
      glass={glass}
      intensity={intensity}
      variant={variant}
      bordered
      shadowed
      className={cn(roundedClasses[rounded], padded && 'p-6', className)}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

export type GlassCardHeaderProps = React.ComponentProps<'div'>;

export function GlassCardHeader({ className, ...props }: GlassCardHeaderProps) {
  return <div className={cn('mb-4', className)} {...props} />;
}

type GlassCardTitleOwnProps = {
  /**
   * The HTML element to render as
   * @default 'h3'
   */
  as?: React.ElementType;
};

export type GlassCardTitleProps<T extends React.ElementType = 'h3'> =
  GlassCardTitleOwnProps &
    Omit<React.ComponentPropsWithoutRef<T>, keyof GlassCardTitleOwnProps>;

export function GlassCardTitle<T extends React.ElementType = 'h3'>({
  as,
  className,
  ...props
}: GlassCardTitleProps<T>) {
  const Component = as || 'h3';
  return (
    <Component
      className={cn('text-2xl font-semibold text-on-surface', className)}
      {...props}
    />
  );
}

export type GlassCardDescriptionProps = React.ComponentProps<'p'>;

export function GlassCardDescription({
  className,
  ...props
}: GlassCardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-on-surface-variant mt-1', className)}
      {...props}
    />
  );
}

export type GlassCardContentProps = React.ComponentProps<'div'>;

export function GlassCardContent({
  className,
  ...props
}: GlassCardContentProps) {
  return <div className={cn('', className)} {...props} />;
}

export type GlassCardFooterProps = React.ComponentProps<'div'>;

export function GlassCardFooter({ className, ...props }: GlassCardFooterProps) {
  return (
    <div
      className={cn('mt-auto pt-4 flex items-center gap-2', className)}
      {...props}
    />
  );
}
