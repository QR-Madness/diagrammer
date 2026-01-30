/**
 * Utility functions for context menu positioning.
 */

/**
 * Clamp context menu position to stay within viewport bounds.
 * @param x - Initial x position (clientX from mouse event)
 * @param y - Initial y position (clientY from mouse event)
 * @param menuWidth - Estimated or measured width of the menu
 * @param menuHeight - Estimated or measured height of the menu
 * @param padding - Padding from viewport edges (default: 8)
 * @returns Adjusted { x, y } position
 */
export function clampToViewport(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  padding: number = 8
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let newX = x;
  let newY = y;

  // Clamp to right edge
  if (x + menuWidth > viewportWidth - padding) {
    newX = Math.max(padding, viewportWidth - menuWidth - padding);
  }

  // Clamp to bottom edge
  if (y + menuHeight > viewportHeight - padding) {
    newY = Math.max(padding, viewportHeight - menuHeight - padding);
  }

  // Clamp to left edge
  if (newX < padding) {
    newX = padding;
  }

  // Clamp to top edge
  if (newY < padding) {
    newY = padding;
  }

  return { x: newX, y: newY };
}

/**
 * Estimate menu dimensions based on common context menu sizes.
 * Use actual measurement with useLayoutEffect for more accuracy.
 */
export const MENU_SIZE_ESTIMATES = {
  /** Small menu (2-3 items) */
  small: { width: 140, height: 100 },
  /** Medium menu (4-6 items) */
  medium: { width: 180, height: 180 },
  /** Large menu (7+ items) */
  large: { width: 200, height: 280 },
} as const;
