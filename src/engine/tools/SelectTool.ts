import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { Box } from '../../math/Box';
import { ToolType } from '../../store/sessionStore';
import { MiddleClickPanHandler } from './PanTool';

/**
 * State machine states for the SelectTool.
 */
type SelectState =
  | 'idle'
  | 'pending' // Pointer down, waiting to see if drag or click
  | 'translating' // Dragging selected shapes
  | 'marquee'; // Dragging a marquee selection box

/**
 * Threshold in pixels before a click becomes a drag.
 */
const DRAG_THRESHOLD = 3;

/**
 * Select tool for selecting and moving shapes.
 *
 * Features:
 * - Click to select a single shape
 * - Shift+click to add/remove from selection
 * - Click on empty space to clear selection
 * - Drag on empty space for marquee selection
 * - Drag selected shapes to move them
 * - Delete key to delete selected shapes
 * - Middle-click to pan (from any state)
 *
 * State machine:
 * - Idle: Waiting for interaction
 * - Pending: Pointer down, waiting to determine click vs drag
 * - Translating: Dragging selected shapes
 * - Marquee: Dragging a selection rectangle
 */
export class SelectTool extends BaseTool {
  readonly type: ToolType = 'select';
  readonly name = 'Select';
  readonly shortcut = 'v';

  private state: SelectState = 'idle';
  private pointerDownPoint: Vec2 | null = null;
  private pointerDownWorldPoint: Vec2 | null = null;
  private hitShapeId: string | null = null;

  // For translating shapes
  private dragStartPositions: Map<string, { x: number; y: number }> = new Map();

  // For marquee selection
  private marqueeStart: Vec2 | null = null;
  private marqueeEnd: Vec2 | null = null;

  // Middle-click pan support
  private panHandler = new MiddleClickPanHandler();

  onActivate(ctx: ToolContext): void {
    ctx.setCursor('default');
  }

  onDeactivate(ctx: ToolContext): void {
    this.resetState();
    ctx.setCursor('default');
    ctx.setIsInteracting(false);
  }

  onPointerDown(event: NormalizedPointerEvent, ctx: ToolContext): void {
    // Handle middle-click pan
    if (this.panHandler.handlePointerDown(event, ctx)) {
      return;
    }

    if (event.button !== 'left') return;

    this.pointerDownPoint = event.screenPoint;
    this.pointerDownWorldPoint = event.worldPoint;

    // Hit test to see what we clicked on
    const hitResult = ctx.hitTester.hitTestPoint(
      event.worldPoint,
      ctx.getShapes(),
      ctx.getShapeOrder()
    );

    this.hitShapeId = hitResult.id;
    this.state = 'pending';

    // If we clicked on a shape, we might be starting a drag
    if (hitResult.id) {
      // Check if it's already selected
      const selectedIds = ctx.getSelectedIds();
      const isAlreadySelected = selectedIds.includes(hitResult.id);

      if (event.modifiers.shift) {
        // Shift+click: toggle selection
        if (isAlreadySelected) {
          ctx.removeFromSelection([hitResult.id]);
        } else {
          ctx.addToSelection([hitResult.id]);
        }
      } else if (!isAlreadySelected) {
        // Click on unselected shape: select only this shape
        ctx.select([hitResult.id]);
      }
      // If already selected without shift, wait to see if it's a click or drag
    }

    ctx.requestRender();
  }

  onPointerMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    // Handle middle-click pan
    if (this.panHandler.handlePointerMove(event, ctx)) {
      return;
    }

