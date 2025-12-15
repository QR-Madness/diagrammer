import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { Shape } from '../shapes/Shape';
import { shapeRegistry } from '../shapes/ShapeRegistry';

/**
 * Snap threshold in world units.
 * Points within this distance of a snap target will snap.
 */
const DEFAULT_SNAP_THRESHOLD = 10;

/**
 * Result of a snap operation.
 */
export interface SnapResult {
  /** The snapped position */
  position: Vec2;
  /** Whether snapping occurred on the X axis */
  snappedX: boolean;
  /** Whether snapping occurred on the Y axis */
  snappedY: boolean;
  /** The X snap line position (if snapped) */
  snapLineX?: number;
  /** The Y snap line position (if snapped) */
  snapLineY?: number;
  /** Description of what was snapped to (for guides) */
  snapTargetX?: 'grid' | 'shape-edge' | 'shape-center';
  snapTargetY?: 'grid' | 'shape-edge' | 'shape-center';
}

/**
 * Options for snapping.
 */
export interface SnapOptions {
  /** Whether to snap to grid. Default: true */
  snapToGrid?: boolean;
  /** Grid spacing in world units. Default: 50 */
  gridSpacing?: number;
  /** Whether to snap to other shapes. Default: true */
  snapToShapes?: boolean;
  /** Snap threshold in world units. Default: 10 */
  threshold?: number;
  /** IDs of shapes to exclude from snapping (e.g., shapes being moved) */
  excludeIds?: Set<string>;
}

const DEFAULT_OPTIONS: Required<SnapOptions> = {
  snapToGrid: true,
  gridSpacing: 50,
  snapToShapes: true,
  threshold: DEFAULT_SNAP_THRESHOLD,
  excludeIds: new Set(),
};

/**
 * Snap a point to the nearest grid line.
 */
export function snapToGrid(point: Vec2, gridSpacing: number, threshold: number): SnapResult {
  const result: SnapResult = {
    position: point.clone(),
    snappedX: false,
    snappedY: false,
  };

  // Calculate nearest grid lines
  const nearestGridX = Math.round(point.x / gridSpacing) * gridSpacing;
  const nearestGridY = Math.round(point.y / gridSpacing) * gridSpacing;

  // Check if within threshold
  const distanceX = Math.abs(point.x - nearestGridX);
  const distanceY = Math.abs(point.y - nearestGridY);

  if (distanceX <= threshold) {
    result.position = new Vec2(nearestGridX, result.position.y);
    result.snappedX = true;
    result.snapLineX = nearestGridX;
    result.snapTargetX = 'grid';
  }

  if (distanceY <= threshold) {
    result.position = new Vec2(result.position.x, nearestGridY);
    result.snappedY = true;
    result.snapLineY = nearestGridY;
    result.snapTargetY = 'grid';
  }

  return result;
}

/**
 * Get key snap points for a shape (center and edges of bounding box).
 */
function getShapeSnapPoints(shape: Shape): { center: Vec2; edges: { left: number; right: number; top: number; bottom: number } } {
  const handler = shapeRegistry.getHandler(shape.type);
  const bounds = handler.getBounds(shape);

  return {
    center: new Vec2(shape.x, shape.y),
    edges: {
      left: bounds.minX,
      right: bounds.maxX,
      top: bounds.minY,
      bottom: bounds.maxY,
    },
  };
}

/**
 * Snap a point to nearby shapes.
 * Returns snap lines for both edges and centers of other shapes.
 */
export function snapToShapes(
  point: Vec2,
  shapes: Record<string, Shape>,
  shapeOrder: string[],
  threshold: number,
  excludeIds: Set<string>
): SnapResult {
  const result: SnapResult = {
    position: point.clone(),
    snappedX: false,
    snappedY: false,
  };

  let bestDistanceX = threshold + 1;
  let bestDistanceY = threshold + 1;

  for (const id of shapeOrder) {
    if (excludeIds.has(id)) continue;

    const shape = shapes[id];
    if (!shape) continue;

    const { center, edges } = getShapeSnapPoints(shape);

    // Check center X
    const distToCenterX = Math.abs(point.x - center.x);
    if (distToCenterX <= threshold && distToCenterX < bestDistanceX) {
      bestDistanceX = distToCenterX;
      result.position = new Vec2(center.x, result.position.y);
      result.snappedX = true;
      result.snapLineX = center.x;
      result.snapTargetX = 'shape-center';
    }

    // Check center Y
    const distToCenterY = Math.abs(point.y - center.y);
    if (distToCenterY <= threshold && distToCenterY < bestDistanceY) {
      bestDistanceY = distToCenterY;
      result.position = new Vec2(result.position.x, center.y);
      result.snappedY = true;
      result.snapLineY = center.y;
      result.snapTargetY = 'shape-center';
    }

    // Check edge X positions (left and right)
    for (const edgeX of [edges.left, edges.right]) {
      const distToEdgeX = Math.abs(point.x - edgeX);
      if (distToEdgeX <= threshold && distToEdgeX < bestDistanceX) {
        bestDistanceX = distToEdgeX;
        result.position = new Vec2(edgeX, result.position.y);
        result.snappedX = true;
        result.snapLineX = edgeX;
        result.snapTargetX = 'shape-edge';
      }
    }

    // Check edge Y positions (top and bottom)
    for (const edgeY of [edges.top, edges.bottom]) {
      const distToEdgeY = Math.abs(point.y - edgeY);
      if (distToEdgeY <= threshold && distToEdgeY < bestDistanceY) {
        bestDistanceY = distToEdgeY;
        result.position = new Vec2(result.position.x, edgeY);
        result.snappedY = true;
        result.snapLineY = edgeY;
        result.snapTargetY = 'shape-edge';
      }
    }
  }

  return result;
}

