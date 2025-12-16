import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';
import { LineShape, DEFAULT_LINE } from '../../shapes/Shape';
import { nanoid } from 'nanoid';

/**
 * State machine states for the LineTool.
 */
type LineState = 'idle' | 'drawing';

/**
 * Minimum length in world units to create a line.
 * Prevents creating invisible shapes from accidental clicks.
 */
const MIN_LENGTH = 5;

/**
 * Line tool for creating line shapes with optional arrows.
 *
 * Features:
 * - Click and drag to create a line
 * - Preview line while drawing
 * - Hold Shift to constrain to 45-degree angles
 * - Escape to cancel creation
 * - Automatically selects created shape and switches to Select tool
 */
export class LineTool extends BaseTool {
  readonly type: ToolType = 'line';
  readonly name = 'Line';
  readonly shortcut = 'l';

  private state: LineState = 'idle';
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

    // Calculate line endpoints
    const line = this.calculateLine();

    if (line) {
      const length = Math.sqrt(
        Math.pow(line.x2 - line.x, 2) + Math.pow(line.y2 - line.y, 2)
      );

      if (length >= MIN_LENGTH) {
        // Push history before creating shape
        ctx.pushHistory('Create line');

        // Create the shape
        const id = nanoid();
        const shape: LineShape = {
          id,
          type: 'line',
          x: line.x,
          y: line.y,
          x2: line.x2,
          y2: line.y2,
          rotation: DEFAULT_LINE.rotation,
          opacity: DEFAULT_LINE.opacity,
          locked: DEFAULT_LINE.locked,
          visible: DEFAULT_LINE.visible,
          fill: DEFAULT_LINE.fill,
          stroke: DEFAULT_LINE.stroke,
          strokeWidth: DEFAULT_LINE.strokeWidth,
          startArrow: DEFAULT_LINE.startArrow,
          endArrow: DEFAULT_LINE.endArrow,
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

    const line = this.calculateLine();
    if (!line) return;

    const camera = toolCtx.camera;

    // Convert world points to screen points
    const start = camera.worldToScreen(new Vec2(line.x, line.y));
    const end = camera.worldToScreen(new Vec2(line.x2, line.y2));

    ctx2d.save();

    // Draw preview line
    ctx2d.strokeStyle = '#4a90d9';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([5, 5]);

    ctx2d.beginPath();
    ctx2d.moveTo(start.x, start.y);
    ctx2d.lineTo(end.x, end.y);
    ctx2d.stroke();

    // Draw endpoint indicators
    ctx2d.setLineDash([]);
    ctx2d.fillStyle = '#4a90d9';

    // Start point
    ctx2d.beginPath();
    ctx2d.arc(start.x, start.y, 4, 0, Math.PI * 2);
    ctx2d.fill();

    // End point (with arrow indicator)
    ctx2d.beginPath();
    ctx2d.arc(end.x, end.y, 4, 0, Math.PI * 2);
    ctx2d.fill();

    // Draw arrow head preview at end
    const direction = end.subtract(start);
    if (direction.length() > 0) {
      const normalized = direction.normalize();
      const arrowSize = 12;
      const perpendicular = new Vec2(-normalized.y, normalized.x);

      const tip = end;
      const back = end.subtract(normalized.multiply(arrowSize));
      const left = back.add(perpendicular.multiply(arrowSize * 0.5));
      const right = back.subtract(perpendicular.multiply(arrowSize * 0.5));

      ctx2d.beginPath();
      ctx2d.moveTo(tip.x, tip.y);
      ctx2d.lineTo(left.x, left.y);
      ctx2d.lineTo(right.x, right.y);
      ctx2d.closePath();
      ctx2d.fill();
    }

    ctx2d.restore();
  }

  /**
   * Calculate the line from start and current points.
   * Applies shift constraint for 45-degree angles if needed.
   */
  private calculateLine(): {
    x: number;
    y: number;
    x2: number;
    y2: number;
  } | null {
    if (!this.startPoint || !this.currentPoint) return null;

    let endX = this.currentPoint.x;
    let endY = this.currentPoint.y;

    // Constrain to 45-degree angles if shift is held
    if (this.isShiftHeld) {
      const dx = endX - this.startPoint.x;
      const dy = endY - this.startPoint.y;

      // Snap to nearest 45-degree angle
      const angle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const length = Math.sqrt(dx * dx + dy * dy);

      endX = this.startPoint.x + Math.cos(snappedAngle) * length;
      endY = this.startPoint.y + Math.sin(snappedAngle) * length;
    }

    return {
      x: this.startPoint.x,
      y: this.startPoint.y,
      x2: endX,
      y2: endY,
    };
  }

  private resetState(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.isShiftHeld = false;
  }
}
