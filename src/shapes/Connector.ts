import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { ShapeHandler, shapeRegistry } from './ShapeRegistry';
import {
  ConnectorShape,
  Handle,
  Anchor,
  Shape,
  DEFAULT_CONNECTOR,
  ERDCardinality,
  UMLClassMarker,
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
 * Connection health status for a connector endpoint.
 */
export type ConnectionStatus = 'connected' | 'orphaned' | 'missing-anchor' | 'floating';

/**
 * Connection health info for a connector.
 */
export interface ConnectorHealthInfo {
  /** Status of the start connection */
  startStatus: ConnectionStatus;
  /** Status of the end connection */
  endStatus: ConnectionStatus;
  /** Whether the connector is fully healthy */
  isHealthy: boolean;
  /** Human-readable issues (if any) */
  issues: string[];
}

/**
 * Check the health of a connector's connections.
 * Returns info about whether the connector is properly connected.
 */
export function checkConnectorHealth(
  connector: ConnectorShape,
  shapes: Record<string, Shape>
): ConnectorHealthInfo {
  const issues: string[] = [];

  // Check start connection
  let startStatus: ConnectionStatus = 'floating';
  if (connector.startShapeId) {
    const shape = shapes[connector.startShapeId];
    if (!shape) {
      startStatus = 'orphaned';
      issues.push(`Start shape "${connector.startShapeId}" not found`);
    } else {
      const handler = shapeRegistry.getHandler(shape.type);
      if (handler.getAnchors) {
        const anchors = handler.getAnchors(shape);
        const anchor = anchors.find((a) => a.position === connector.startAnchor);
        if (anchor) {
          startStatus = 'connected';
        } else {
          startStatus = 'missing-anchor';
          issues.push(`Start anchor "${connector.startAnchor}" not found on shape`);
        }
      } else {
        startStatus = 'connected'; // Shape exists but has no anchors (treat as connected)
      }
    }
  }

  // Check end connection
  let endStatus: ConnectionStatus = 'floating';
  if (connector.endShapeId) {
    const shape = shapes[connector.endShapeId];
    if (!shape) {
      endStatus = 'orphaned';
      issues.push(`End shape "${connector.endShapeId}" not found`);
    } else {
      const handler = shapeRegistry.getHandler(shape.type);
      if (handler.getAnchors) {
        const anchors = handler.getAnchors(shape);
        const anchor = anchors.find((a) => a.position === connector.endAnchor);
        if (anchor) {
          endStatus = 'connected';
        } else {
          endStatus = 'missing-anchor';
          issues.push(`End anchor "${connector.endAnchor}" not found on shape`);
        }
      } else {
        endStatus = 'connected'; // Shape exists but has no anchors
      }
    }
  }

  const isHealthy = issues.length === 0;

  return { startStatus, endStatus, isHealthy, issues };
}

/**
 * Find all connectors with connection issues in a document.
 */
export function findOrphanedConnectors(
  shapes: Record<string, Shape>
): Array<{ connector: ConnectorShape; health: ConnectorHealthInfo }> {
  const orphaned: Array<{ connector: ConnectorShape; health: ConnectorHealthInfo }> = [];

  for (const shape of Object.values(shapes)) {
    if (shape.type === 'connector') {
      const connector = shape as ConnectorShape;
      const health = checkConnectorHealth(connector, shapes);
      if (!health.isHealthy) {
        orphaned.push({ connector, health });
      }
    }
  }

  return orphaned;
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
 * Draw ERD cardinality symbol at a connector endpoint.
 * The symbol is drawn perpendicular to the line direction.
 *
 * @param ctx - Canvas context
 * @param point - The endpoint position
 * @param angle - The angle of the line approaching this point (in radians)
 * @param cardinality - The cardinality type to draw
 * @param strokeWidth - Base stroke width for scaling
 */
function drawCardinalitySymbol(
  ctx: CanvasRenderingContext2D,
  point: Vec2,
  angle: number,
  cardinality: ERDCardinality,
  strokeWidth: number
): void {
  if (cardinality === 'none') return;

  const size = Math.max(12, strokeWidth * 4);

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);

  // All symbols drawn with line coming from the left, symbol at origin
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  switch (cardinality) {
    case 'one': {
      // Single vertical line
      ctx.beginPath();
      ctx.moveTo(-4, -size / 2);
      ctx.lineTo(-4, size / 2);
      ctx.stroke();
      break;
    }

    case 'many': {
      // Crow's foot (three lines spreading out)
      ctx.beginPath();
      // Center line
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, 0);
      // Top line
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, -size / 2);
      // Bottom line
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, size / 2);
      ctx.stroke();
      break;
    }

    case 'zero-one': {
      // Circle (zero) + vertical line (one)
      const circleRadius = size / 4;
      // Circle
      ctx.beginPath();
      ctx.arc(-size / 2, 0, circleRadius, 0, Math.PI * 2);
      ctx.stroke();
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(-4, -size / 2);
      ctx.lineTo(-4, size / 2);
      ctx.stroke();
      break;
    }

    case 'zero-many': {
      // Circle (zero) + crow's foot (many)
      const circleRadius = size / 4;
      // Circle further back
      ctx.beginPath();
      ctx.arc(-size - circleRadius - 4, 0, circleRadius, 0, Math.PI * 2);
      ctx.stroke();
      // Crow's foot
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, 0);
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, -size / 2);
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, size / 2);
      ctx.stroke();
      break;
    }

    case 'one-many': {
      // Vertical line (one) + crow's foot (many)
      // Vertical line further back
      ctx.beginPath();
      ctx.moveTo(-size - 4, -size / 2);
      ctx.lineTo(-size - 4, size / 2);
      ctx.stroke();
      // Crow's foot
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, 0);
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, -size / 2);
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, size / 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/**
 * Draw UML class marker at a connector endpoint.
 * The symbol is drawn aligned with the line direction.
 *
 * @param ctx - Canvas context
 * @param point - The endpoint position
 * @param angle - The angle of the line approaching this point (in radians)
 * @param marker - The UML marker type to draw
 * @param strokeWidth - Base stroke width for scaling
 * @param strokeColor - Stroke color for the marker
 * @param fillColor - Fill color for hollow markers (typically background color)
 */
