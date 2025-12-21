/**
 * Terminal resize handling utilities
 *
 * Provides throttled resize handling for terminal sessions.
 */

import type { TerminalSize } from "./shell";

/**
 * Throttled resize queue
 *
 * Prevents excessive resize events by throttling to a maximum rate.
 */
export class TerminalResizeQueue {
  private pendingResize: TerminalSize | null = null;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly throttleMs: number;
  private readonly onResize: (size: TerminalSize) => void;

  /**
   * Create a new resize queue
   *
   * @param onResize - Callback when a resize should be sent
   * @param throttleMs - Minimum time between resize events (default: 100ms)
   */
  constructor(onResize: (size: TerminalSize) => void, throttleMs = 100) {
    this.onResize = onResize;
    this.throttleMs = throttleMs;
  }

  /**
   * Queue a resize event
   *
   * If a resize is already pending, this will update the pending size.
   * The actual resize will be sent after the throttle period.
   */
  enqueue(cols: number, rows: number): void {
    this.pendingResize = { cols, rows };

    if (!this.throttleTimer) {
      this.throttleTimer = setTimeout(() => {
        if (this.pendingResize) {
          this.onResize(this.pendingResize);
          this.pendingResize = null;
        }
        this.throttleTimer = null;
      }, this.throttleMs);
    }
  }

  /**
   * Flush any pending resize immediately
   */
  flush(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }

    if (this.pendingResize) {
      this.onResize(this.pendingResize);
      this.pendingResize = null;
    }
  }

  /**
   * Cancel any pending resize
   */
  cancel(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.pendingResize = null;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancel();
  }
}

/**
 * Calculate terminal size from container dimensions
 *
 * @param containerWidth - Width in pixels
 * @param containerHeight - Height in pixels
 * @param charWidth - Character width in pixels (default: 9)
 * @param charHeight - Character height in pixels (default: 17)
 */
export function calculateTerminalSize(
  containerWidth: number,
  containerHeight: number,
  charWidth = 9,
  charHeight = 17,
): TerminalSize {
  const cols = Math.max(1, Math.floor(containerWidth / charWidth));
  const rows = Math.max(1, Math.floor(containerHeight / charHeight));

  return { cols, rows };
}

/**
 * Create a debounced resize handler for window/container resize events
 *
 * @param callback - Function to call with new terminal size
 * @param getContainerSize - Function to get current container dimensions
 * @param debounceMs - Debounce delay (default: 100ms)
 */
export function createResizeHandler(
  callback: (size: TerminalSize) => void,
  getContainerSize: () => { width: number; height: number },
  debounceMs = 100,
): { handler: () => void; destroy: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const handler = (): void => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      const { width, height } = getContainerSize();
      const size = calculateTerminalSize(width, height);
      callback(size);
      timer = null;
    }, debounceMs);
  };

  const destroy = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { handler, destroy };
}
