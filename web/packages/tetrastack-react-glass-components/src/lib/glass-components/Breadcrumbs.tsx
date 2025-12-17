import type * as React from 'react';
import { cn } from './utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isHome?: boolean;
}

export interface BreadcrumbsProps extends React.ComponentProps<'nav'> {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  /** Optional home icon component to display for home breadcrumbs */
  HomeIcon?: React.ComponentType<{
    className?: string;
    'aria-hidden'?: boolean;
  }>;
  /** Optional separator icon component between breadcrumbs */
  SeparatorIcon?: React.ComponentType<{
    className?: string;
    'aria-hidden'?: boolean;
  }>;
  LinkComponent?: React.ElementType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

/**
 * Framework-agnostic breadcrumb navigation component.
 */
export function Breadcrumbs({
  className,
  items,
  showHomeIcon = true,
  HomeIcon,
  SeparatorIcon,
  LinkComponent = 'a',
  ...props
}: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-2 text-sm', className)}
      {...props}
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          const showIcon = isFirst && item.isHome && showHomeIcon;

          return (
            <li key={index} className="flex items-center space-x-2">
              {index > 0 && SeparatorIcon && (
                <SeparatorIcon
                  className="h-4 w-4 text-on-surface-variant"
                  aria-hidden={true}
                />
              )}
              {index > 0 && !SeparatorIcon && (
                <span className="text-on-surface-variant" aria-hidden="true">
                  /
                </span>
              )}

              {item.href && !isLast ? (
                <LinkComponent
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 hover:text-primary transition-colors',
                    isLast
                      ? 'text-on-surface font-medium cursor-default'
                      : 'text-on-surface-variant',
                  )}
                >
                  {showIcon && HomeIcon && (
                    <HomeIcon className="h-4 w-4" aria-hidden={true} />
                  )}
                  <span>{item.label}</span>
                </LinkComponent>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1',
                    isLast
                      ? 'text-on-surface font-medium'
                      : 'text-on-surface-variant',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {showIcon && HomeIcon && (
                    <HomeIcon className="h-4 w-4" aria-hidden={true} />
                  )}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
