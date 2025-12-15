import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { ShapeHandler, shapeRegistry } from './ShapeRegistry';
import {
  EllipseShape,
  Handle,
  HandleType,
  Anchor,
  AnchorPosition,
  DEFAULT_ELLIPSE,
} from './Shape';

/**
 * Transform a local point to world space.
 */
function localToWorld(local: Vec2, shape: EllipseShape): Vec2 {
  // Rotate around origin, then translate to shape position
  const rotated = local.rotate(shape.rotation);
  return new Vec2(rotated.x + shape.x, rotated.y + shape.y);
}

/**
 * Transform a world point to local space.
 */
function worldToLocal(world: Vec2, shape: EllipseShape): Vec2 {
  // Translate to origin, then rotate by negative angle
  const translated = new Vec2(world.x - shape.x, world.y - shape.y);
  return translated.rotate(-shape.rotation);
}

/**
 * Get points on the ellipse boundary for bounding box calculation.
 * Uses parametric sampling to get accurate bounds for rotated ellipses.
 */
function getEllipseBoundaryPoints(shape: EllipseShape, numSamples = 32): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < numSamples; i++) {
    const t = (i / numSamples) * Math.PI * 2;
    const local = new Vec2(
      shape.radiusX * Math.cos(t),
      shape.radiusY * Math.sin(t)
    );
    points.push(localToWorld(local, shape));
  }
  return points;
}

/**
 * Ellipse shape handler implementation.
 */
export const ellipseHandler: ShapeHandler<EllipseShape> = {
  /**
   * Render an ellipse to the canvas context.
   * Handles rotation, fill, stroke, and label.
   */
  render(ctx: CanvasRenderingContext2D, shape: EllipseShape): void {
    const { x, y, radiusX, radiusY, rotation, fill, stroke, strokeWidth, opacity } = shape;

    ctx.save();

    // Set opacity
    ctx.globalAlpha = opacity;

    // Transform to shape's local coordinate system
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Draw the ellipse path
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.closePath();

    // Fill
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    // Stroke
    if (stroke && strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    // Draw label if present
    if (shape.label) {
      const fontSize = shape.labelFontSize || 14;
      const labelColor = shape.labelColor || stroke || '#000000';

      ctx.fillStyle = labelColor;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shape.label, 0, 0);
    }

    ctx.restore();
  },

  /**
   * Test if a world point is inside the ellipse.
   * Works correctly for rotated ellipses.
   */
  hitTest(shape: EllipseShape, worldPoint: Vec2): boolean {
    // Transform point to local space
    const local = worldToLocal(worldPoint, shape);

    // Add stroke width to hit area
    const strokePadding = shape.strokeWidth / 2;
    const rx = shape.radiusX + strokePadding;
    const ry = shape.radiusY + strokePadding;

    // Check if point is inside ellipse using standard equation:
    // (x/rx)^2 + (y/ry)^2 <= 1
    const normalizedX = local.x / rx;
    const normalizedY = local.y / ry;

    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  },

  /**
   * Get the axis-aligned bounding box of the ellipse.
   * Accounts for rotation.
   */
  getBounds(shape: EllipseShape): Box {
    // For a rotated ellipse, we need to find the extrema analytically
    // or sample points. Analytical solution is more accurate.
    const { x, y, radiusX, radiusY, rotation, strokeWidth } = shape;

    if (rotation === 0) {
      // Unrotated ellipse - simple case
      const padding = strokeWidth / 2;
      return new Box(
        x - radiusX - padding,
        y - radiusY - padding,
        x + radiusX + padding,
        y + radiusY + padding
      );
    }

    // For rotated ellipse, sample the boundary to find extrema
    // (Analytical solution exists but sampling is simpler and fast enough)
    const points = getEllipseBoundaryPoints(shape, 64);

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

    // Add stroke width padding
    const padding = strokeWidth / 2;

    return new Box(minX - padding, minY - padding, maxX + padding, maxY + padding);
  },

  /**
   * Get the resize and rotation handles for the ellipse.
   * Returns 8 resize handles (4 on axes + 4 at 45 degree positions) + 1 rotation handle.
   */
  getHandles(shape: EllipseShape): Handle[] {
    const { radiusX, radiusY } = shape;

    // Rotation handle distance above the shape
    const rotationHandleOffset = 30;

    // Handle positions in local space (similar pattern to rectangle)
    const localHandles: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
      { type: 'top-left', x: -radiusX * Math.SQRT1_2, y: -radiusY * Math.SQRT1_2, cursor: 'nwse-resize' },
      { type: 'top', x: 0, y: -radiusY, cursor: 'ns-resize' },
      { type: 'top-right', x: radiusX * Math.SQRT1_2, y: -radiusY * Math.SQRT1_2, cursor: 'nesw-resize' },
      { type: 'right', x: radiusX, y: 0, cursor: 'ew-resize' },
      { type: 'bottom-right', x: radiusX * Math.SQRT1_2, y: radiusY * Math.SQRT1_2, cursor: 'nwse-resize' },
      { type: 'bottom', x: 0, y: radiusY, cursor: 'ns-resize' },
      { type: 'bottom-left', x: -radiusX * Math.SQRT1_2, y: radiusY * Math.SQRT1_2, cursor: 'nesw-resize' },
      { type: 'left', x: -radiusX, y: 0, cursor: 'ew-resize' },
      { type: 'rotation', x: 0, y: -radiusY - rotationHandleOffset, cursor: 'grab' },
    ];

    // Transform to world space
    return localHandles.map((h) => {
      const world = localToWorld(new Vec2(h.x, h.y), shape);
      return {
        type: h.type,
        x: world.x,
        y: world.y,
        cursor: h.cursor,
      };
    });
  },

  /**
   * Create a new ellipse at the given position.
   */
  create(position: Vec2, id: string): EllipseShape {
    return {
      id,
      type: 'ellipse',
      x: position.x,
      y: position.y,
      rotation: DEFAULT_ELLIPSE.rotation,
      opacity: DEFAULT_ELLIPSE.opacity,
      locked: DEFAULT_ELLIPSE.locked,
      fill: DEFAULT_ELLIPSE.fill,
      stroke: DEFAULT_ELLIPSE.stroke,
      strokeWidth: DEFAULT_ELLIPSE.strokeWidth,
      radiusX: DEFAULT_ELLIPSE.radiusX,
      radiusY: DEFAULT_ELLIPSE.radiusY,
    };
  },

  /**
   * Get the connector anchor points for the ellipse.
   * Returns 5 anchors: center and 4 edge midpoints.
   */
  getAnchors(shape: EllipseShape): Anchor[] {
    const { radiusX, radiusY } = shape;

    const localAnchors: Array<{ position: AnchorPosition; x: number; y: number }> = [
      { position: 'center', x: 0, y: 0 },
      { position: 'top', x: 0, y: -radiusY },
      { position: 'right', x: radiusX, y: 0 },
      { position: 'bottom', x: 0, y: radiusY },
      { position: 'left', x: -radiusX, y: 0 },
    ];

    return localAnchors.map((a) => {
      const world = localToWorld(new Vec2(a.x, a.y), shape);
      return {
        position: a.position,
        x: world.x,
        y: world.y,
      };
    });
  },
};

// Register the ellipse handler
shapeRegistry.register('ellipse', ellipseHandler);
