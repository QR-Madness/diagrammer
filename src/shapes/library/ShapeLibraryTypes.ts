/**
 * Types for defining library shapes.
 *
 * Library shapes are defined declaratively with path builders and anchor definitions.
 * The LibraryShapeHandler factory creates ShapeHandler implementations from these definitions.
 */

import type { ShapeMetadata } from '../ShapeMetadata';
import type { AnchorPosition } from '../Shape';

/**
 * Path builder function that creates a Path2D from shape dimensions.
 * The path should be centered at origin (0, 0).
 *
 * @param width - Shape width in world units
 * @param height - Shape height in world units
 * @returns A Path2D representing the shape geometry
 */
export type PathBuilder = (width: number, height: number) => Path2D;

/**
 * Anchor definition for connector attachment points.
 * Positions are calculated relative to shape center.
 */
export interface AnchorDefinition {
  /** Semantic position (top, right, bottom, left, center) */
  position: AnchorPosition;
  /** X offset calculator from shape center */
  x: (width: number, height: number) => number;
  /** Y offset calculator from shape center */
  y: (width: number, height: number) => number;
}

/**
 * Definition for a library shape type.
 *
 * This declarative structure is used to generate ShapeHandlers at runtime.
 * It includes:
 * - Shape metadata for UI (name, icon, category, properties)
 * - Path builder for rendering the shape geometry
 * - Anchor definitions for connector attachment
 */
export interface LibraryShapeDefinition {
  /** Shape type identifier (e.g., 'diamond', 'terminator') */
  type: string;

  /** Metadata for UI rendering (PropertyPanel, ShapePicker) */
  metadata: ShapeMetadata;

  /**
   * Path builder function.
   * Returns a Path2D centered at origin with given dimensions.
   */
  pathBuilder: PathBuilder;

  /**
   * Anchor points for connector attachment.
   * Positions are relative to shape center.
   */
  anchors: AnchorDefinition[];

  /**
   * Optional custom hit test mode.
   * - 'path': Use Path2D.isPointInPath (default, accurate for complex shapes)
   * - 'bounds': Use bounding box (faster, less accurate)
   */
  hitTestMode?: 'path' | 'bounds';
}

/**
 * Standard 5-anchor pattern for most shapes.
 * Provides center and 4 cardinal directions.
 */
export function createStandardAnchors(): AnchorDefinition[] {
  return [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'top', x: () => 0, y: (_, h) => -h / 2 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
    { position: 'bottom', x: () => 0, y: (_, h) => h / 2 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
  ];
}

/**
 * Diamond-specific anchors (at the 4 points).
 */
export function createDiamondAnchors(): AnchorDefinition[] {
  return [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'top', x: () => 0, y: (_, h) => -h / 2 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
    { position: 'bottom', x: () => 0, y: (_, h) => h / 2 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
  ];
}

/**
 * Hexagon-specific anchors (6 points).
 */
export function createHexagonAnchors(): AnchorDefinition[] {
  return [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'top', x: () => 0, y: (_, h) => -h / 2 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
    { position: 'bottom', x: () => 0, y: (_, h) => h / 2 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
  ];
}
