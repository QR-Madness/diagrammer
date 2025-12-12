import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { ShapeHandler, shapeRegistry } from './ShapeRegistry';
import {
  RectangleShape,
  Handle,
  HandleType,
  DEFAULT_RECTANGLE,
} from './Shape';

/**
 * Get the four corners of a rectangle in local space (before rotation).
 */
function getLocalCorners(shape: RectangleShape): Vec2[] {
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;

  return [
    new Vec2(-halfWidth, -halfHeight), // top-left
    new Vec2(halfWidth, -halfHeight), // top-right
    new Vec2(halfWidth, halfHeight), // bottom-right
    new Vec2(-halfWidth, halfHeight), // bottom-left
  ];
}

/**
 * Transform a local point to world space.
 */
function localToWorld(local: Vec2, shape: RectangleShape): Vec2 {
  // Rotate around origin, then translate to shape position
  const rotated = local.rotate(shape.rotation);
  return new Vec2(rotated.x + shape.x, rotated.y + shape.y);
}

/**
 * Transform a world point to local space.
 */
function worldToLocal(world: Vec2, shape: RectangleShape): Vec2 {
  // Translate to origin, then rotate by negative angle
  const translated = new Vec2(world.x - shape.x, world.y - shape.y);
  return translated.rotate(-shape.rotation);
}

/**
 * Get the four corners of a rectangle in world space.
 */
function getWorldCorners(shape: RectangleShape): Vec2[] {
  return getLocalCorners(shape).map((corner) => localToWorld(corner, shape));
}

/**
 * Rectangle shape handler implementation.
 */
export const rectangleHandler: ShapeHandler<RectangleShape> = {
  /**
   * Render a rectangle to the canvas context.
   * Handles rotation, fill, stroke, and rounded corners.
   */
  render(ctx: CanvasRenderingContext2D, shape: RectangleShape): void {
    const { x, y, width, height, rotation, fill, stroke, strokeWidth, opacity, cornerRadius } =
      shape;

    ctx.save();

    // Set opacity
    ctx.globalAlpha = opacity;

    // Transform to shape's local coordinate system
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Draw the rectangle path
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    ctx.beginPath();

    if (cornerRadius > 0) {
      // Rounded rectangle
      const r = Math.min(cornerRadius, halfWidth, halfHeight);
      ctx.moveTo(-halfWidth + r, -halfHeight);
      ctx.lineTo(halfWidth - r, -halfHeight);
      ctx.arcTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r, r);
      ctx.lineTo(halfWidth, halfHeight - r);
      ctx.arcTo(halfWidth, halfHeight, halfWidth - r, halfHeight, r);
      ctx.lineTo(-halfWidth + r, halfHeight);
      ctx.arcTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r, r);
      ctx.lineTo(-halfWidth, -halfHeight + r);
      ctx.arcTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight, r);
    } else {
      // Sharp corners
      ctx.rect(-halfWidth, -halfHeight, width, height);
    }

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

    ctx.restore();
  },

  /**
   * Test if a world point is inside the rectangle.
   * Works correctly for rotated rectangles.
   */
  hitTest(shape: RectangleShape, worldPoint: Vec2): boolean {
    // Transform point to local space
    const local = worldToLocal(worldPoint, shape);

    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;

    // Add stroke width to hit area
    const strokePadding = shape.strokeWidth / 2;

    return (
      local.x >= -halfWidth - strokePadding &&
      local.x <= halfWidth + strokePadding &&
      local.y >= -halfHeight - strokePadding &&
      local.y <= halfHeight + strokePadding
    );
  },

  /**
   * Get the axis-aligned bounding box of the rectangle.
   * Accounts for rotation.
   */
  getBounds(shape: RectangleShape): Box {
    const corners = getWorldCorners(shape);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    // Add stroke width padding
    const padding = shape.strokeWidth / 2;

    return new Box(minX - padding, minY - padding, maxX + padding, maxY + padding);
  },

  /**
   * Get the resize handles for the rectangle.
   * Returns 8 handles: 4 corners + 4 edge midpoints.
   */
  getHandles(shape: RectangleShape): Handle[] {
    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;

    // Handle positions in local space
    const localHandles: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
      { type: 'top-left', x: -halfWidth, y: -halfHeight, cursor: 'nwse-resize' },
      { type: 'top', x: 0, y: -halfHeight, cursor: 'ns-resize' },
      { type: 'top-right', x: halfWidth, y: -halfHeight, cursor: 'nesw-resize' },
      { type: 'right', x: halfWidth, y: 0, cursor: 'ew-resize' },
      { type: 'bottom-right', x: halfWidth, y: halfHeight, cursor: 'nwse-resize' },
      { type: 'bottom', x: 0, y: halfHeight, cursor: 'ns-resize' },
      { type: 'bottom-left', x: -halfWidth, y: halfHeight, cursor: 'nesw-resize' },
      { type: 'left', x: -halfWidth, y: 0, cursor: 'ew-resize' },
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
   * Create a new rectangle at the given position.
   */
  create(position: Vec2, id: string): RectangleShape {
    return {
      id,
      type: 'rectangle',
      x: position.x,
      y: position.y,
      rotation: DEFAULT_RECTANGLE.rotation,
      opacity: DEFAULT_RECTANGLE.opacity,
      locked: DEFAULT_RECTANGLE.locked,
      fill: DEFAULT_RECTANGLE.fill,
      stroke: DEFAULT_RECTANGLE.stroke,
      strokeWidth: DEFAULT_RECTANGLE.strokeWidth,
      width: DEFAULT_RECTANGLE.width,
      height: DEFAULT_RECTANGLE.height,
      cornerRadius: DEFAULT_RECTANGLE.cornerRadius,
    };
  },
};

// Register the rectangle handler
shapeRegistry.register('rectangle', rectangleHandler);
