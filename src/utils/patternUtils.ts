/**
 * Utility functions for creating canvas patterns and gradients.
 * Used by group shapes for background styling.
 */

import { Box } from '../math/Box';
import type { PatternConfig, GradientStop } from '../shapes/GroupStyles';

/**
 * Create a fill style (pattern, gradient, or solid color) from a pattern config.
 */
export function createPatternFill(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
  bounds: Box
): CanvasPattern | CanvasGradient | string {
  switch (config.type) {
    case 'none':
      return 'transparent';

    case 'solid':
      return config.color1 || '#ffffff';

    case 'stripes':
      return createStripesPattern(ctx, config);

    case 'hazard':
      return createHazardPattern(ctx, config);

    case 'gradient-linear':
      return createLinearGradient(ctx, config, bounds);

    case 'gradient-radial':
      return createRadialGradient(ctx, config, bounds);

    default:
      return config.color1 || '#ffffff';
  }
}

/**
 * Create a diagonal stripes pattern.
 * Uses a tileable pattern with rotation applied via canvas transform.
 */
function createStripesPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig
): CanvasPattern | string {
  const color1 = config.color1 || '#ffffff';
  const color2 = config.color2 || '#cccccc';
  const spacing = config.spacing || 10;
  const angle = config.angle || 45;

  // Create a larger pattern canvas to ensure proper tiling after rotation
  // The diagonal of a square pattern needs to tile properly
  const stripeWidth = spacing / 2;
  const patternSize = spacing * 2;

  // For rotated patterns, we need a larger canvas to avoid gaps
  const diagonal = Math.ceil(patternSize * Math.SQRT2) + 2;
  const canvasSize = diagonal * 2;

  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = canvasSize;
  patternCanvas.height = canvasSize;

  const pCtx = patternCanvas.getContext('2d');
  if (!pCtx) return color1;

  // Fill entire canvas with background color
  pCtx.fillStyle = color1;
  pCtx.fillRect(0, 0, canvasSize, canvasSize);

  // Apply rotation around center
  const rad = (angle * Math.PI) / 180;
  pCtx.translate(canvasSize / 2, canvasSize / 2);
  pCtx.rotate(rad);
  pCtx.translate(-canvasSize / 2, -canvasSize / 2);

  // Draw vertical stripes (will appear rotated)
  pCtx.fillStyle = color2;
  const numStripes = Math.ceil(canvasSize * 2 / spacing) + 2;
  for (let i = -numStripes; i < numStripes; i++) {
    const x = i * spacing;
    pCtx.fillRect(x, -canvasSize, stripeWidth, canvasSize * 3);
  }

  const pattern = ctx.createPattern(patternCanvas, 'repeat');
  return pattern || color1;
}

/**
 * Create a hazard/warning stripes pattern (alternating yellow/black diagonal stripes).
 * Uses equal-width alternating stripes for the classic hazard look.
 */
function createHazardPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig
): CanvasPattern | string {
  const color1 = config.color1 || '#ffcc00'; // Warning yellow
  const color2 = config.color2 || '#000000'; // Black
  const spacing = config.spacing || 20;
  const angle = config.angle || 45;

  // Hazard stripes use equal-width alternating bands
  const stripeWidth = spacing / 2;
  const patternSize = spacing * 2;

  // Use larger canvas for proper rotation tiling
  const diagonal = Math.ceil(patternSize * Math.SQRT2) + 2;
  const canvasSize = diagonal * 2;

  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = canvasSize;
  patternCanvas.height = canvasSize;

  const pCtx = patternCanvas.getContext('2d');
  if (!pCtx) return color1;

  // Apply rotation around center
  const rad = (angle * Math.PI) / 180;
  pCtx.translate(canvasSize / 2, canvasSize / 2);
  pCtx.rotate(rad);
  pCtx.translate(-canvasSize / 2, -canvasSize / 2);

  // Draw alternating vertical stripes (will appear rotated)
  const numStripes = Math.ceil(canvasSize * 2 / stripeWidth) + 4;
  for (let i = -numStripes; i < numStripes; i++) {
    pCtx.fillStyle = i % 2 === 0 ? color1 : color2;
    pCtx.fillRect(i * stripeWidth, -canvasSize, stripeWidth, canvasSize * 3);
  }

  const pattern = ctx.createPattern(patternCanvas, 'repeat');
  return pattern || color1;
}

/**
 * Create a linear gradient.
 */
function createLinearGradient(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
  bounds: Box
): CanvasGradient | string {
  const angle = config.angle || 0;
  const stops = config.gradientStops || [
    { offset: 0, color: config.color1 || '#ffffff' },
    { offset: 1, color: config.color2 || '#cccccc' },
  ];

  // Calculate gradient line based on angle
  const rad = (angle * Math.PI) / 180;
  const centerX = bounds.centerX;
  const centerY = bounds.centerY;
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;

  // Calculate gradient endpoints
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const length = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);

  const x1 = centerX - cos * length;
  const y1 = centerY - sin * length;
  const x2 = centerX + cos * length;
  const y2 = centerY + sin * length;

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  addGradientStops(gradient, stops);

  return gradient;
}

/**
 * Create a radial gradient.
 */
function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
  bounds: Box
): CanvasGradient | string {
  const stops = config.gradientStops || [
    { offset: 0, color: config.color1 || '#ffffff' },
    { offset: 1, color: config.color2 || '#cccccc' },
  ];

  const centerX = bounds.centerX;
  const centerY = bounds.centerY;
  const radius = Math.max(bounds.width, bounds.height) / 2;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  addGradientStops(gradient, stops);

  return gradient;
}

/**
 * Add color stops to a gradient.
 */
function addGradientStops(gradient: CanvasGradient, stops: GradientStop[]): void {
  // Sort stops by offset
  const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);

  for (const stop of sortedStops) {
    // Clamp offset to valid range
    const offset = Math.max(0, Math.min(1, stop.offset));
    gradient.addColorStop(offset, stop.color);
  }
}

/**
 * Create a rounded rectangle Path2D.
 */
export function createRoundedRectPath(bounds: Box, radius: number): Path2D {
  const path = new Path2D();
  const { minX, minY, maxX, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  // Clamp radius to half the smaller dimension
  const r = Math.min(radius, width / 2, height / 2);

  if (r <= 0) {
    // No rounding, just a rectangle
    path.rect(minX, minY, width, height);
  } else {
    // Rounded rectangle
    path.moveTo(minX + r, minY);
    path.lineTo(maxX - r, minY);
    path.arcTo(maxX, minY, maxX, minY + r, r);
    path.lineTo(maxX, maxY - r);
    path.arcTo(maxX, maxY, maxX - r, maxY, r);
    path.lineTo(minX + r, maxY);
    path.arcTo(minX, maxY, minX, maxY - r, r);
    path.lineTo(minX, minY + r);
    path.arcTo(minX, minY, minX + r, minY, r);
  }

  path.closePath();
  return path;
}

/**
 * Parse a CSS color string to RGBA components.
 * Returns null if parsing fails.
 */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex.charAt(0) + hex.charAt(0), 16),
        g: parseInt(hex.charAt(1) + hex.charAt(1), 16),
        b: parseInt(hex.charAt(2) + hex.charAt(2), 16),
        a: 1,
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // Handle rgba() and rgb()
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Convert RGBA components to a CSS color string.
 */
export function toRgbaString(r: number, g: number, b: number, a: number = 1): string {
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
