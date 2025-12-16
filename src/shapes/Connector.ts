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
    const { x, y, x2, y2, stroke, strokeWidth, opacity, startArrow, endArrow } = shape;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Draw the line
    if (stroke && strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Calculate line angle for arrows
      const angle = Math.atan2(y2 - y, x2 - x);
      const arrowSize = strokeWidth * 4;

      // Draw arrows
      if (startArrow || endArrow) {
        ctx.fillStyle = stroke;
      }

      if (startArrow) {
        drawArrowHead(ctx, new Vec2(x, y), angle + Math.PI, arrowSize);
      }

      if (endArrow) {
        drawArrowHead(ctx, new Vec2(x2, y2), angle, arrowSize);
      }
    }

    ctx.restore();
  },

  /**
   * Test if a world point is on the connector line.
   */
  hitTest(shape: ConnectorShape, worldPoint: Vec2): boolean {
    const start = new Vec2(shape.x, shape.y);
    const end = new Vec2(shape.x2, shape.y2);

    const hitTolerance = Math.max(5, shape.strokeWidth);
    const distance = pointToLineDistance(worldPoint, start, end);

    return distance <= hitTolerance;
  },

  /**
   * Get the axis-aligned bounding box of the connector.
   */
  getBounds(shape: ConnectorShape): Box {
    const { x, y, x2, y2, strokeWidth } = shape;
    const padding = strokeWidth / 2 + 5; // Extra padding for arrows

    return new Box(
      Math.min(x, x2) - padding,
      Math.min(y, y2) - padding,
      Math.max(x, x2) + padding,
      Math.max(y, y2) + padding
    );
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
