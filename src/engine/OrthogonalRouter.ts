/**
 * OrthogonalRouter - Calculates orthogonal (right-angle) paths for connectors.
 *
 * This module provides L-shaped and Z-shaped Manhattan routing for connectors
 * that use orthogonal routing mode. The algorithm:
 * 1. Exits horizontally from left/right anchors, vertically from top/bottom
 * 2. Creates minimal-bend paths between endpoints
 * 3. Supports obstacle avoidance using expanded bounding boxes
 */

import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { Shape, ConnectorShape, AnchorPosition } from '../shapes/Shape';
import { shapeRegistry } from '../shapes/ShapeRegistry';

/**
 * Direction vectors for each anchor position.
 * Defines the initial exit direction from an anchor.
 */
const ANCHOR_DIRECTIONS: Record<AnchorPosition, Vec2> = {
  top: new Vec2(0, -1),
  bottom: new Vec2(0, 1),
  left: new Vec2(-1, 0),
  right: new Vec2(1, 0),
  center: new Vec2(0, 0), // Center anchor - direction determined by target
};

/**
 * Minimum distance to extend from anchor before turning.
 */
const MIN_STUB_LENGTH = 20;

/**
 * Padding around shapes for obstacle avoidance.
 */
const OBSTACLE_PADDING = 15;

/**
 * Calculate an orthogonal path between two points.
 *
 * @param startPoint - Start position
 * @param endPoint - End position
 * @param startAnchor - Anchor position at start (affects exit direction)
 * @param endAnchor - Anchor position at end (affects entry direction)
 * @param shapes - All shapes for obstacle avoidance (optional)
 * @param excludeIds - Shape IDs to exclude from obstacle detection
 * @returns Array of waypoints (excluding start and end points)
 */
export function calculateOrthogonalPath(
  startPoint: Vec2,
  endPoint: Vec2,
  startAnchor?: AnchorPosition,
  endAnchor?: AnchorPosition,
  shapes?: Record<string, Shape>,
  excludeIds?: Set<string>
): Array<{ x: number; y: number }> {
  // Get exit and entry directions
  // For center anchor or no anchor, infer from relative position
  const startDir = startAnchor && startAnchor !== 'center'
    ? ANCHOR_DIRECTIONS[startAnchor]
    : inferDirection(startPoint, endPoint);
  const endDir = endAnchor && endAnchor !== 'center'
    ? ANCHOR_DIRECTIONS[endAnchor]
    : inferDirection(endPoint, startPoint);

  // Calculate stub points (extend from anchors before turning)
  const startStub = new Vec2(
    startPoint.x + startDir.x * MIN_STUB_LENGTH,
    startPoint.y + startDir.y * MIN_STUB_LENGTH
  );
  const endStub = new Vec2(
    endPoint.x + endDir.x * MIN_STUB_LENGTH,
    endPoint.y + endDir.y * MIN_STUB_LENGTH
  );

  // Determine if start direction is horizontal or vertical
  const startHorizontal = Math.abs(startDir.x) > Math.abs(startDir.y);
  const endHorizontal = Math.abs(endDir.x) > Math.abs(endDir.y);

  let middleWaypoints: Array<{ x: number; y: number }>;

  // Calculate the path between the stubs (not the actual endpoints)
  // Case 1: Both horizontal or both vertical - use Z-shape
  if (startHorizontal === endHorizontal) {
    middleWaypoints = calculateZPathWithStubs(startStub, endStub, startDir, endDir, startHorizontal);
  } else {
    // Case 2: Different orientations - try L-shape
    middleWaypoints = calculateLPathWithStubs(startStub, endStub, startHorizontal);
  }

  // Build full waypoint list: startStub + middle + endStub
  let waypoints: Array<{ x: number; y: number }> = [
    { x: startStub.x, y: startStub.y },
    ...middleWaypoints,
    { x: endStub.x, y: endStub.y },
  ];

  // Remove redundant collinear points
  waypoints = simplifyPath(waypoints);

  // If shapes are provided, check for obstacle avoidance
  if (shapes && excludeIds) {
    const obstacles = getObstacles(shapes, excludeIds);
    waypoints = avoidObstacles(startPoint, endPoint, waypoints, obstacles);
  }

  return waypoints;
}

/**
 * Remove collinear points from a path to simplify it.
 */
