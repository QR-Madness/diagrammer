import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';
import { RectangleShape, DEFAULT_RECTANGLE } from '../../shapes/Shape';
import { nanoid } from 'nanoid';

/**
 * State machine states for the RectangleTool.
 */
type RectangleState = 'idle' | 'drawing';

/**
 * Minimum size in world units to create a shape.
 * Prevents creating invisible shapes from accidental clicks.
 */
const MIN_SIZE = 5;

/**
 * Rectangle tool for creating rectangle shapes.
 *
 * Features:
 * - Click and drag to create a rectangle
 * - Preview rectangle while drawing
 * - Hold Shift to constrain to square
 * - Escape to cancel creation
 * - Automatically selects created shape and switches to Select tool
 */
export class RectangleTool extends BaseTool {
  readonly type: ToolType = 'rectangle';
  readonly name = 'Rectangle';
  readonly shortcut = 'r';

  private state: RectangleState = 'idle';
  private startPoint: Vec2 | null = null;
  private currentPoint: Vec2 | null = null;
  private isShiftHeld = false;

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
    const rect = this.calculateRectangle();

    if (rect && rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
      // Create the shape
      const id = nanoid();
      const shape: RectangleShape = {
        id,
        type: 'rectangle',
        x: rect.centerX,
        y: rect.centerY,
        width: rect.width,
        height: rect.height,
        rotation: DEFAULT_RECTANGLE.rotation,
        opacity: DEFAULT_RECTANGLE.opacity,
        locked: DEFAULT_RECTANGLE.locked,
        fill: DEFAULT_RECTANGLE.fill,
        stroke: DEFAULT_RECTANGLE.stroke,
        strokeWidth: DEFAULT_RECTANGLE.strokeWidth,
        cornerRadius: DEFAULT_RECTANGLE.cornerRadius,
      };

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

    const rect = this.calculateRectangle();
    if (!rect) return;

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

    // Draw preview rectangle
    ctx2d.fillStyle = 'rgba(74, 144, 217, 0.3)'; // Semi-transparent blue
    ctx2d.fillRect(x, y, width, height);

    ctx2d.strokeStyle = '#4a90d9';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([]);
    ctx2d.strokeRect(x, y, width, height);

    ctx2d.restore();
  }

  /**
   * Calculate the rectangle from start and current points.
   * Applies shift constraint if needed.
   */
  private calculateRectangle(): {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  } | null {
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
    const left = this.currentPoint.x >= this.startPoint.x
      ? this.startPoint.x
      : this.startPoint.x - width;
    const top = this.currentPoint.y >= this.startPoint.y
      ? this.startPoint.y
      : this.startPoint.y - height;

    return {
      centerX: left + width / 2,
      centerY: top + height / 2,
      width,
      height,
    };
  }

  private resetState(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.isShiftHeld = false;
  }
}
