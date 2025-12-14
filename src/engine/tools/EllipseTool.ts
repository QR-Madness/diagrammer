import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';
import { EllipseShape, DEFAULT_ELLIPSE } from '../../shapes/Shape';
import { nanoid } from 'nanoid';

/**
 * State machine states for the EllipseTool.
 */
type EllipseState = 'idle' | 'drawing';

/**
 * Minimum radius in world units to create a shape.
 * Prevents creating invisible shapes from accidental clicks.
 */
const MIN_RADIUS = 5;

/**
 * Ellipse tool for creating ellipse shapes.
 *
 * Features:
 * - Click and drag to create an ellipse
 * - Preview ellipse while drawing
 * - Hold Shift to constrain to circle
 * - Escape to cancel creation
 * - Automatically selects created shape and switches to Select tool
 */
export class EllipseTool extends BaseTool {
  readonly type: ToolType = 'ellipse';
  readonly name = 'Ellipse';
  readonly shortcut = 'o';

  private state: EllipseState = 'idle';
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

    // Calculate ellipse dimensions
    const ellipse = this.calculateEllipse();

    if (ellipse && ellipse.radiusX >= MIN_RADIUS && ellipse.radiusY >= MIN_RADIUS) {
      // Push history before creating shape
      ctx.pushHistory('Create ellipse');

      // Create the shape
      const id = nanoid();
      const shape: EllipseShape = {
        id,
        type: 'ellipse',
        x: ellipse.centerX,
        y: ellipse.centerY,
        radiusX: ellipse.radiusX,
        radiusY: ellipse.radiusY,
        rotation: DEFAULT_ELLIPSE.rotation,
        opacity: DEFAULT_ELLIPSE.opacity,
        locked: DEFAULT_ELLIPSE.locked,
        fill: DEFAULT_ELLIPSE.fill,
        stroke: DEFAULT_ELLIPSE.stroke,
        strokeWidth: DEFAULT_ELLIPSE.strokeWidth,
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

    const ellipse = this.calculateEllipse();
    if (!ellipse) return;

    const camera = toolCtx.camera;

    // Convert world center to screen
    const center = camera.worldToScreen(new Vec2(ellipse.centerX, ellipse.centerY));

    // Scale radii by zoom
    const zoom = camera.zoom;
    const screenRadiusX = ellipse.radiusX * zoom;
    const screenRadiusY = ellipse.radiusY * zoom;

    ctx2d.save();

    // Draw preview ellipse
    ctx2d.beginPath();
    ctx2d.ellipse(center.x, center.y, screenRadiusX, screenRadiusY, 0, 0, Math.PI * 2);
    ctx2d.closePath();

    ctx2d.fillStyle = 'rgba(74, 144, 217, 0.3)'; // Semi-transparent blue
    ctx2d.fill();

    ctx2d.strokeStyle = '#4a90d9';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([]);
    ctx2d.stroke();

    ctx2d.restore();
  }

  /**
   * Calculate the ellipse from start and current points.
   * Applies shift constraint if needed.
   */
  private calculateEllipse(): {
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
  } | null {
    if (!this.startPoint || !this.currentPoint) return null;

    let radiusX = Math.abs(this.currentPoint.x - this.startPoint.x) / 2;
    let radiusY = Math.abs(this.currentPoint.y - this.startPoint.y) / 2;

    // Constrain to circle if shift is held
    if (this.isShiftHeld) {
      const radius = Math.max(radiusX, radiusY);
      radiusX = radius;
      radiusY = radius;
    }

    // Calculate center based on drag direction
    const width = radiusX * 2;
    const height = radiusY * 2;

    const left = this.currentPoint.x >= this.startPoint.x
      ? this.startPoint.x
      : this.startPoint.x - width;
    const top = this.currentPoint.y >= this.startPoint.y
      ? this.startPoint.y
      : this.startPoint.y - height;

    return {
      centerX: left + radiusX,
      centerY: top + radiusY,
      radiusX,
      radiusY,
    };
  }

  private resetState(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.isShiftHeld = false;
  }
}
