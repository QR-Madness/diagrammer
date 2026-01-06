/**
 * Factory for creating ShapeHandler implementations from LibraryShapeDefinition.
 *
 * This enables declarative shape definitions that are automatically converted
 * to fully functional shape handlers for rendering, hit testing, and manipulation.
 */

import { Vec2 } from '../../math/Vec2';
import { Box } from '../../math/Box';
import type { ShapeHandler } from '../ShapeRegistry';
import type { LibraryShape, Handle, HandleType, Anchor } from '../Shape';
import { DEFAULT_LIBRARY_SHAPE } from '../Shape';
import type { LibraryShapeDefinition } from './ShapeLibraryTypes';
import { renderWrappedText } from '../../utils/textUtils';
import { drawIcon } from '../../utils/iconCache';

/**
 * Transform a local point to world space.
 */
function localToWorld(local: Vec2, shape: LibraryShape): Vec2 {
  const rotated = local.rotate(shape.rotation);
  return new Vec2(rotated.x + shape.x, rotated.y + shape.y);
}

/**
 * Transform a world point to local space.
 */
function worldToLocal(world: Vec2, shape: LibraryShape): Vec2 {
  const translated = new Vec2(world.x - shape.x, world.y - shape.y);
  return translated.rotate(-shape.rotation);
}

/**
 * Get the four corners of a rectangular bounding box in local space.
 */
function getLocalCorners(width: number, height: number): Vec2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    new Vec2(-halfWidth, -halfHeight),
    new Vec2(halfWidth, -halfHeight),
    new Vec2(halfWidth, halfHeight),
    new Vec2(-halfWidth, halfHeight),
  ];
}

/**
 * Get the four corners of a shape in world space.
 */
function getWorldCorners(shape: LibraryShape): Vec2[] {
  return getLocalCorners(shape.width, shape.height).map((corner) =>
    localToWorld(corner, shape)
  );
}

/**
 * Create an offscreen canvas context for path hit testing.
 * This is cached per-call to avoid creating too many contexts.
 */
let hitTestCanvas: CanvasRenderingContext2D | null = null;

function getHitTestContext(): CanvasRenderingContext2D {
  if (!hitTestCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    hitTestCanvas = canvas.getContext('2d')!;
  }
  return hitTestCanvas;
}

/**
 * Create a ShapeHandler implementation from a LibraryShapeDefinition.
 *
 * The generated handler provides:
 * - Rendering with fill, stroke, icon, and label support
 * - Path-based or bounds-based hit testing
 * - Bounding box calculation with rotation support
 * - 8 resize handles + 1 rotation handle
 * - Anchor points for connector attachment
 */
