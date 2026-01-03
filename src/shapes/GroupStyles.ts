/**
 * Type definitions for group visual styling.
 * Includes patterns, gradients, shadows, and label positioning.
 */

/**
 * Pattern types for group backgrounds.
 */
export type PatternType =
  | 'none'
  | 'solid'
  | 'stripes'
  | 'hazard'
  | 'gradient-linear'
  | 'gradient-radial';

/**
 * Configuration for background patterns and gradients.
 */
export interface PatternConfig {
  type: PatternType;

  // For solid/stripes/hazard patterns:
  /** Primary color (used for solid fill or stripe color 1) */
  color1?: string;
  /** Secondary color (used for stripe color 2) */
  color2?: string;
  /** Pattern angle in degrees (default: 45) */
  angle?: number;
  /** Spacing between pattern elements in pixels (default: 10) */
  spacing?: number;

  // For gradients:
  /** Gradient color stops */
  gradientStops?: GradientStop[];
}

/**
 * A color stop in a gradient.
 */
export interface GradientStop {
  /** Position along the gradient (0-1) */
  offset: number;
  /** Color at this stop */
  color: string;
}

/**
 * Configuration for drop shadow or glow effects.
 */
export interface ShadowConfig {
  /** Whether shadow is enabled */
  enabled: boolean;
  /** Horizontal offset in pixels (default: 4) */
  offsetX: number;
  /** Vertical offset in pixels (default: 4) */
  offsetY: number;
  /** Blur radius in pixels (default: 8) */
  blur: number;
  /** Shadow color (default: rgba(0,0,0,0.3)) */
  color: string;
}

/**
 * Position options for group labels.
 * Labels can be positioned at any of 9 anchor points.
 */
export type GroupLabelPosition =
  | 'center'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'right';

/**
 * Default pattern configuration.
 */
export const DEFAULT_PATTERN_CONFIG: PatternConfig = {
  type: 'solid',
  color1: '#ffffff',
  color2: '#000000',
  angle: 45,
  spacing: 10,
};

/**
 * Default shadow configuration.
 */
export const DEFAULT_SHADOW_CONFIG: ShadowConfig = {
  enabled: false,
  offsetX: 4,
  offsetY: 4,
  blur: 8,
  color: 'rgba(0, 0, 0, 0.3)',
};

/**
 * Preset shadow configurations.
 */
export const SHADOW_PRESETS = {
  /** Standard drop shadow */
  dropShadow: {
    enabled: true,
    offsetX: 4,
    offsetY: 4,
    blur: 8,
    color: 'rgba(0, 0, 0, 0.3)',
  },
  /** Soft large shadow */
  softShadow: {
    enabled: true,
    offsetX: 6,
    offsetY: 6,
    blur: 16,
    color: 'rgba(0, 0, 0, 0.2)',
  },
  /** Glow effect (no offset) */
  glow: {
    enabled: true,
    offsetX: 0,
    offsetY: 0,
    blur: 12,
    color: 'rgba(33, 150, 243, 0.5)',
  },
  /** Subtle inner glow */
  subtleGlow: {
    enabled: true,
    offsetX: 0,
    offsetY: 0,
    blur: 8,
    color: 'rgba(255, 255, 255, 0.6)',
  },
} as const;

/**
 * Border dash patterns.
 */
export const BORDER_DASH_PATTERNS = {
  solid: [],
  dashed: [8, 4],
  dotted: [2, 4],
  dashDot: [8, 4, 2, 4],
} as const;

/**
 * Pattern type display names for UI.
 */
export const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
  none: 'None',
  solid: 'Solid',
  stripes: 'Stripes',
  hazard: 'Hazard',
  'gradient-linear': 'Linear Gradient',
  'gradient-radial': 'Radial Gradient',
};

/**
 * Label position display names for UI.
 */
export const LABEL_POSITION_LABELS: Record<GroupLabelPosition, string> = {
  center: 'Center',
  top: 'Top',
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  bottom: 'Bottom',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
  left: 'Left',
  right: 'Right',
};
