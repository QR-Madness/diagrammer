/**
 * DragToCreateTool - Base class for tools that create shapes by dragging.
 *
 * This harness abstracts the common patterns for shape creation tools:
 * - State machine: idle → drawing → idle
 * - Click and drag to define shape bounds
 * - Shift key for aspect ratio constraint (square)
 * - Escape to cancel
 * - Preview rendering during drag
 * - Auto-select and switch to Select tool after creation
 *
 * Subclasses only need to implement:
 * - createShape(): Create the actual shape object
 * - renderPreview(): Draw the shape preview during drag
 */

import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';
import { Shape } from '../../shapes/Shape';
import { nanoid } from 'nanoid';

/**
 * State machine states for drag-to-create tools.
 */
type DragState = 'idle' | 'drawing';

/**
 * Minimum size in world units to create a shape.
 * Prevents creating invisible shapes from accidental clicks.
 */
const MIN_SIZE = 5;

/**
 * Rectangle dimensions calculated from drag points.
 */
export interface DragRect {
  /** Center X coordinate in world space */
  centerX: number;
  /** Center Y coordinate in world space */
  centerY: number;
  /** Width in world units */
  width: number;
  /** Height in world units */
  height: number;
}

/**
 * Abstract base class for tools that create shapes by clicking and dragging.
 *
 * Usage:
 * ```typescript
 * class MyShapeTool extends DragToCreateTool {
 *   readonly type: ToolType = 'my-shape';
 *   readonly name = 'My Shape';
 *   readonly shortcut = 'm';
 *
 *   protected createShape(rect: DragRect, id: string): Shape {
 *     return { id, type: 'my-shape', x: rect.centerX, ... };
 *   }
 *
 *   protected renderPreview(ctx2d: CanvasRenderingContext2D, toolCtx: ToolContext, rect: DragRect): void {
 *     // Draw preview shape
 *   }
 * }
 * ```
 */
export abstract class DragToCreateTool extends BaseTool {
  abstract readonly type: ToolType;
  abstract readonly name: string;

  private state: DragState = 'idle';
  protected startPoint: Vec2 | null = null;
  protected currentPoint: Vec2 | null = null;
  protected isShiftHeld = false;

  /**
   * Create the shape object from the drag rectangle.
   * @param rect The calculated rectangle bounds
   * @param id The unique ID for the new shape
   * @returns The shape object to add to the document
   */
  protected abstract createShape(rect: DragRect, id: string): Shape;

  /**
   * Render the shape preview during drag.
   * @param ctx2d Canvas 2D context (in screen space)
   * @param toolCtx Tool context with camera and other utilities
   * @param rect The calculated rectangle bounds (in world space)
   */
  protected abstract renderPreview(
    ctx2d: CanvasRenderingContext2D,
    toolCtx: ToolContext,
    rect: DragRect
  ): void;

  /**
   * Get the history action name for creating this shape.
   * Can be overridden for custom action names.
   */
  protected getHistoryActionName(): string {
    return `Create ${this.name.toLowerCase()}`;
  }

  /**
   * Optional minimum size override. Default is 5.
   */
  protected getMinSize(): number {
    return MIN_SIZE;
  }

  onActivate(ctx: ToolContext): void {
    ctx.setCursor('crosshair');
  }

  onDeactivate(ctx: ToolContext): void {
    this.resetState();
    ctx.setCursor('default');
    ctx.setIsInteracting(false);
    ctx.requestRender();
  }

  onPointerDown(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (event.button !== 'left') return;

    this.state = 'drawing';
    this.startPoint = event.worldPoint;
    this.currentPoint = event.worldPoint;
    this.isShiftHeld = event.modifiers.shift;

    ctx.setIsInteracting(true);
    ctx.requestRender();
  }

  onPointerMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (this.state !== 'drawing') return;

