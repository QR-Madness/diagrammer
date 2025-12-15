import { Shape } from '../Shape';
import { shapeRegistry } from '../ShapeRegistry';
import { Box } from '../../math/Box';

/**
 * Alignment direction options
 */
export type HorizontalAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

/**
 * Distribution direction options
 */
export type DistributionDirection = 'horizontal' | 'vertical';

/**
 * Get the bounding box of a shape
 */
function getShapeBounds(shape: Shape): Box {
  const handler = shapeRegistry.getHandler(shape.type);
  return handler.getBounds(shape);
}

/**
 * Get the combined bounding box of multiple shapes
 */
export function getCombinedBounds(shapes: Shape[]): Box {
  if (shapes.length === 0) {
    return Box.empty();
  }

  let combined = getShapeBounds(shapes[0]!);
  for (let i = 1; i < shapes.length; i++) {
    combined = combined.union(getShapeBounds(shapes[i]!));
  }
  return combined;
}

/**
 * Calculate alignment updates for horizontal alignment
 */
export function alignHorizontal(
  shapes: Shape[],
  alignment: HorizontalAlignment
): Array<{ id: string; updates: { x: number } }> {
  if (shapes.length < 2) return [];

  const combinedBounds = getCombinedBounds(shapes);
  const updates: Array<{ id: string; updates: { x: number } }> = [];

  for (const shape of shapes) {
    const bounds = getShapeBounds(shape);
    let newX: number;

    switch (alignment) {
      case 'left':
        // Align left edges to the leftmost edge
        newX = shape.x + (combinedBounds.minX - bounds.minX);
        break;
      case 'center':
        // Align centers to the combined center
        newX = shape.x + (combinedBounds.centerX - bounds.centerX);
        break;
      case 'right':
        // Align right edges to the rightmost edge
        newX = shape.x + (combinedBounds.maxX - bounds.maxX);
        break;
    }

    if (newX !== shape.x) {
      updates.push({ id: shape.id, updates: { x: newX } });
    }
  }

  return updates;
}

/**
 * Calculate alignment updates for vertical alignment
 */
export function alignVertical(
  shapes: Shape[],
  alignment: VerticalAlignment
): Array<{ id: string; updates: { y: number } }> {
  if (shapes.length < 2) return [];

  const combinedBounds = getCombinedBounds(shapes);
  const updates: Array<{ id: string; updates: { y: number } }> = [];

  for (const shape of shapes) {
    const bounds = getShapeBounds(shape);
    let newY: number;

    switch (alignment) {
      case 'top':
        // Align top edges to the topmost edge
        newY = shape.y + (combinedBounds.minY - bounds.minY);
        break;
      case 'middle':
        // Align centers to the combined center
        newY = shape.y + (combinedBounds.centerY - bounds.centerY);
        break;
      case 'bottom':
        // Align bottom edges to the bottommost edge
        newY = shape.y + (combinedBounds.maxY - bounds.maxY);
        break;
    }

    if (newY !== shape.y) {
      updates.push({ id: shape.id, updates: { y: newY } });
    }
  }

  return updates;
}

/**
 * Calculate distribution updates for evenly spacing shapes
 */
export function distribute(
  shapes: Shape[],
  direction: DistributionDirection
): Array<{ id: string; updates: { x?: number; y?: number } }> {
  if (shapes.length < 3) return [];

  // Get bounds for all shapes
  const shapeBoundsMap = new Map<string, { shape: Shape; bounds: Box }>();
  for (const shape of shapes) {
    shapeBoundsMap.set(shape.id, { shape, bounds: getShapeBounds(shape) });
  }

  // Sort shapes by their position in the distribution direction
  const sortedShapes = [...shapes].sort((a, b) => {
    const boundsA = shapeBoundsMap.get(a.id)!.bounds;
    const boundsB = shapeBoundsMap.get(b.id)!.bounds;

    if (direction === 'horizontal') {
      return boundsA.centerX - boundsB.centerX;
    } else {
      return boundsA.centerY - boundsB.centerY;
    }
  });

  // Get the first and last shape positions
  const firstBounds = shapeBoundsMap.get(sortedShapes[0]!.id)!.bounds;
  const lastBounds = shapeBoundsMap.get(sortedShapes[sortedShapes.length - 1]!.id)!.bounds;

  // Calculate total size of shapes (not including spacing)
  let totalShapeSize = 0;
  for (const { bounds } of shapeBoundsMap.values()) {
    totalShapeSize += direction === 'horizontal' ? bounds.width : bounds.height;
  }

  // Calculate total available space for gaps
  const totalSpace = direction === 'horizontal'
    ? lastBounds.maxX - firstBounds.minX
    : lastBounds.maxY - firstBounds.minY;

  const totalGapSpace = totalSpace - totalShapeSize;
  const gapBetweenShapes = totalGapSpace / (shapes.length - 1);

  const updates: Array<{ id: string; updates: { x?: number; y?: number } }> = [];

  // Position shapes evenly
  let currentPos = direction === 'horizontal' ? firstBounds.minX : firstBounds.minY;

  for (const shape of sortedShapes) {
    const { bounds } = shapeBoundsMap.get(shape.id)!;

    if (direction === 'horizontal') {
      const newCenterX = currentPos + bounds.width / 2;
      const newX = shape.x + (newCenterX - bounds.centerX);
      if (Math.abs(newX - shape.x) > 0.001) {
        updates.push({ id: shape.id, updates: { x: newX } });
      }
      currentPos += bounds.width + gapBetweenShapes;
    } else {
      const newCenterY = currentPos + bounds.height / 2;
      const newY = shape.y + (newCenterY - bounds.centerY);
      if (Math.abs(newY - shape.y) > 0.001) {
        updates.push({ id: shape.id, updates: { y: newY } });
      }
      currentPos += bounds.height + gapBetweenShapes;
    }
  }

  return updates;
}