function simplifyPath(waypoints: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (waypoints.length <= 2) return waypoints;

  const result: Array<{ x: number; y: number }> = [waypoints[0]!];

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = result[result.length - 1]!;
    const curr = waypoints[i]!;
    const next = waypoints[i + 1]!;

    // Check if points are collinear (same x or same y for orthogonal paths)
    const sameX = prev.x === curr.x && curr.x === next.x;
    const sameY = prev.y === curr.y && curr.y === next.y;

    // Only keep the point if it's not collinear (i.e., it's a corner)
    if (!sameX && !sameY) {
      result.push(curr);
    }
  }

  result.push(waypoints[waypoints.length - 1]!);
  return result;
}

/**
 * Infer exit direction based on relative position of target.
 */
function inferDirection(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Prefer horizontal if dx is larger, vertical otherwise
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? new Vec2(1, 0) : new Vec2(-1, 0);
  } else {
    return dy > 0 ? new Vec2(0, 1) : new Vec2(0, -1);
  }
}

/**
 * Calculate an L-shaped path between stub points.
 * The stubs already extend from the anchors, so we just need to connect them.
 */
function calculateLPathWithStubs(
  startStub: Vec2,
  endStub: Vec2,
  startHorizontal: boolean
): Array<{ x: number; y: number }> {
  if (startHorizontal) {
    // Start went horizontal, end went vertical
    // Connect with a single corner at (endStub.x, startStub.y)
    return [{ x: endStub.x, y: startStub.y }];
  } else {
    // Start went vertical, end went horizontal
    // Connect with a single corner at (startStub.x, endStub.y)
    return [{ x: startStub.x, y: endStub.y }];
  }
}

/**
 * Calculate a Z-shaped path between stub points.
 */
function calculateZPathWithStubs(
  startStub: Vec2,
  endStub: Vec2,
  _startDir: Vec2,
  _endDir: Vec2,
  startHorizontal: boolean
): Array<{ x: number; y: number }> {
  if (startHorizontal) {
    // Both horizontal: connect with a vertical segment in the middle
    const midX = (startStub.x + endStub.x) / 2;
    return [
      { x: midX, y: startStub.y },
      { x: midX, y: endStub.y },
    ];
  } else {
    // Both vertical: connect with a horizontal segment in the middle
    const midY = (startStub.y + endStub.y) / 2;
    return [
      { x: startStub.x, y: midY },
      { x: endStub.x, y: midY },
    ];
  }
}

/**
 * Get obstacle bounding boxes from shapes.
 */
function getObstacles(shapes: Record<string, Shape>, excludeIds: Set<string>): Box[] {
  const obstacles: Box[] = [];

  for (const shape of Object.values(shapes)) {
    if (excludeIds.has(shape.id)) continue;
    if (shape.type === 'connector') continue; // Don't avoid other connectors

    const handler = shapeRegistry.getHandler(shape.type);
    const bounds = handler.getBounds(shape);

    // Expand bounds by padding
    obstacles.push(
      new Box(
        bounds.minX - OBSTACLE_PADDING,
        bounds.minY - OBSTACLE_PADDING,
        bounds.maxX + OBSTACLE_PADDING,
        bounds.maxY + OBSTACLE_PADDING
      )
    );
  }

  return obstacles;
}

/**
 * Check if a line segment intersects any obstacles.
 */
