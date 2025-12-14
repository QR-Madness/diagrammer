import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { ShapeHandler, shapeRegistry } from './ShapeRegistry';
import { TextShape, Handle, HandleType, DEFAULT_TEXT } from './Shape';

/**
 * Transform a local point to world space.
 */
function localToWorld(local: Vec2, shape: TextShape): Vec2 {
  const rotated = local.rotate(shape.rotation);
  return new Vec2(rotated.x + shape.x, rotated.y + shape.y);
}

/**
 * Transform a world point to local space.
 */
function worldToLocal(world: Vec2, shape: TextShape): Vec2 {
  const translated = new Vec2(world.x - shape.x, world.y - shape.y);
  return translated.rotate(-shape.rotation);
}

/**
 * Calculate the height of the text block based on content.
 */
function calculateTextHeight(shape: TextShape): number {
  // Estimate height based on number of lines and font size
  const lines = shape.text.split('\n');
  const lineHeight = shape.fontSize * 1.2;
  return Math.max(lines.length * lineHeight, shape.fontSize * 1.2);
}

/**
 * Text shape handler implementation.
 */
export const textHandler: ShapeHandler<TextShape> = {
  /**
   * Render text to the canvas context.
   */
  render(ctx: CanvasRenderingContext2D, shape: TextShape): void {
    const { x, y, text, fontSize, fontFamily, textAlign, rotation, fill, opacity, width } = shape;

    if (!text) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Set up text style
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = textAlign;

    // Calculate text position based on alignment
    let textX = 0;
    if (textAlign === 'center') {
      textX = width / 2;
    } else if (textAlign === 'right') {
      textX = width;
    }

    // Draw text (simple line-by-line rendering)
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;

    if (fill) {
      ctx.fillStyle = fill;
      lines.forEach((line, index) => {
        ctx.fillText(line, textX, index * lineHeight, width);
      });
    }

    ctx.restore();
  },

  /**
   * Test if a world point is inside the text bounding box.
   */
  hitTest(shape: TextShape, worldPoint: Vec2): boolean {
    const local = worldToLocal(worldPoint, shape);
    const height = calculateTextHeight(shape);

    return local.x >= 0 && local.x <= shape.width && local.y >= 0 && local.y <= height;
  },

  /**
   * Get the axis-aligned bounding box of the text.
   */
  getBounds(shape: TextShape): Box {
    const height = calculateTextHeight(shape);
    const halfWidth = shape.width / 2;
    const halfHeight = height / 2;

    // Get corners in local space (text is positioned from top-left)
    const corners = [
      new Vec2(0, 0),
      new Vec2(shape.width, 0),
      new Vec2(shape.width, height),
      new Vec2(0, height),
    ];

    // Adjust for center positioning and transform to world
    const worldCorners = corners.map((c) => {
      const centered = new Vec2(c.x - halfWidth, c.y - halfHeight);
      return localToWorld(centered, shape);
    });

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const corner of worldCorners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    return new Box(minX, minY, maxX, maxY);
  },

  /**
   * Get resize handles for the text box.
   */
  getHandles(shape: TextShape): Handle[] {
    const height = calculateTextHeight(shape);
    const halfWidth = shape.width / 2;
    const halfHeight = height / 2;
    const rotationHandleOffset = 30;

    const localHandles: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
      { type: 'top-left', x: -halfWidth, y: -halfHeight, cursor: 'nwse-resize' },
      { type: 'top', x: 0, y: -halfHeight, cursor: 'ns-resize' },
      { type: 'top-right', x: halfWidth, y: -halfHeight, cursor: 'nesw-resize' },
      { type: 'right', x: halfWidth, y: 0, cursor: 'ew-resize' },
      { type: 'bottom-right', x: halfWidth, y: halfHeight, cursor: 'nwse-resize' },
      { type: 'bottom', x: 0, y: halfHeight, cursor: 'ns-resize' },
      { type: 'bottom-left', x: -halfWidth, y: halfHeight, cursor: 'nesw-resize' },
      { type: 'left', x: -halfWidth, y: 0, cursor: 'ew-resize' },
      { type: 'rotation', x: 0, y: -halfHeight - rotationHandleOffset, cursor: 'grab' },
    ];

    return localHandles.map((h) => {
      const world = localToWorld(new Vec2(h.x, h.y), shape);
      return { type: h.type, x: world.x, y: world.y, cursor: h.cursor };
    });
  },

  /**
   * Create a new text shape at the given position.
   */
  create(position: Vec2, id: string): TextShape {
    return {
      id,
      type: 'text',
      x: position.x,
      y: position.y,
      text: 'Text',
      fontSize: DEFAULT_TEXT.fontSize,
      fontFamily: DEFAULT_TEXT.fontFamily,
      textAlign: DEFAULT_TEXT.textAlign,
      width: DEFAULT_TEXT.width,
      rotation: DEFAULT_TEXT.rotation,
      opacity: DEFAULT_TEXT.opacity,
      locked: DEFAULT_TEXT.locked,
      fill: '#000000',
      stroke: DEFAULT_TEXT.stroke,
      strokeWidth: DEFAULT_TEXT.strokeWidth,
    };
  },
};

// Register the text handler
shapeRegistry.register('text', textHandler);
