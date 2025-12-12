import { Box } from '../../math/Box';
import { Vec2 } from '../../math/Vec2';
import { Shape } from '../Shape';
import { shapeRegistry } from '../ShapeRegistry';

/**
 * Calculate the axis-aligned bounding box for a shape.
 * Delegates to the shape's registered handler.
 *
 * @param shape - The shape to calculate bounds for
 * @returns Axis-aligned bounding box in world coordinates
 */
export function calculateBounds(shape: Shape): Box {
  const handler = shapeRegistry.getHandler(shape.type);
  return handler.getBounds(shape);
}

/**
 * Calculate the combined bounding box for multiple shapes.
 *
 * @param shapes - Array of shapes to calculate bounds for
 * @returns Combined axis-aligned bounding box, or null if empty
 */
export function calculateCombinedBounds(shapes: Shape[]): Box | null {
  if (shapes.length === 0) {
    return null;
  }

  const firstShape = shapes[0];
  if (!firstShape) {
    return null;
  }

  let combined = calculateBounds(firstShape);

  for (let i = 1; i < shapes.length; i++) {
    const shape = shapes[i];
    if (shape) {
      const bounds = calculateBounds(shape);
      combined = combined.union(bounds);
    }
  }

  return combined;
}

/**
 * Transform a bounding box by applying rotation around a center point.
 * Returns a new axis-aligned bounding box that encompasses the rotated box.
 *
 * @param bounds - The original bounding box
 * @param rotation - Rotation angle in radians
 * @param center - Center point for rotation (defaults to box center)
 * @returns New axis-aligned bounding box encompassing the rotated original
 */
export function transformBounds(
  bounds: Box,
  rotation: number,
  center?: Vec2
): Box {
  if (rotation === 0) {
    return bounds;
  }

  const rotationCenter = center ?? bounds.center;

  // Get corners of the box
  const corners = [
    new Vec2(bounds.minX, bounds.minY),
    new Vec2(bounds.maxX, bounds.minY),
    new Vec2(bounds.maxX, bounds.maxY),
    new Vec2(bounds.minX, bounds.maxY),
  ];

  // Rotate each corner around the center
  const rotatedCorners = corners.map((corner) => {
    const relative = corner.subtract(rotationCenter);
    const rotated = relative.rotate(rotation);
    return rotated.add(rotationCenter);
  });

  // Find new axis-aligned bounds
  return Box.fromPointArray(rotatedCorners);
}

/**
 * Expand a bounding box by a padding amount on all sides.
 *
 * @param bounds - The original bounding box
 * @param padding - Amount to expand on each side
 * @returns Expanded bounding box
 */
export function expandBounds(bounds: Box, padding: number): Box {
  return new Box(
    bounds.minX - padding,
    bounds.minY - padding,
    bounds.maxX + padding,
    bounds.maxY + padding
  );
}

/**
 * Check if a point is inside any of the given shapes.
 *
 * @param shapes - Array of shapes to test against
 * @param worldPoint - Point in world coordinates
 * @returns The first shape containing the point, or null if none
 */
export function findShapeAtPoint(shapes: Shape[], worldPoint: Vec2): Shape | null {
  // Test in reverse order (top-most shapes first)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (!shape) continue;
    const handler = shapeRegistry.getHandler(shape.type);
    if (handler.hitTest(shape, worldPoint)) {
      return shape;
    }
  }
  return null;
}

/**
 * Find all shapes that intersect with a selection rectangle.
 *
 * @param shapes - Array of shapes to test
 * @param selectionBox - Selection rectangle in world coordinates
 * @returns Array of shapes that intersect with the selection
 */
export function findShapesInRect(shapes: Shape[], selectionBox: Box): Shape[] {
  const result: Shape[] = [];

  for (const shape of shapes) {
    const bounds = calculateBounds(shape);
    if (selectionBox.intersects(bounds)) {
      result.push(shape);
    }
  }

  return result;
}