function drawUMLClassMarker(
  ctx: CanvasRenderingContext2D,
  point: Vec2,
  angle: number,
  marker: UMLClassMarker,
  strokeWidth: number,
  strokeColor: string,
  fillColor: string | null
): void {
  if (marker === 'none') return;

  const size = Math.max(12, strokeWidth * 4);

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (marker) {
    case 'arrow': {
      // Open arrow (V shape, not filled) - for navigable association
      const arrowAngle = Math.PI / 6; // 30 degrees
      ctx.beginPath();
      ctx.moveTo(-size * Math.cos(arrowAngle), -size * Math.sin(arrowAngle));
      ctx.lineTo(0, 0);
      ctx.lineTo(-size * Math.cos(arrowAngle), size * Math.sin(arrowAngle));
      ctx.stroke();
      break;
    }

    case 'triangle':
    case 'triangle-filled': {
      // Hollow or filled triangle - for inheritance/generalization
      const triHeight = size;
      const triWidth = size * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-triHeight, -triWidth / 2);
      ctx.lineTo(-triHeight, triWidth / 2);
      ctx.closePath();

      if (marker === 'triangle-filled') {
        ctx.fillStyle = strokeColor;
        ctx.fill();
      } else {
        // Hollow triangle - fill with background color
        ctx.fillStyle = fillColor || '#ffffff';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'diamond':
    case 'diamond-filled': {
      // Hollow or filled diamond - for aggregation/composition
      const diamondLength = size;
      const diamondWidth = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-diamondLength / 2, -diamondWidth / 2);
      ctx.lineTo(-diamondLength, 0);
      ctx.lineTo(-diamondLength / 2, diamondWidth / 2);
      ctx.closePath();

      if (marker === 'diamond-filled') {
        ctx.fillStyle = strokeColor;
        ctx.fill();
      } else {
        // Hollow diamond - fill with background color
        ctx.fillStyle = fillColor || '#ffffff';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'circle': {
      // Small circle - for interface ball notation
      const radius = size / 3;
      ctx.beginPath();
      ctx.arc(-radius - 2, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor || '#ffffff';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'socket': {
      // Arc/socket - for interface socket notation (required interface)
      const radius = size / 2;
      ctx.beginPath();
      ctx.arc(-radius, 0, radius, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
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
 * Render a connector label with optional background.
 */
function renderConnectorLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  position: Vec2,
  fontSize: number,
  color: string,
  backgroundColor?: string,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  ctx.save();

  // Apply offset to position
  const drawX = position.x + offsetX;
  const drawY = position.y + offsetY;

  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text for background
  const metrics = ctx.measureText(label);
  const padding = 4;
  const bgWidth = metrics.width + padding * 2;
  const bgHeight = fontSize + padding * 2;

  // Draw background (use custom color or default semi-transparent white)
  const bgColor = backgroundColor || 'rgba(255, 255, 255, 0.9)';
  ctx.fillStyle = bgColor;
  ctx.fillRect(
    drawX - bgWidth / 2,
    drawY - bgHeight / 2,
    bgWidth,
    bgHeight
  );

  // Draw border (only if using default background)
  if (!backgroundColor) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      drawX - bgWidth / 2,
      drawY - bgHeight / 2,
      bgWidth,
      bgHeight
    );
  }

  // Draw text
  ctx.fillStyle = color;
  ctx.fillText(label, drawX, drawY);

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
    const { stroke, strokeWidth, opacity, startArrow, endArrow, lineStyle } = shape;

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

      // Apply line style (solid or dashed)
      if (lineStyle === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.setLineDash([]);
      }

      const firstPoint = points[0]!;
      ctx.beginPath();
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < points.length; i++) {
        const pt = points[i]!;
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.stroke();

      // Reset dash for markers (they should always be solid)
      ctx.setLineDash([]);

      // Calculate angles for arrows/cardinality/markers
      const arrowSize = strokeWidth * 4;

      // Infer connectorType for backwards compatibility
      // If cardinality is set but no connectorType, treat as 'erd'
      // If UML markers are set but no connectorType, treat as 'uml-class'
      const connectorType = shape.connectorType ||
        ((shape.startCardinality || shape.endCardinality) ? 'erd' :
        ((shape.startUMLMarker || shape.endUMLMarker) ? 'uml-class' : 'default'));

      // Draw start endpoint
      // Priority: UML markers > ERD cardinality > arrows
      if (points.length >= 2) {
        const p0 = points[0]!;
        const p1 = points[1]!;
        const startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

        if (connectorType === 'uml-class' && shape.startUMLMarker && shape.startUMLMarker !== 'none') {
          // Draw UML class marker
          drawUMLClassMarker(ctx, p0, startAngle + Math.PI, shape.startUMLMarker, strokeWidth, stroke, shape.fill);
        } else if (connectorType === 'erd' && shape.startCardinality && shape.startCardinality !== 'none') {
          // Draw ERD cardinality symbol
          drawCardinalitySymbol(ctx, p0, startAngle + Math.PI, shape.startCardinality, strokeWidth);
        } else if (startArrow) {
          // Draw regular arrow
          ctx.fillStyle = stroke;
          drawArrowHead(ctx, p0, startAngle + Math.PI, arrowSize);
        }
      }

      // Draw end endpoint
      // Priority: UML markers > ERD cardinality > arrows
      if (points.length >= 2) {
        const lastIdx = points.length - 1;
        const lastPt = points[lastIdx]!;
        const secondLastPt = points[lastIdx - 1]!;
        const endAngle = Math.atan2(lastPt.y - secondLastPt.y, lastPt.x - secondLastPt.x);

        if (connectorType === 'uml-class' && shape.endUMLMarker && shape.endUMLMarker !== 'none') {
          // Draw UML class marker
          drawUMLClassMarker(ctx, lastPt, endAngle, shape.endUMLMarker, strokeWidth, stroke, shape.fill);
        } else if (connectorType === 'erd' && shape.endCardinality && shape.endCardinality !== 'none') {
          // Draw ERD cardinality symbol
          drawCardinalitySymbol(ctx, lastPt, endAngle, shape.endCardinality, strokeWidth);
        } else if (endArrow) {
          // Draw regular arrow
          ctx.fillStyle = stroke;
          drawArrowHead(ctx, lastPt, endAngle, arrowSize);
        }
      }
    }

    // Draw label if present
    if (shape.label && shape.label.trim()) {
      const labelPosition = shape.labelPosition ?? 0.5;
      const { point } = getPointAlongPath(points, labelPosition);
      const fontSize = shape.labelFontSize ?? 12;
      const color = shape.labelColor ?? stroke ?? '#000000';
      const backgroundColor = shape.labelBackground;
      const offsetX = shape.labelOffsetX ?? 0;
      const offsetY = shape.labelOffsetY ?? 0;

      renderConnectorLabel(ctx, shape.label, point, fontSize, color, backgroundColor, offsetX, offsetY);
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