function segmentIntersectsObstacles(p1: Vec2, p2: Vec2, obstacles: Box[]): boolean {
  for (const obstacle of obstacles) {
    if (lineIntersectsBox(p1, p2, obstacle)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a line segment intersects a box.
 * Uses Liang-Barsky algorithm.
 */
function lineIntersectsBox(p1: Vec2, p2: Vec2, box: Box): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  let tMin = 0;
  let tMax = 1;

  // Check X bounds
  if (dx !== 0) {
    const t1 = (box.minX - p1.x) / dx;
    const t2 = (box.maxX - p1.x) / dx;

    if (dx > 0) {
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
    } else {
      tMin = Math.max(tMin, t2);
      tMax = Math.min(tMax, t1);
    }
  } else {
    // Vertical line - check if X is within bounds
    if (p1.x < box.minX || p1.x > box.maxX) {
      return false;
    }
  }

  // Check Y bounds
  if (dy !== 0) {
    const t1 = (box.minY - p1.y) / dy;
    const t2 = (box.maxY - p1.y) / dy;

    if (dy > 0) {
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
    } else {
      tMin = Math.max(tMin, t2);
      tMax = Math.min(tMax, t1);
    }
  } else {
    // Horizontal line - check if Y is within bounds
    if (p1.y < box.minY || p1.y > box.maxY) {
      return false;
    }
  }

  return tMin <= tMax;
}

/**
 * Attempt to route around obstacles.
 * This is a simplified implementation that checks for intersections
 * and adjusts waypoints if needed.
 */
function avoidObstacles(
  start: Vec2,
  end: Vec2,
  waypoints: Array<{ x: number; y: number }>,
  obstacles: Box[]
): Array<{ x: number; y: number }> {
  if (obstacles.length === 0) {
    return waypoints;
  }

  // Build full path for checking
  const fullPath = [start, ...waypoints.map((wp) => new Vec2(wp.x, wp.y)), end];

  // Check each segment for intersections
  let hasIntersection = false;
  for (let i = 0; i < fullPath.length - 1; i++) {
    if (segmentIntersectsObstacles(fullPath[i]!, fullPath[i + 1]!, obstacles)) {
      hasIntersection = true;
      break;
    }
  }

  // If no intersections, return original waypoints
  if (!hasIntersection) {
    return waypoints;
  }

  // Try alternative routing by going around obstacles
  // This is a simplified approach - for complex scenarios,
  // a full pathfinding algorithm (A*, visibility graphs) would be needed

  // Find the combined bounding box of all intersecting obstacles
  let combinedBounds: Box | null = null;
  for (const obstacle of obstacles) {
    for (let i = 0; i < fullPath.length - 1; i++) {
      if (lineIntersectsBox(fullPath[i]!, fullPath[i + 1]!, obstacle)) {
        if (!combinedBounds) {
          combinedBounds = new Box(obstacle.minX, obstacle.minY, obstacle.maxX, obstacle.maxY);
        } else {
          combinedBounds = new Box(
            Math.min(combinedBounds.minX, obstacle.minX),
            Math.min(combinedBounds.minY, obstacle.minY),
            Math.max(combinedBounds.maxX, obstacle.maxX),
            Math.max(combinedBounds.maxY, obstacle.maxY)
          );
        }
      }
    }
  }

  if (!combinedBounds) {
    return waypoints;
  }

  // Try routing around the combined bounds
  // Choose the side that's closest to both start and end
  const routes = [
    // Go above
    [
      { x: start.x, y: combinedBounds.minY - OBSTACLE_PADDING },
      { x: end.x, y: combinedBounds.minY - OBSTACLE_PADDING },
    ],
    // Go below
    [
      { x: start.x, y: combinedBounds.maxY + OBSTACLE_PADDING },
      { x: end.x, y: combinedBounds.maxY + OBSTACLE_PADDING },
    ],
    // Go left
    [
      { x: combinedBounds.minX - OBSTACLE_PADDING, y: start.y },
      { x: combinedBounds.minX - OBSTACLE_PADDING, y: end.y },
    ],
    // Go right
    [
      { x: combinedBounds.maxX + OBSTACLE_PADDING, y: start.y },
      { x: combinedBounds.maxX + OBSTACLE_PADDING, y: end.y },
    ],
  ];

  // Find shortest valid route
  let bestRoute = waypoints;
  let bestLength = Infinity;

  for (const route of routes) {
    const testPath = [start, ...route.map((wp) => new Vec2(wp.x, wp.y)), end];

    // Check if this route has any intersections
    let valid = true;
    for (let i = 0; i < testPath.length - 1; i++) {
      if (segmentIntersectsObstacles(testPath[i]!, testPath[i + 1]!, obstacles)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      // Calculate path length
      let length = 0;
      for (let i = 0; i < testPath.length - 1; i++) {
        length += Vec2.distance(testPath[i]!, testPath[i + 1]!);
      }

      if (length < bestLength) {
        bestLength = length;
        bestRoute = route;
      }
    }
  }

  return bestRoute;
}

/**
 * Calculate orthogonal waypoints for a connector.
 * Main entry point for the Engine to use.
 */
export function calculateConnectorWaypoints(
  connector: ConnectorShape,
  shapes: Record<string, Shape>
): Array<{ x: number; y: number }> | undefined {
  // Only calculate for orthogonal mode
  if (connector.routingMode !== 'orthogonal') {
    return undefined;
  }

  const startPoint = new Vec2(connector.x, connector.y);
  const endPoint = new Vec2(connector.x2, connector.y2);

  // Get exclude set (connected shapes shouldn't be obstacles)
  const excludeIds = new Set<string>();
  excludeIds.add(connector.id);
  if (connector.startShapeId) excludeIds.add(connector.startShapeId);
  if (connector.endShapeId) excludeIds.add(connector.endShapeId);

  return calculateOrthogonalPath(
    startPoint,
    endPoint,
    connector.startAnchor,
    connector.endAnchor,
    shapes,
    excludeIds
  );
}
