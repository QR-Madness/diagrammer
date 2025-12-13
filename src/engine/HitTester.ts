import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { Shape, Handle } from '../shapes/Shape';
import { shapeRegistry } from '../shapes/ShapeRegistry';
import { SpatialIndex } from './SpatialIndex';

/**
 * Result of a point hit test.
 */
export interface HitTestResult {
  /** The shape that was hit, or null if nothing */
  shape: Shape | null;
  /** The shape ID, or null if nothing */
  id: string | null;
}

/**
 * Result of a handle hit test.
 */
export interface HandleHitResult {
  /** The handle that was hit, or null if nothing */
  handle: Handle | null;
  /** The shape the handle belongs to, or null */
  shape: Shape | null;
  /** The shape ID, or null */
  shapeId: string | null;
}

/**
 * Hit tester for detecting shapes and handles under the cursor.
 *
 * Uses SpatialIndex for fast candidate filtering, then performs precise
 * hit testing using shape handlers from the registry.
 *
 * Hit testing respects z-order: shapes rendered later (on top) are
 * tested first so the topmost shape at a point is returned.
 *
 * Usage:
 * ```typescript
 * const hitTester = new HitTester(spatialIndex);
 *
 * // Test point
 * const result = hitTester.hitTestPoint(worldPoint, shapes, shapeOrder);
 * if (result.shape) {
 *   console.log('Hit shape:', result.id);
 * }
 *
 * // Test handles
 * const handleResult = hitTester.hitTestHandles(
 *   worldPoint,
 *   selectedShapes,
 *   handleSize
 * );
 * ```
 */
export class HitTester {
  private spatialIndex: SpatialIndex;

  constructor(spatialIndex: SpatialIndex) {
    this.spatialIndex = spatialIndex;
  }

  /**
   * Test if a point hits any shape.
   * Returns the topmost (highest z-order) shape at the point.
   *
   * @param worldPoint - Point in world coordinates
   * @param shapes - Map of shape ID to shape data
   * @param shapeOrder - Array of shape IDs in z-order (first = bottom)
   * @returns Hit test result with shape and ID
   */
  hitTestPoint(
    worldPoint: Vec2,
    shapes: Record<string, Shape>,
    shapeOrder: string[]
  ): HitTestResult {
    // Get candidates from spatial index
    const candidateIds = this.spatialIndex.queryPoint(worldPoint);

    if (candidateIds.length === 0) {
      return { shape: null, id: null };
    }

    // Create a set for O(1) lookup
    const candidateSet = new Set(candidateIds);

    // Test in reverse z-order (top to bottom)
    for (let i = shapeOrder.length - 1; i >= 0; i--) {
      const id = shapeOrder[i];
      if (!id || !candidateSet.has(id)) {
        continue;
      }

      const shape = shapes[id];
      if (!shape) {
        continue;
      }

      // Skip locked shapes for hit testing (optional behavior)
      // if (shape.locked) continue;

      try {
        const handler = shapeRegistry.getHandler(shape.type);
        if (handler.hitTest(shape, worldPoint)) {
          return { shape, id };
        }
      } catch {
        // Shape type not registered - skip
      }
    }

    return { shape: null, id: null };
  }

  /**
   * Test if a point hits any shape, without using the spatial index.
   * Slower but useful when index may be out of sync.
   *
   * @param worldPoint - Point in world coordinates
   * @param shapes - Map of shape ID to shape data
   * @param shapeOrder - Array of shape IDs in z-order (first = bottom)
   * @returns Hit test result with shape and ID
   */
  hitTestPointDirect(
    worldPoint: Vec2,
    shapes: Record<string, Shape>,
    shapeOrder: string[]
  ): HitTestResult {
    // Test in reverse z-order (top to bottom)
    for (let i = shapeOrder.length - 1; i >= 0; i--) {
      const id = shapeOrder[i];
      if (!id) continue;

      const shape = shapes[id];
      if (!shape) continue;

      try {
        const handler = shapeRegistry.getHandler(shape.type);
        if (handler.hitTest(shape, worldPoint)) {
          return { shape, id };
        }
      } catch {
        // Shape type not registered - skip
      }
    }

    return { shape: null, id: null };
  }

