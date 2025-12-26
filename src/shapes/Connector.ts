import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { ShapeHandler, shapeRegistry } from './ShapeRegistry';
import {
  ConnectorShape,
  Handle,
  Anchor,
  Shape,
  DEFAULT_CONNECTOR,
} from './Shape';

/**
 * Get the resolved start point of a connector.
 * If connected to a shape, returns the anchor position.
 * Otherwise returns the stored x, y position.
 */
export function getConnectorStartPoint(
  connector: ConnectorShape,
  shapes: Record<string, Shape>
): Vec2 {
  if (connector.startShapeId) {
    const shape = shapes[connector.startShapeId];
    if (shape) {
      const handler = shapeRegistry.getHandler(shape.type);
      if (handler.getAnchors) {
        const anchors = handler.getAnchors(shape);
        const anchor = anchors.find((a) => a.position === connector.startAnchor);
        if (anchor) {
          return new Vec2(anchor.x, anchor.y);
        }
      }
    }
  }
  return new Vec2(connector.x, connector.y);
}

/**
 * Get the resolved end point of a connector.
 * If connected to a shape, returns the anchor position.
 * Otherwise returns the stored x2, y2 position.
 */
export function getConnectorEndPoint(
  connector: ConnectorShape,
  shapes: Record<string, Shape>
): Vec2 {
  if (connector.endShapeId) {
    const shape = shapes[connector.endShapeId];
    if (shape) {
      const handler = shapeRegistry.getHandler(shape.type);
      if (handler.getAnchors) {
        const anchors = handler.getAnchors(shape);
        const anchor = anchors.find((a) => a.position === connector.endAnchor);
        if (anchor) {
          return new Vec2(anchor.x, anchor.y);
        }
      }
    }
  }
  return new Vec2(connector.x2, connector.y2);
}

/**
 * Draw an arrow head at the given point.
 */
function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  point: Vec2,
  angle: number,
  size: number
): void {
  const arrowAngle = Math.PI / 6; // 30 degrees

  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(
    point.x - size * Math.cos(angle - arrowAngle),
    point.y - size * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    point.x - size * Math.cos(angle + arrowAngle),
    point.y - size * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Get all points in the connector path (start, waypoints, end).
 */
function getPathPoints(shape: ConnectorShape): Vec2[] {
  const points: Vec2[] = [new Vec2(shape.x, shape.y)];

  if (shape.waypoints && shape.waypoints.length > 0) {
    for (const wp of shape.waypoints) {
      points.push(new Vec2(wp.x, wp.y));
    }
  }

  points.push(new Vec2(shape.x2, shape.y2));
  return points;
}

/**
 * Calculate the total length of a path.
 */
function calculatePathLength(points: Vec2[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    length += Vec2.distance(prev, curr);
  }
  return length;
}

/**
 * Get a point along the path at position t (0-1).
 */
function getPointAlongPath(points: Vec2[], t: number): { point: Vec2; angle: number } {
  if (points.length < 2) {
    return { point: points[0] ?? new Vec2(0, 0), angle: 0 };
  }

  const totalLength = calculatePathLength(points);
  const targetLength = t * totalLength;

  let accumulatedLength = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const segmentLength = Vec2.distance(prev, curr);

    if (accumulatedLength + segmentLength >= targetLength) {
      // Found the segment
      const segmentT = (targetLength - accumulatedLength) / segmentLength;
      const x = prev.x + segmentT * (curr.x - prev.x);
      const y = prev.y + segmentT * (curr.y - prev.y);
      const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      return { point: new Vec2(x, y), angle };
    }

    accumulatedLength += segmentLength;
  }

  // Return end point
  const lastIdx = points.length - 1;
  const lastPoint = points[lastIdx]!;
  const secondLastPoint = points[lastIdx - 1]!;
  const angle = Math.atan2(
    lastPoint.y - secondLastPoint.y,
    lastPoint.x - secondLastPoint.x
  );
  return { point: lastPoint, angle };
}

/**
 * Render a connector label with background.
 */
function renderConnectorLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  position: Vec2,
  fontSize: number,
  color: string
): void {
  ctx.save();

  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text for background
  const metrics = ctx.measureText(label);
  const padding = 4;
  const bgWidth = metrics.width + padding * 2;
  const bgHeight = fontSize + padding * 2;

  // Draw background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(
    position.x - bgWidth / 2,
    position.y - bgHeight / 2,
    bgWidth,
    bgHeight
  );

  // Draw border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    position.x - bgWidth / 2,
    position.y - bgHeight / 2,
    bgWidth,
    bgHeight
  );

  // Draw text
  ctx.fillStyle = color;
  ctx.fillText(label, position.x, position.y);

  ctx.restore();
}

/**
 * Calculate point-to-line-segment distance.
 */
function pointToLineDistance(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Line segment is a point
    return Vec2.distance(point, lineStart);
  }

  // Calculate projection of point onto line
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared
    )
  );

  const projection = new Vec2(lineStart.x + t * dx, lineStart.y + t * dy);

  return Vec2.distance(point, projection);
}

/**
 * Connector shape handler implementation.
 */