    switch (this.state) {
      case 'idle':
        this.handleIdleMove(event, ctx);
        break;

      case 'pending':
        this.handlePendingMove(event, ctx);
        break;

      case 'translating':
        this.handleTranslatingMove(event, ctx);
        break;

      case 'marquee':
        this.handleMarqueeMove(event, ctx);
        break;
    }
  }

  onPointerUp(event: NormalizedPointerEvent, ctx: ToolContext): void {
    // Handle middle-click pan
    if (this.panHandler.handlePointerUp(event, ctx)) {
      return;
    }

    if (event.button !== 'left') return;

    switch (this.state) {
      case 'pending':
        // This was a click, not a drag
        this.handleClick(event, ctx);
        break;

      case 'translating':
        this.finishTranslate(ctx);
        break;

      case 'marquee':
        this.finishMarquee(ctx);
        break;
    }

    this.resetState();
    ctx.setIsInteracting(false);
    ctx.setCursor('default');
    ctx.requestRender();
  }

  onKeyDown(event: KeyboardEvent, ctx: ToolContext): boolean {
    // Delete or Backspace to delete selected shapes
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedIds = ctx.getSelectedIds();
      if (selectedIds.length > 0) {
        ctx.deleteShapes(selectedIds);
        ctx.clearSelection();
        ctx.requestRender();
        return true;
      }
    }

    // Escape to cancel current operation or clear selection
    if (event.key === 'Escape') {
      if (this.state !== 'idle') {
        // Cancel current operation
        // TODO: Revert any in-progress changes
        this.resetState();
        ctx.setIsInteracting(false);
        ctx.setCursor('default');
        ctx.requestRender();
        return true;
      } else if (ctx.getSelectedIds().length > 0) {
        // Clear selection
        ctx.clearSelection();
        ctx.requestRender();
        return true;
      }
    }

    // Ctrl+A or Cmd+A to select all
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      const allIds = ctx.getShapeOrder();
      if (allIds.length > 0) {
        ctx.select(allIds);
        ctx.requestRender();
        return true;
      }
    }

    return false;
  }

  renderOverlay(ctx2d: CanvasRenderingContext2D, toolCtx: ToolContext): void {
    // Draw marquee selection box
    if (this.state === 'marquee' && this.marqueeStart && this.marqueeEnd) {
      const camera = toolCtx.camera;

      // Convert world points to screen points
      const start = camera.worldToScreen(this.marqueeStart);
      const end = camera.worldToScreen(this.marqueeEnd);

      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      // Draw marquee rectangle
      ctx2d.save();

      // Fill with semi-transparent blue
      ctx2d.fillStyle = 'rgba(33, 150, 243, 0.1)';
      ctx2d.fillRect(x, y, width, height);

      // Stroke with blue
      ctx2d.strokeStyle = '#2196f3';
      ctx2d.lineWidth = 1;
      ctx2d.setLineDash([4, 4]);
      ctx2d.strokeRect(x, y, width, height);

      ctx2d.restore();
    }
  }

  // State handlers

  private handleIdleMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    // Update hover state and cursor
    const hitResult = ctx.hitTester.hitTestPoint(
      event.worldPoint,
      ctx.getShapes(),
      ctx.getShapeOrder()
    );

    if (hitResult.id) {
      ctx.setCursor('move');
    } else {
      ctx.setCursor('default');
    }
  }

  private handlePendingMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (!this.pointerDownPoint) return;

    // Check if we've moved enough to start a drag
    const dx = event.screenPoint.x - this.pointerDownPoint.x;
    const dy = event.screenPoint.y - this.pointerDownPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= DRAG_THRESHOLD) {
      // Start drag
      if (this.hitShapeId) {
        // Start translating selected shapes
        this.startTranslate(ctx);
      } else {
        // Start marquee selection
        this.startMarquee();
      }
      ctx.setIsInteracting(true);
    }
  }

  private handleTranslatingMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (!this.pointerDownWorldPoint) return;

    const delta = Vec2.subtract(event.worldPoint, this.pointerDownWorldPoint);

    // Update all selected shapes
    const updates: Array<{ id: string; updates: { x: number; y: number } }> = [];

    for (const [id, startPos] of this.dragStartPositions) {
      updates.push({
        id,
        updates: {
          x: startPos.x + delta.x,
          y: startPos.y + delta.y,
        },
      });
    }

    ctx.updateShapes(updates);
    ctx.requestRender();
  }

  private handleMarqueeMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    this.marqueeEnd = event.worldPoint;
    ctx.requestRender();
  }

  private handleClick(event: NormalizedPointerEvent, ctx: ToolContext): void {
    // This was a click (not a drag)
    if (this.hitShapeId) {
      // Clicked on a shape
      if (!event.modifiers.shift) {
        // Without shift, select only this shape (might already be selected)
        ctx.select([this.hitShapeId]);
      }
      // With shift, toggle already happened in onPointerDown
    } else {
      // Clicked on empty space
      if (!event.modifiers.shift) {
        ctx.clearSelection();
      }
    }
  }

  private startTranslate(ctx: ToolContext): void {
    this.state = 'translating';
    ctx.setCursor('move');

    // Store starting positions of all selected shapes
    this.dragStartPositions.clear();
    const shapes = ctx.getShapes();

    for (const id of ctx.getSelectedIds()) {
      const shape = shapes[id];
      if (shape) {
        this.dragStartPositions.set(id, { x: shape.x, y: shape.y });
      }
    }
  }

  private finishTranslate(ctx: ToolContext): void {
    // Shapes are already updated during drag
    // In the future, we might want to record this for undo/redo
    this.dragStartPositions.clear();

    // Update spatial index for moved shapes
    const selectedIds = ctx.getSelectedIds();
    const shapes = ctx.getShapes();
    for (const id of selectedIds) {
      const shape = shapes[id];
      if (shape) {
        ctx.spatialIndex.update(shape);
      }
    }
  }

  private startMarquee(): void {
    this.state = 'marquee';
    this.marqueeStart = this.pointerDownWorldPoint;
    this.marqueeEnd = this.pointerDownWorldPoint;
  }

  private finishMarquee(ctx: ToolContext): void {
    if (!this.marqueeStart || !this.marqueeEnd) return;

    // Create selection box
    const rect = new Box(
      Math.min(this.marqueeStart.x, this.marqueeEnd.x),
      Math.min(this.marqueeStart.y, this.marqueeEnd.y),
      Math.max(this.marqueeStart.x, this.marqueeEnd.x),
      Math.max(this.marqueeStart.y, this.marqueeEnd.y)
    );

    // Find shapes in the marquee
    const hitIds = ctx.hitTester.hitTestRectIds(
      rect,
      ctx.getShapes(),
      ctx.getShapeOrder()
    );

    // Select found shapes
    if (hitIds.length > 0) {
      ctx.select(hitIds);
    }

    this.marqueeStart = null;
    this.marqueeEnd = null;
  }

  private resetState(): void {
    this.state = 'idle';
    this.pointerDownPoint = null;
    this.pointerDownWorldPoint = null;
    this.hitShapeId = null;
    this.dragStartPositions.clear();
    this.marqueeStart = null;
    this.marqueeEnd = null;
    this.panHandler.reset();
  }
}