  /**
   * Find all shapes intersecting a rectangle (for marquee selection).
   * Uses spatial index for candidate filtering, then checks bounds intersection.
   *
   * @param rect - Selection rectangle in world coordinates
   * @param shapes - Map of shape ID to shape data
   * @param shapeOrder - Array of shape IDs in z-order
   * @returns Array of shapes intersecting the rectangle
   */
  hitTestRect(
    rect: Box,
    shapes: Record<string, Shape>,
    shapeOrder: string[]
  ): Shape[] {
    // Get candidates from spatial index
    const candidateIds = this.spatialIndex.queryRect(rect);

    if (candidateIds.length === 0) {
      return [];
    }

    const candidateSet = new Set(candidateIds);
    const results: Shape[] = [];

    // Return in z-order (bottom to top)
    for (const id of shapeOrder) {
      if (!candidateSet.has(id)) {
        continue;
      }

      const shape = shapes[id];
      if (!shape) {
        continue;
      }

      // For now, we consider a shape selected if its bounds intersect
      // More precise intersection testing could be added later
      try {
        const handler = shapeRegistry.getHandler(shape.type);
        const bounds = handler.getBounds(shape);
        if (rect.intersects(bounds)) {
          results.push(shape);
        }
      } catch {
        // Shape type not registered - skip
      }
    }

    return results;
  }

  /**
   * Find all shape IDs intersecting a rectangle.
   *
   * @param rect - Selection rectangle in world coordinates
   * @param shapes - Map of shape ID to shape data
   * @param shapeOrder - Array of shape IDs in z-order
   * @returns Array of shape IDs intersecting the rectangle
   */
  hitTestRectIds(
    rect: Box,
    shapes: Record<string, Shape>,
    shapeOrder: string[]
  ): string[] {
    return this.hitTestRect(rect, shapes, shapeOrder).map((s) => s.id);
  }

  /**
   * Test if a point hits any resize/rotate handle.
   * Handles are tested for the given shapes (typically selected shapes).
   *
   * @param worldPoint - Point in world coordinates
   * @param shapes - Shapes to get handles for
   * @param handleSize - Size of handle hit area in world units
   * @returns Handle hit result
   */
  hitTestHandles(
    worldPoint: Vec2,
    shapes: Shape[],
    handleSize: number = 10
  ): HandleHitResult {
    const halfSize = handleSize / 2;

    // Test shapes in reverse order (topmost first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (!shape) continue;

      try {
        const handler = shapeRegistry.getHandler(shape.type);
        const handles = handler.getHandles(shape);

        for (const handle of handles) {
          // Check if point is within handle bounds
          if (
            worldPoint.x >= handle.x - halfSize &&
            worldPoint.x <= handle.x + halfSize &&
            worldPoint.y >= handle.y - halfSize &&
            worldPoint.y <= handle.y + halfSize
          ) {
            return {
              handle,
              shape,
              shapeId: shape.id,
            };
          }
        }
      } catch {
        // Shape type not registered - skip
      }
    }

    return { handle: null, shape: null, shapeId: null };
  }

  /**
   * Get handles for multiple shapes.
   * Useful for rendering selection handles.
   *
   * @param shapes - Shapes to get handles for
   * @returns Array of handles with their parent shape IDs
   */
  getHandlesForShapes(shapes: Shape[]): Array<Handle & { shapeId: string }> {
    const allHandles: Array<Handle & { shapeId: string }> = [];

    for (const shape of shapes) {
      try {
        const handler = shapeRegistry.getHandler(shape.type);
        const handles = handler.getHandles(shape);
        for (const handle of handles) {
          allHandles.push({ ...handle, shapeId: shape.id });
        }
      } catch {
        // Shape type not registered - skip
      }
    }

    return allHandles;
  }

  /**
   * Update the spatial index reference.
   * Call this if the index is rebuilt externally.
   */
  setSpatialIndex(index: SpatialIndex): void {
    this.spatialIndex = index;
  }
}

/**
 * Create a hit tester with a new spatial index populated from shapes.
 */
export function createHitTester(shapes: Shape[]): HitTester {
  const index = new SpatialIndex();
  index.rebuild(shapes);
  return new HitTester(index);
}
