import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';

/**
 * Pan tool for navigating the canvas.
 *
 * Features:
 * - Click and drag to pan the canvas
 * - Also handles middle-click drag from any tool
 * - Spacebar + drag for temporary pan mode (handled by ToolManager)
 *
 * States:
 * - Idle: Waiting for interaction
 * - Panning: Actively dragging to pan
 */
export class PanTool extends BaseTool {
  readonly type: ToolType = 'pan';
  readonly name = 'Pan';
  readonly shortcut = 'h';

  private isPanning = false;
  private lastScreenPoint: Vec2 | null = null;

  onActivate(ctx: ToolContext): void {
    ctx.setCursor('grab');
  }

  onDeactivate(ctx: ToolContext): void {
    this.isPanning = false;
    this.lastScreenPoint = null;
    ctx.setCursor('default');
  }

  onPointerDown(event: NormalizedPointerEvent, ctx: ToolContext): void {
    // Only pan on left click (or middle click handled separately)
    if (event.button !== 'left') return;

    this.isPanning = true;
    this.lastScreenPoint = event.screenPoint;
    ctx.setCursor('grabbing');
    ctx.setIsInteracting(true);
  }

  onPointerMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (!this.isPanning || !this.lastScreenPoint) return;

    // Calculate delta in screen space
    const deltaX = event.screenPoint.x - this.lastScreenPoint.x;
    const deltaY = event.screenPoint.y - this.lastScreenPoint.y;

    // Pan the camera
    // Note: pan() takes screen delta and applies 1/zoom internally
    ctx.camera.pan(new Vec2(-deltaX, -deltaY));

    this.lastScreenPoint = event.screenPoint;
    ctx.requestRender();
  }

  onPointerUp(_event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.lastScreenPoint = null;
      ctx.setCursor('grab');
      ctx.setIsInteracting(false);
    }
  }

  onKeyDown(event: KeyboardEvent, ctx: ToolContext): boolean {
    // Escape cancels panning
    if (event.key === 'Escape' && this.isPanning) {
      this.isPanning = false;
      this.lastScreenPoint = null;
      ctx.setCursor('grab');
      ctx.setIsInteracting(false);
      return true;
    }
    return false;
  }
}

/**
 * Handle middle-click panning from any tool.
 * This is a utility that can be used by other tools to support middle-click pan.
 */
export class MiddleClickPanHandler {
  private isPanning = false;
  private lastScreenPoint: Vec2 | null = null;

  /**
   * Check if we're currently panning.
   */
  get isActive(): boolean {
    return this.isPanning;
  }

  /**
   * Handle pointer down event.
   * @returns true if this is a middle-click pan start
   */
  handlePointerDown(event: NormalizedPointerEvent, ctx: ToolContext): boolean {
    if (event.button !== 'middle') return false;

    this.isPanning = true;
    this.lastScreenPoint = event.screenPoint;
    // We don't change cursor here - let the main tool manage that
    ctx.setIsInteracting(true);
    return true;
  }

  /**
   * Handle pointer move event.
   * @returns true if the event was handled (we're panning)
   */
  handlePointerMove(event: NormalizedPointerEvent, ctx: ToolContext): boolean {
    if (!this.isPanning || !this.lastScreenPoint) return false;

    const deltaX = event.screenPoint.x - this.lastScreenPoint.x;
    const deltaY = event.screenPoint.y - this.lastScreenPoint.y;

    ctx.camera.pan(new Vec2(-deltaX, -deltaY));

    this.lastScreenPoint = event.screenPoint;
    ctx.requestRender();
    return true;
  }

  /**
   * Handle pointer up event.
   * @returns true if this ended a middle-click pan
   */
  handlePointerUp(event: NormalizedPointerEvent, ctx: ToolContext): boolean {
    if (!this.isPanning) return false;
    if (event.button !== 'middle') return false;

    this.isPanning = false;
    this.lastScreenPoint = null;
    ctx.setIsInteracting(false);
    return true;
  }

  /**
   * Reset the pan handler state.
   */
  reset(): void {
    this.isPanning = false;
    this.lastScreenPoint = null;
  }
}
