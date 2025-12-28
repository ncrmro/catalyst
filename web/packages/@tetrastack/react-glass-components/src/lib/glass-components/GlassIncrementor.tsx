'use client';

import type React from 'react';
import { useState, useTransition } from 'react';
import { cn } from './utils';
import { GlassSurface } from './GlassSurface';

export interface GlassIncrementorProps {
  value: number;
  onChange: (newValue: number) => Promise<void> | void;
  disabled?: boolean;
  min?: number;
  max?: number;
  showAddButton?: boolean;
}

/**
 * Increment/decrement control with glass styling.
 */
export function GlassIncrementor({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 7,
  showAddButton = true,
}: GlassIncrementorProps) {
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleValueChange = async (newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue));

    if (clampedValue === value) return;

    setIsUpdating(true);
    startTransition(async () => {
      try {
        await onChange(clampedValue);
      } catch (error) {
        console.error('Error updating value:', error);
      } finally {
        setIsUpdating(false);
      }
    });
  };

  const handleIncrement = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleValueChange(value + 1);
  };

  const handleDecrement = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleValueChange(value - 1);
  };

  const isDisabled = disabled || isPending || isUpdating;

  if (value === min && showAddButton) {
    return (
      <button
        className={cn(
          'h-10 w-10 p-0 rounded-md transition-all',
          'hover:bg-primary/20 active:bg-primary/30',
          'text-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        onClick={handleIncrement}
        disabled={isDisabled}
        aria-label="Add item"
        data-testid="incrementor"
        type="button"
      >
        <svg
          className="h-5 w-5 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    );
  }

  return (
    <GlassSurface
      intensity="light"
      bordered
      shadowed={false}
      className="inline-flex items-center gap-2 bg-primary/10 rounded-lg p-1 w-auto"
      data-testid="incrementor"
    >
      <button
        className={cn(
          'h-8 w-8 p-0 rounded-md transition-all',
          'hover:bg-primary/20 active:bg-primary/30',
          'text-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        onClick={handleDecrement}
        disabled={isDisabled || value <= min}
        aria-label="Decrease value"
        type="button"
      >
        <svg
          className="h-4 w-4 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>

      <div className="flex items-center justify-center min-w-[2rem] px-2">
        <span className="text-sm font-medium text-primary">
          {isUpdating ? '...' : value}
        </span>
      </div>

      <button
        className={cn(
          'h-8 w-8 p-0 rounded-md transition-all',
          'hover:bg-primary/20 active:bg-primary/30',
          'text-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        onClick={handleIncrement}
        disabled={isDisabled || value >= max}
        aria-label="Increase value"
        type="button"
      >
        <svg
          className="h-4 w-4 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </GlassSurface>
  );
}