export const connectorHandler: ShapeHandler<ConnectorShape> = {
  /**
   * Render a connector to the canvas context.
   * Note: This method needs access to all shapes to resolve endpoints.
   * The actual rendering uses cached x, y, x2, y2 values.
   */
  render(ctx: CanvasRenderingContext2D, shape: ConnectorShape): void {
    const { stroke, strokeWidth, opacity, startArrow, endArrow } = shape;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Get all path points
    const points = getPathPoints(shape);

    // Draw the line(s)
    if (stroke && strokeWidth > 0 && points.length >= 2) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const firstPoint = points[0]!;
      ctx.beginPath();
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < points.length; i++) {
        const pt = points[i]!;
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.stroke();

      // Calculate angles for arrows
      const arrowSize = strokeWidth * 4;

      // Draw arrows
      if (startArrow || endArrow) {
        ctx.fillStyle = stroke;
      }

      if (startArrow && points.length >= 2) {
        const p0 = points[0]!;
        const p1 = points[1]!;
        const startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        drawArrowHead(ctx, p0, startAngle + Math.PI, arrowSize);
      }

      if (endArrow && points.length >= 2) {
        const lastIdx = points.length - 1;
        const lastPt = points[lastIdx]!;
        const secondLastPt = points[lastIdx - 1]!;
        const endAngle = Math.atan2(lastPt.y - secondLastPt.y, lastPt.x - secondLastPt.x);
        drawArrowHead(ctx, lastPt, endAngle, arrowSize);
      }
    }

    // Draw label if present
    if (shape.label && shape.label.trim()) {
      const labelPosition = shape.labelPosition ?? 0.5;
      const { point } = getPointAlongPath(points, labelPosition);
      const fontSize = shape.labelFontSize ?? 12;
      const color = shape.labelColor ?? stroke ?? '#000000';

      renderConnectorLabel(ctx, shape.label, point, fontSize, color);
    }

    ctx.restore();
  },

  /**
   * Test if a world point is on the connector line (or any segment).
   */
  hitTest(shape: ConnectorShape, worldPoint: Vec2): boolean {
    const points = getPathPoints(shape);
    const hitTolerance = Math.max(5, shape.strokeWidth);

    // Check each line segment
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;
      const distance = pointToLineDistance(worldPoint, prev, curr);
      if (distance <= hitTolerance) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get the axis-aligned bounding box of the connector (including all waypoints).
   */
  getBounds(shape: ConnectorShape): Box {
    const points = getPathPoints(shape);
    const { strokeWidth } = shape;
    const padding = strokeWidth / 2 + 5; // Extra padding for arrows

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return new Box(minX - padding, minY - padding, maxX + padding, maxY + padding);
  },

  /**
   * Get the handles for the connector (start and end points).
   */
  getHandles(shape: ConnectorShape): Handle[] {
    return [
      {
        type: 'left',
        x: shape.x,
        y: shape.y,
        cursor: 'move',
      },
      {
        type: 'right',
        x: shape.x2,
        y: shape.y2,
        cursor: 'move',
      },
    ];
  },

  /**
   * Create a new connector at the given position.
   */
  create(position: Vec2, id: string): ConnectorShape {
    return {
      id,
      type: 'connector',
      x: position.x,
      y: position.y,
      x2: position.x + 100,
      y2: position.y,
      rotation: DEFAULT_CONNECTOR.rotation,
      opacity: DEFAULT_CONNECTOR.opacity,
      locked: DEFAULT_CONNECTOR.locked,
      visible: DEFAULT_CONNECTOR.visible,
      fill: DEFAULT_CONNECTOR.fill,
      stroke: DEFAULT_CONNECTOR.stroke,
      strokeWidth: DEFAULT_CONNECTOR.strokeWidth,
      startShapeId: DEFAULT_CONNECTOR.startShapeId,
      startAnchor: DEFAULT_CONNECTOR.startAnchor,
      endShapeId: DEFAULT_CONNECTOR.endShapeId,
      endAnchor: DEFAULT_CONNECTOR.endAnchor,
      startArrow: DEFAULT_CONNECTOR.startArrow,
      endArrow: DEFAULT_CONNECTOR.endArrow,
      routingMode: DEFAULT_CONNECTOR.routingMode,
    };
  },
};

// Register the connector handler
shapeRegistry.register('connector', connectorHandler);

/**
 * Update connector endpoints based on connected shapes.
 * Call this when shapes move to keep connectors attached.
 */
export function updateConnectorEndpoints(
  connector: ConnectorShape,
  shapes: Record<string, Shape>
): Partial<ConnectorShape> {
  const updates: Partial<ConnectorShape> = {};

  // Update start point if connected
  if (connector.startShapeId) {
    const startPoint = getConnectorStartPoint(connector, shapes);
    updates.x = startPoint.x;
    updates.y = startPoint.y;
  }

  // Update end point if connected
  if (connector.endShapeId) {
    const endPoint = getConnectorEndPoint(connector, shapes);
    updates.x2 = endPoint.x;
    updates.y2 = endPoint.y;
  }

  return updates;
}

/**
 * Find the closest anchor on a shape to a given point.
 */
export function findClosestAnchor(
  shape: Shape,
  point: Vec2,
  maxDistance: number = Infinity
): { anchor: Anchor; distance: number } | null {
  const handler = shapeRegistry.getHandler(shape.type);
  if (!handler.getAnchors) return null;

  const anchors = handler.getAnchors(shape);
  let closest: { anchor: Anchor; distance: number } | null = null;

  for (const anchor of anchors) {
    const distance = Vec2.distance(new Vec2(anchor.x, anchor.y), point);
    if (distance <= maxDistance && (!closest || distance < closest.distance)) {
      closest = { anchor, distance };
    }
  }

  return closest;
}