/**
 * Snap a point to both grid and shapes.
 * Grid takes precedence if both are within threshold.
 */
export function snap(
  point: Vec2,
  shapes: Record<string, Shape>,
  shapeOrder: string[],
  options?: SnapOptions
): SnapResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let result: SnapResult = {
    position: point.clone(),
    snappedX: false,
    snappedY: false,
  };

  // Adjust threshold based on zoom (if camera zoom is provided in the future)
  const threshold = opts.threshold;

  // First try snapping to shapes (they take precedence for alignment)
  if (opts.snapToShapes) {
    const shapeSnapResult = snapToShapes(point, shapes, shapeOrder, threshold, opts.excludeIds);
    if (shapeSnapResult.snappedX || shapeSnapResult.snappedY) {
      result = shapeSnapResult;
    }
  }

  // Then try snapping to grid (only for axes not already snapped)
  if (opts.snapToGrid) {
    const gridResult = snapToGrid(point, opts.gridSpacing, threshold);

    // Grid snapping only applies if not already snapped to a shape
    if (!result.snappedX && gridResult.snappedX && gridResult.snapLineX !== undefined) {
      result.position = new Vec2(gridResult.position.x, result.position.y);
      result.snappedX = true;
      result.snapLineX = gridResult.snapLineX;
      result.snapTargetX = 'grid';
    }

    if (!result.snappedY && gridResult.snappedY && gridResult.snapLineY !== undefined) {
      result.position = new Vec2(result.position.x, gridResult.position.y);
      result.snappedY = true;
      result.snapLineY = gridResult.snapLineY;
      result.snapTargetY = 'grid';
    }
  }

  return result;
}

/**
 * Snap the bounds of a shape (not just the center).
 * This considers all edges and the center for snapping.
 */
export function snapBounds(
  bounds: Box,
  center: Vec2,
  shapes: Record<string, Shape>,
  shapeOrder: string[],
  options?: SnapOptions
): SnapResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const threshold = opts.threshold;

  let result: SnapResult = {
    position: center.clone(),
    snappedX: false,
    snappedY: false,
  };

  let bestDistanceX = threshold + 1;
  let bestDistanceY = threshold + 1;

  // Points to check for snapping (center + edges)
  const checkPointsX = [center.x, bounds.minX, bounds.maxX];
  const checkPointsY = [center.y, bounds.minY, bounds.maxY];

  // Snap to grid
  if (opts.snapToGrid) {
    for (const px of checkPointsX) {
      const nearestGridX = Math.round(px / opts.gridSpacing) * opts.gridSpacing;
      const distance = Math.abs(px - nearestGridX);
      if (distance <= threshold && distance < bestDistanceX) {
        bestDistanceX = distance;
        result.position = new Vec2(center.x + (nearestGridX - px), result.position.y);
        result.snappedX = true;
        result.snapLineX = nearestGridX;
        result.snapTargetX = 'grid';
      }
    }

    for (const py of checkPointsY) {
      const nearestGridY = Math.round(py / opts.gridSpacing) * opts.gridSpacing;
      const distance = Math.abs(py - nearestGridY);
      if (distance <= threshold && distance < bestDistanceY) {
        bestDistanceY = distance;
        result.position = new Vec2(result.position.x, center.y + (nearestGridY - py));
        result.snappedY = true;
        result.snapLineY = nearestGridY;
        result.snapTargetY = 'grid';
      }
    }
  }

  // Snap to other shapes
  if (opts.snapToShapes) {
    for (const id of shapeOrder) {
      if (opts.excludeIds.has(id)) continue;

      const shape = shapes[id];
      if (!shape) continue;

      const targetSnapPoints = getShapeSnapPoints(shape);
      const targetPointsX = [targetSnapPoints.center.x, targetSnapPoints.edges.left, targetSnapPoints.edges.right];
      const targetPointsY = [targetSnapPoints.center.y, targetSnapPoints.edges.top, targetSnapPoints.edges.bottom];

      // Check each source point against each target point
      for (const sourceX of checkPointsX) {
        for (const targetX of targetPointsX) {
          const distance = Math.abs(sourceX - targetX);
          if (distance <= threshold && distance < bestDistanceX) {
            bestDistanceX = distance;
            result.position = new Vec2(center.x + (targetX - sourceX), result.position.y);
            result.snappedX = true;
            result.snapLineX = targetX;
            result.snapTargetX = sourceX === center.x ? 'shape-center' : 'shape-edge';
          }
        }
      }

      for (const sourceY of checkPointsY) {
        for (const targetY of targetPointsY) {
          const distance = Math.abs(sourceY - targetY);
          if (distance <= threshold && distance < bestDistanceY) {
            bestDistanceY = distance;
            result.position = new Vec2(result.position.x, center.y + (targetY - sourceY));
            result.snappedY = true;
            result.snapLineY = targetY;
            result.snapTargetY = sourceY === center.y ? 'shape-center' : 'shape-edge';
          }
        }
      }
    }
  }

  return result;
}