    this.currentPoint = event.worldPoint;
    this.isShiftHeld = event.modifiers.shift;
    ctx.requestRender();
  }

  onPointerUp(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (event.button !== 'left') return;
    if (this.state !== 'drawing') return;

    this.currentPoint = event.worldPoint;
    this.isShiftHeld = event.modifiers.shift;

    // Calculate rectangle dimensions
    const rect = this.calculateRect();
    const minSize = this.getMinSize();

    if (rect && rect.width >= minSize && rect.height >= minSize) {
      // Push history before creating shape
      ctx.pushHistory(this.getHistoryActionName());

      // Create the shape
      const id = nanoid();
      const shape = this.createShape(rect, id);

      // Add to document
      ctx.addShape(shape);

      // Update spatial index
      ctx.spatialIndex.insert(shape);

      // Select the new shape
      ctx.select([id]);

      // Switch to select tool
      ctx.setActiveTool('select');
    }

    this.resetState();
    ctx.setIsInteracting(false);
    ctx.requestRender();
  }

  onKeyDown(event: KeyboardEvent, ctx: ToolContext): boolean {
    if (event.key === 'Escape') {
      if (this.state === 'drawing') {
        this.resetState();
        ctx.setIsInteracting(false);
        ctx.requestRender();
        return true;
      }
    }

    if (event.key === 'Shift') {
      this.isShiftHeld = true;
      if (this.state === 'drawing') {
        ctx.requestRender();
      }
      return false; // Let other handlers also see this
    }

    return false;
  }

  onKeyUp(event: KeyboardEvent, ctx: ToolContext): boolean {
    if (event.key === 'Shift') {
      this.isShiftHeld = false;
      if (this.state === 'drawing') {
        ctx.requestRender();
      }
    }
    return false;
  }

  renderOverlay(ctx2d: CanvasRenderingContext2D, toolCtx: ToolContext): void {
    if (this.state !== 'drawing') return;

    const rect = this.calculateRect();
    if (!rect) return;

    this.renderPreview(ctx2d, toolCtx, rect);
  }

  /**
   * Calculate the rectangle from start and current points.
   * Applies shift constraint (square) if needed.
   */
  protected calculateRect(): DragRect | null {
    if (!this.startPoint || !this.currentPoint) return null;

    let width = Math.abs(this.currentPoint.x - this.startPoint.x);
    let height = Math.abs(this.currentPoint.y - this.startPoint.y);

    // Constrain to square if shift is held
    if (this.isShiftHeld) {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    // Calculate corner positions based on drag direction
    const left =
      this.currentPoint.x >= this.startPoint.x
        ? this.startPoint.x
        : this.startPoint.x - width;
    const top =
      this.currentPoint.y >= this.startPoint.y
        ? this.startPoint.y
        : this.startPoint.y - height;

    return {
      centerX: left + width / 2,
      centerY: top + height / 2,
      width,
      height,
    };
  }

  /**
   * Reset tool state to idle.
   */
  protected resetState(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.isShiftHeld = false;
  }
}

/**
 * Helper: Render a simple rectangular preview (fill + stroke).
 * Can be used by subclasses for basic rectangle-based preview.
 */
export function renderRectPreview(
  ctx2d: CanvasRenderingContext2D,
  toolCtx: ToolContext,
  rect: DragRect,
  options: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  } = {}
): void {
  const {
    fillColor = 'rgba(74, 144, 217, 0.3)',
    strokeColor = '#4a90d9',
    strokeWidth = 2,
  } = options;

  const camera = toolCtx.camera;

  // Convert world points to screen points
  const topLeft = camera.worldToScreen(
    new Vec2(rect.centerX - rect.width / 2, rect.centerY - rect.height / 2)
  );
  const bottomRight = camera.worldToScreen(
    new Vec2(rect.centerX + rect.width / 2, rect.centerY + rect.height / 2)
  );

  const x = topLeft.x;
  const y = topLeft.y;
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;

  ctx2d.save();

  ctx2d.fillStyle = fillColor;
  ctx2d.fillRect(x, y, width, height);

  ctx2d.strokeStyle = strokeColor;
  ctx2d.lineWidth = strokeWidth;
  ctx2d.setLineDash([]);
  ctx2d.strokeRect(x, y, width, height);

  ctx2d.restore();
}

/**
 * Helper: Render a path-based preview.
 * Useful for library shapes that use Path2D.
 */
export function renderPathPreview(
  ctx2d: CanvasRenderingContext2D,
  toolCtx: ToolContext,
  rect: DragRect,
  pathBuilder: (width: number, height: number) => Path2D,
  options: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  } = {}
): void {
  const {
    fillColor = 'rgba(74, 144, 217, 0.3)',
    strokeColor = '#4a90d9',
    strokeWidth = 2,
  } = options;

  const camera = toolCtx.camera;
  const screenCenter = camera.worldToScreen(new Vec2(rect.centerX, rect.centerY));
  const scale = camera.zoom;

  ctx2d.save();
  ctx2d.translate(screenCenter.x, screenCenter.y);
  ctx2d.scale(scale, scale);

  const path = pathBuilder(rect.width, rect.height);

  ctx2d.fillStyle = fillColor;
  ctx2d.fill(path);

  ctx2d.strokeStyle = strokeColor;
  ctx2d.lineWidth = strokeWidth / scale;
  ctx2d.stroke(path);

  ctx2d.restore();
}