export function createLibraryShapeHandler(
  definition: LibraryShapeDefinition
): ShapeHandler<LibraryShape> {
  return {
    /**
     * Render the shape using the definition's path builder.
     */
    render(ctx: CanvasRenderingContext2D, shape: LibraryShape): void {
      const { x, y, width, height, rotation, fill, stroke, strokeWidth, opacity } = shape;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Build the path from the definition
      const path = definition.pathBuilder(width, height);

      // Fill
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill(path);
      }

      // Stroke
      if (stroke && strokeWidth > 0) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.stroke(path);
      }

      // Call custom render if defined
      if (definition.customRender) {
        definition.customRender(ctx, shape, path);
      }

      // Draw icon if present
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      if (shape.iconId) {
        const iconSize = shape.iconSize || DEFAULT_LIBRARY_SHAPE.iconSize;
        const iconPadding = shape.iconPadding || DEFAULT_LIBRARY_SHAPE.iconPadding;
        const iconPosition = shape.iconPosition || 'top-left';

        // Calculate icon position based on iconPosition setting
        let iconX: number;
        let iconY: number;

        switch (iconPosition) {
          case 'top-right':
            iconX = halfWidth - iconPadding - iconSize;
            iconY = -halfHeight + iconPadding;
            break;
          case 'bottom-left':
            iconX = -halfWidth + iconPadding;
            iconY = halfHeight - iconPadding - iconSize;
            break;
          case 'bottom-right':
            iconX = halfWidth - iconPadding - iconSize;
            iconY = halfHeight - iconPadding - iconSize;
            break;
          case 'center':
            iconX = -iconSize / 2;
            iconY = -iconSize / 2;
            break;
          case 'top-left':
          default:
            iconX = -halfWidth + iconPadding;
            iconY = -halfHeight + iconPadding;
            break;
        }

        // Use explicit iconColor if set, otherwise fall back to stroke color
        const iconColor = shape.iconColor || stroke || '#333333';
        drawIcon(ctx, shape.iconId, iconX, iconY, iconSize, iconColor);
      }

      // Draw label if present (unless custom rendering handles it)
      if (shape.label && !definition.customLabelRendering) {
        const fontSize = shape.labelFontSize || DEFAULT_LIBRARY_SHAPE.labelFontSize;
        const labelColor = shape.labelColor || stroke || '#000000';
        const labelBackground = shape.labelBackground;
        const labelOffsetX = shape.labelOffsetX || 0;
        const labelOffsetY = shape.labelOffsetY || 0;
        const textMaxWidth = width * 0.85;
        const textMaxHeight = height * 0.85;

        // Apply offset for label positioning
        ctx.save();
        ctx.translate(labelOffsetX, labelOffsetY);

        // Draw label background if specified
        if (labelBackground) {
          // Measure text to get background dimensions
          ctx.font = `${fontSize}px sans-serif`;
          const lines = shape.label.split('\n');
          const lineHeight = fontSize * 1.2;
          let maxLineWidth = 0;
          for (const line of lines) {
            const metrics = ctx.measureText(line);
            maxLineWidth = Math.max(maxLineWidth, metrics.width);
          }
          const bgWidth = Math.min(maxLineWidth + 12, textMaxWidth + 12);
          const bgHeight = Math.min(lines.length * lineHeight + 8, textMaxHeight + 8);

          ctx.fillStyle = labelBackground;
          ctx.fillRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);
        }

        renderWrappedText(
          ctx,
          shape.label,
          textMaxWidth,
          textMaxHeight,
          fontSize,
          'sans-serif',
          labelColor
        );
        ctx.restore();
      }

      ctx.restore();
    },

    /**
     * Test if a world point is inside the shape.
     */
    hitTest(shape: LibraryShape, worldPoint: Vec2): boolean {
      const local = worldToLocal(worldPoint, shape);

      // Use bounds-based hit test if specified
      if (definition.hitTestMode === 'bounds') {
        const halfWidth = shape.width / 2;
        const halfHeight = shape.height / 2;
        const strokePadding = shape.strokeWidth / 2;

        return (
          local.x >= -halfWidth - strokePadding &&
          local.x <= halfWidth + strokePadding &&
          local.y >= -halfHeight - strokePadding &&
          local.y <= halfHeight + strokePadding
        );
      }

      // Path-based hit test (default)
      const path = definition.pathBuilder(shape.width, shape.height);
      const ctx = getHitTestContext();

      // Check if point is inside the path
      // Note: isPointInPath uses the current transform, so we need to reset it
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Check fill area
      if (ctx.isPointInPath(path, local.x, local.y)) {
        return true;
      }

      // Also check stroke area for shapes with visible stroke
      if (shape.stroke && shape.strokeWidth > 0) {
        ctx.lineWidth = Math.max(shape.strokeWidth, 5); // Minimum 5px hit area
        if (ctx.isPointInStroke(path, local.x, local.y)) {
          return true;
        }
      }

      return false;
    },

    /**
     * Get the axis-aligned bounding box.
     */
    getBounds(shape: LibraryShape): Box {
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

      const padding = shape.strokeWidth / 2;
      return new Box(minX - padding, minY - padding, maxX + padding, maxY + padding);
    },

    /**
     * Get resize and rotation handles.
     */
    getHandles(shape: LibraryShape): Handle[] {
      const halfWidth = shape.width / 2;
      const halfHeight = shape.height / 2;
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
        return {
          type: h.type,
          x: world.x,
          y: world.y,
          cursor: h.cursor,
        };
      });
    },

    /**
     * Create a new shape at the given position.
     */
    create(position: Vec2, id: string): LibraryShape {
      return {
        id,
        type: definition.type,
        x: position.x,
        y: position.y,
        width: definition.metadata.defaultWidth,
        height: definition.metadata.defaultHeight,
        rotation: DEFAULT_LIBRARY_SHAPE.rotation,
        opacity: DEFAULT_LIBRARY_SHAPE.opacity,
        locked: DEFAULT_LIBRARY_SHAPE.locked,
        visible: DEFAULT_LIBRARY_SHAPE.visible,
        fill: DEFAULT_LIBRARY_SHAPE.fill,
        stroke: DEFAULT_LIBRARY_SHAPE.stroke,
        strokeWidth: DEFAULT_LIBRARY_SHAPE.strokeWidth,
      };
    },

    /**
     * Get connector anchor points.
     */
    getAnchors(shape: LibraryShape): Anchor[] {
      return definition.anchors.map((anchorDef) => {
        const localX = anchorDef.x(shape.width, shape.height);
        const localY = anchorDef.y(shape.width, shape.height);
        const world = localToWorld(new Vec2(localX, localY), shape);

        return {
          position: anchorDef.position,
          x: world.x,
          y: world.y,
        };
      });
    },
  };
}
