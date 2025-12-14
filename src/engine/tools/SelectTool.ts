import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { Box } from '../../math/Box';
import { ToolType, CursorStyle } from '../../store/sessionStore';
import { MiddleClickPanHandler } from './PanTool';
import { Handle, HandleType, Shape, isRectangle, isEllipse, isLine, isText } from '../../shapes/Shape';

/**
 * State machine states for the SelectTool.
 */
type SelectState =
  | 'idle'
  | 'pending' // Pointer down, waiting to see if drag or click
  | 'translating' // Dragging selected shapes
  | 'marquee' // Dragging a marquee selection box
  | 'resizing' // Dragging a resize handle
  | 'rotating'; // Dragging the rotation handle

/**
 * Threshold in pixels before a click becomes a drag.
 */
const DRAG_THRESHOLD = 3;

/**
 * Maximum time between clicks for a double-click (ms).
 */
const DOUBLE_CLICK_THRESHOLD = 500;

/**
 * Maximum distance between clicks for a double-click (pixels).
 */
const DOUBLE_CLICK_DISTANCE = 10;

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

  // For resizing shapes
  private activeHandle: Handle | null = null;
  private resizeShapeId: string | null = null;
  private resizeOriginalShape: Shape | null = null;
  private resizeAnchorPoint: Vec2 | null = null;
  private isShiftHeld = false;

  // For rotating shapes
  private rotateShapeId: string | null = null;
  private rotateOriginalRotation: number = 0;
  private rotateStartAngle: number = 0;
  private rotateShapeCenter: Vec2 | null = null;

  // Middle-click pan support
  private panHandler = new MiddleClickPanHandler();

  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickPoint: Vec2 | null = null;
  private lastClickShapeId: string | null = null;

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
    this.isShiftHeld = event.modifiers.shift;

    // First, check if we clicked on a resize handle of a selected shape
    const selectedShapes = ctx.getSelectedShapes();
    if (selectedShapes.length === 1) {
      // Only show handles for single selection
      const handleSize = 10 / ctx.camera.zoom; // Handle size in world units
      const handleResult = ctx.hitTester.hitTestHandles(
        event.worldPoint,
        selectedShapes,
        handleSize
      );

      if (handleResult.handle && handleResult.shape) {
        if (handleResult.handle.type === 'rotation') {
          // Clicked on rotation handle - start rotating
          this.rotateShapeId = handleResult.shapeId;
          this.rotateOriginalRotation = handleResult.shape.rotation;
          this.rotateShapeCenter = new Vec2(handleResult.shape.x, handleResult.shape.y);

          // Calculate starting angle from shape center to click point
          const dx = event.worldPoint.x - handleResult.shape.x;
          const dy = event.worldPoint.y - handleResult.shape.y;
          this.rotateStartAngle = Math.atan2(dy, dx);

          this.state = 'rotating';
          ctx.setCursor('grabbing');
          ctx.setIsInteracting(true);
          ctx.pushHistory('Rotate shape');
          ctx.requestRender();
          return;
        }

        // Clicked on a resize handle - start resizing
        this.activeHandle = handleResult.handle;
        this.resizeShapeId = handleResult.shapeId;
        this.resizeOriginalShape = { ...handleResult.shape };
        this.resizeAnchorPoint = this.getAnchorPoint(handleResult.shape, handleResult.handle.type);
        this.state = 'resizing';
        ctx.setCursor(handleResult.handle.cursor as CursorStyle);
        ctx.setIsInteracting(true);
        ctx.pushHistory('Resize shape');
        ctx.requestRender();
        return;
      }
    }

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

    this.isShiftHeld = event.modifiers.shift;

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

      case 'resizing':
        this.handleResizingMove(event, ctx);
        break;

      case 'rotating':
        this.handleRotatingMove(event, ctx);
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

      case 'resizing':
        this.finishResize(ctx);
        break;

      case 'rotating':
        this.finishRotate(ctx);
        break;
    }

    this.resetState();
    ctx.setIsInteracting(false);
    ctx.setCursor('default');
    ctx.requestRender();
  }

  onKeyDown(event: KeyboardEvent, ctx: ToolContext): boolean {
    // Track Shift key for aspect ratio constraint during resize
    if (event.key === 'Shift') {
      this.isShiftHeld = true;
      if (this.state === 'resizing') {
        ctx.requestRender();
      }
      return false; // Let other handlers see this
    }

    // Delete or Backspace to delete selected shapes
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedIds = ctx.getSelectedIds();
      if (selectedIds.length > 0) {
        ctx.pushHistory('Delete shapes');
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

  onKeyUp(event: KeyboardEvent, ctx: ToolContext): boolean {
    if (event.key === 'Shift') {
      this.isShiftHeld = false;
      if (this.state === 'resizing') {
        ctx.requestRender();
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
    // First check for handle hover on selected shapes
    const selectedShapes = ctx.getSelectedShapes();
    if (selectedShapes.length === 1) {
      const handleSize = 10 / ctx.camera.zoom;
      const handleResult = ctx.hitTester.hitTestHandles(
        event.worldPoint,
        selectedShapes,
        handleSize
      );

      if (handleResult.handle) {
        ctx.setCursor(handleResult.handle.cursor as CursorStyle);
        return;
      }
    }

    // Update hover state and cursor for shapes
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
    const now = Date.now();

    // Check for double-click on text shape
    if (this.hitShapeId) {
      const shape = ctx.getShapes()[this.hitShapeId];

      // Check if this is a double-click on the same text shape
      const isDoubleClick =
        shape &&
        isText(shape) &&
        this.lastClickShapeId === this.hitShapeId &&
        this.lastClickPoint !== null &&
        now - this.lastClickTime < DOUBLE_CLICK_THRESHOLD;

      if (isDoubleClick && this.lastClickPoint) {
        // Calculate distance between clicks
        const dx = event.screenPoint.x - this.lastClickPoint.x;
        const dy = event.screenPoint.y - this.lastClickPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < DOUBLE_CLICK_DISTANCE) {
          // Double-click on text shape - start editing
          ctx.startTextEdit(this.hitShapeId);
          this.resetClickTracking();
          ctx.requestRender();
          return;
        }
      }

      // Track this click for double-click detection
      // Clone the point to avoid reference issues
      this.lastClickTime = now;
      this.lastClickPoint = new Vec2(event.screenPoint.x, event.screenPoint.y);
      this.lastClickShapeId = this.hitShapeId;

      // Clicked on a shape
      if (!event.modifiers.shift) {
        // Without shift, select only this shape (might already be selected)
        ctx.select([this.hitShapeId]);
      }
      // With shift, toggle already happened in onPointerDown
    } else {
      // Clicked on empty space
      this.resetClickTracking();
      if (!event.modifiers.shift) {
        ctx.clearSelection();
      }
    }
  }

  private resetClickTracking(): void {
    this.lastClickTime = 0;
    this.lastClickPoint = null;
    this.lastClickShapeId = null;
  }

  private startTranslate(ctx: ToolContext): void {
    this.state = 'translating';
    ctx.setCursor('move');

    // Push history before moving shapes
    ctx.pushHistory('Move shapes');

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
    this.activeHandle = null;
    this.resizeShapeId = null;
    this.resizeOriginalShape = null;
    this.resizeAnchorPoint = null;
    this.isShiftHeld = false;
    this.rotateShapeId = null;
    this.rotateOriginalRotation = 0;
    this.rotateStartAngle = 0;
    this.rotateShapeCenter = null;
    this.panHandler.reset();
    // Note: Don't reset click tracking here, it persists across interactions
  }

  /**
   * Handle mouse move during rotation operation.
   */
  private handleRotatingMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (!this.rotateShapeId || !this.rotateShapeCenter) {
      return;
    }

    // Calculate current angle from shape center to mouse
    const dx = event.worldPoint.x - this.rotateShapeCenter.x;
    const dy = event.worldPoint.y - this.rotateShapeCenter.y;
    const currentAngle = Math.atan2(dy, dx);

    // Calculate rotation delta
    let deltaAngle = currentAngle - this.rotateStartAngle;

    // Snap to 15-degree increments if Shift is held
    if (this.isShiftHeld) {
      const snapAngle = Math.PI / 12; // 15 degrees
      const newRotation = this.rotateOriginalRotation + deltaAngle;
      const snappedRotation = Math.round(newRotation / snapAngle) * snapAngle;
      deltaAngle = snappedRotation - this.rotateOriginalRotation;
    }

    const newRotation = this.rotateOriginalRotation + deltaAngle;

    ctx.updateShape(this.rotateShapeId, { rotation: newRotation });
    ctx.requestRender();
  }

  /**
   * Finish rotation operation and update spatial index.
   */
  private finishRotate(ctx: ToolContext): void {
    if (this.rotateShapeId) {
      const shape = ctx.getShapes()[this.rotateShapeId];
      if (shape) {
        ctx.spatialIndex.update(shape);
      }
    }
  }

  /**
   * Handle mouse move during resize operation.
   */
  private handleResizingMove(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (!this.activeHandle || !this.resizeShapeId || !this.resizeOriginalShape || !this.resizeAnchorPoint) {
      return;
    }

    const original = this.resizeOriginalShape;
    const handleType = this.activeHandle.type;
    const currentPoint = event.worldPoint;

    // Calculate new shape properties based on handle type and original shape
    const updates = this.calculateResize(
      original,
      handleType,
      currentPoint,
      this.resizeAnchorPoint,
      this.isShiftHeld
    );

    if (updates) {
      ctx.updateShape(this.resizeShapeId, updates);
      ctx.requestRender();
    }
  }

  /**
   * Finish resize operation and update spatial index.
   */
  private finishResize(ctx: ToolContext): void {
    if (this.resizeShapeId) {
      const shape = ctx.getShapes()[this.resizeShapeId];
      if (shape) {
        ctx.spatialIndex.update(shape);
      }
    }
  }

  /**
   * Get the anchor point (opposite corner/edge) for a resize handle.
   */
  private getAnchorPoint(shape: Shape, handleType: HandleType): Vec2 {
    if (isRectangle(shape)) {
      const halfWidth = shape.width / 2;
      const halfHeight = shape.height / 2;

      // Get the opposite corner/edge point
      const anchorOffsets: Record<HandleType, { x: number; y: number }> = {
        'top-left': { x: halfWidth, y: halfHeight },
        'top': { x: 0, y: halfHeight },
        'top-right': { x: -halfWidth, y: halfHeight },
        'right': { x: -halfWidth, y: 0 },
        'bottom-right': { x: -halfWidth, y: -halfHeight },
        'bottom': { x: 0, y: -halfHeight },
        'bottom-left': { x: halfWidth, y: -halfHeight },
        'left': { x: halfWidth, y: 0 },
        'rotation': { x: 0, y: 0 },
      };

      const offset = anchorOffsets[handleType];
      // Apply rotation to the offset
      const rotatedOffset = new Vec2(offset.x, offset.y).rotate(shape.rotation);
      return new Vec2(shape.x + rotatedOffset.x, shape.y + rotatedOffset.y);
    }

    if (isEllipse(shape)) {
      // For ellipse, use the opposite point on the ellipse
      const anchorOffsets: Record<HandleType, { x: number; y: number }> = {
        'top-left': { x: shape.radiusX, y: shape.radiusY },
        'top': { x: 0, y: shape.radiusY },
        'top-right': { x: -shape.radiusX, y: shape.radiusY },
        'right': { x: -shape.radiusX, y: 0 },
        'bottom-right': { x: -shape.radiusX, y: -shape.radiusY },
        'bottom': { x: 0, y: -shape.radiusY },
        'bottom-left': { x: shape.radiusX, y: -shape.radiusY },
        'left': { x: shape.radiusX, y: 0 },
        'rotation': { x: 0, y: 0 },
      };

      const offset = anchorOffsets[handleType];
      const rotatedOffset = new Vec2(offset.x, offset.y).rotate(shape.rotation);
      return new Vec2(shape.x + rotatedOffset.x, shape.y + rotatedOffset.y);
    }

    if (isLine(shape)) {
      // For lines, anchor is the other endpoint
      if (handleType === 'top-left' || handleType === 'left' || handleType === 'bottom-left') {
        return new Vec2(shape.x2, shape.y2);
      } else {
        return new Vec2(shape.x, shape.y);
      }
    }

    if (isText(shape)) {
      // For text, estimate height based on content (simplified)
      const lineHeight = shape.fontSize * 1.4;
      const lines = shape.text.split('\n').length;
      const height = Math.max(lines * lineHeight, lineHeight);
      const halfWidth = shape.width / 2;
      const halfHeight = height / 2;

      const anchorOffsets: Record<HandleType, { x: number; y: number }> = {
        'top-left': { x: halfWidth, y: halfHeight },
        'top': { x: 0, y: halfHeight },
        'top-right': { x: -halfWidth, y: halfHeight },
        'right': { x: -halfWidth, y: 0 },
        'bottom-right': { x: -halfWidth, y: -halfHeight },
        'bottom': { x: 0, y: -halfHeight },
        'bottom-left': { x: halfWidth, y: -halfHeight },
        'left': { x: halfWidth, y: 0 },
        'rotation': { x: 0, y: 0 },
      };

      const offset = anchorOffsets[handleType];
      const rotatedOffset = new Vec2(offset.x, offset.y).rotate(shape.rotation);
      return new Vec2(shape.x + rotatedOffset.x, shape.y + rotatedOffset.y);
    }

    // Default fallback for any other shape types
    return new Vec2((shape as { x: number }).x, (shape as { y: number }).y);
  }

  /**
   * Calculate new shape properties based on resize operation.
   */
  private calculateResize(
    original: Shape,
    handleType: HandleType,
    currentPoint: Vec2,
    anchor: Vec2,
    maintainAspectRatio: boolean
  ): Partial<Shape> | null {
    if (isRectangle(original)) {
      return this.calculateRectangleResize(original, handleType, currentPoint, anchor, maintainAspectRatio);
    }

    if (isEllipse(original)) {
      return this.calculateEllipseResize(original, handleType, currentPoint, anchor, maintainAspectRatio);
    }

    if (isLine(original)) {
      return this.calculateLineResize(original, handleType, currentPoint);
    }

    if (isText(original)) {
      return this.calculateTextResize(original, handleType, currentPoint, anchor);
    }

    return null;
  }

  /**
   * Calculate rectangle resize.
   */
  private calculateRectangleResize(
    original: Shape,
    handleType: HandleType,
    currentPoint: Vec2,
    anchor: Vec2,
    maintainAspectRatio: boolean
  ): Partial<Shape> {
    if (!isRectangle(original)) return {};

    // Transform current point to local space (un-rotate around original center)
    const toLocal = (p: Vec2): Vec2 => {
      const translated = Vec2.subtract(p, new Vec2(original.x, original.y));
      return translated.rotate(-original.rotation);
    };

    const localAnchor = toLocal(anchor);
    const localCurrent = toLocal(currentPoint);

    // Calculate new dimensions based on handle type
    let newWidth = original.width;
    let newHeight = original.height;
    let newCenterX = 0;
    let newCenterY = 0;

    const isCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handleType);
    const isHorizontal = ['left', 'right'].includes(handleType);
    const isVertical = ['top', 'bottom'].includes(handleType);

    if (isCorner) {
      // Corner resize: both dimensions change
      newWidth = Math.abs(localCurrent.x - localAnchor.x);
      newHeight = Math.abs(localCurrent.y - localAnchor.y);
      newCenterX = (localCurrent.x + localAnchor.x) / 2;
      newCenterY = (localCurrent.y + localAnchor.y) / 2;

      if (maintainAspectRatio && original.width > 0 && original.height > 0) {
        const aspectRatio = original.width / original.height;
        const currentRatio = newWidth / newHeight;

        if (currentRatio > aspectRatio) {
          newWidth = newHeight * aspectRatio;
        } else {
          newHeight = newWidth / aspectRatio;
        }

        // Adjust center based on which corner
        if (handleType === 'top-left') {
          newCenterX = localAnchor.x - newWidth / 2;
          newCenterY = localAnchor.y - newHeight / 2;
        } else if (handleType === 'top-right') {
          newCenterX = localAnchor.x + newWidth / 2;
          newCenterY = localAnchor.y - newHeight / 2;
        } else if (handleType === 'bottom-left') {
          newCenterX = localAnchor.x - newWidth / 2;
          newCenterY = localAnchor.y + newHeight / 2;
        } else {
          newCenterX = localAnchor.x + newWidth / 2;
          newCenterY = localAnchor.y + newHeight / 2;
        }
      }
    } else if (isHorizontal) {
      // Horizontal resize: only width changes
      newWidth = Math.abs(localCurrent.x - localAnchor.x);
      newCenterX = (localCurrent.x + localAnchor.x) / 2;
      newCenterY = 0;

      if (maintainAspectRatio && original.width > 0) {
        const aspectRatio = original.width / original.height;
        newHeight = newWidth / aspectRatio;
      }
    } else if (isVertical) {
      // Vertical resize: only height changes
      newHeight = Math.abs(localCurrent.y - localAnchor.y);
      newCenterX = 0;
      newCenterY = (localCurrent.y + localAnchor.y) / 2;

      if (maintainAspectRatio && original.height > 0) {
        const aspectRatio = original.width / original.height;
        newWidth = newHeight * aspectRatio;
      }
    }

    // Enforce minimum size
    const minSize = 5;
    newWidth = Math.max(newWidth, minSize);
    newHeight = Math.max(newHeight, minSize);

    // Transform new center back to world space
    const worldCenter = new Vec2(newCenterX, newCenterY).rotate(original.rotation);

    return {
      x: original.x + worldCenter.x,
      y: original.y + worldCenter.y,
      width: newWidth,
      height: newHeight,
    };
  }

  /**
   * Calculate ellipse resize.
   */
  private calculateEllipseResize(
    original: Shape,
    handleType: HandleType,
    currentPoint: Vec2,
    anchor: Vec2,
    maintainAspectRatio: boolean
  ): Partial<Shape> {
    if (!isEllipse(original)) return {};

    // Transform current point to local space
    const toLocal = (p: Vec2): Vec2 => {
      const translated = Vec2.subtract(p, new Vec2(original.x, original.y));
      return translated.rotate(-original.rotation);
    };

    const localAnchor = toLocal(anchor);
    const localCurrent = toLocal(currentPoint);

    let newRadiusX = original.radiusX;
    let newRadiusY = original.radiusY;
    let newCenterX = 0;
    let newCenterY = 0;

    const isCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handleType);
    const isHorizontal = ['left', 'right'].includes(handleType);
    const isVertical = ['top', 'bottom'].includes(handleType);

    if (isCorner) {
      // Corner resize: both radii change
      newRadiusX = Math.abs(localCurrent.x - localAnchor.x) / 2;
      newRadiusY = Math.abs(localCurrent.y - localAnchor.y) / 2;
      newCenterX = (localCurrent.x + localAnchor.x) / 2;
      newCenterY = (localCurrent.y + localAnchor.y) / 2;

      if (maintainAspectRatio && original.radiusX > 0 && original.radiusY > 0) {
        const aspectRatio = original.radiusX / original.radiusY;
        const currentRatio = newRadiusX / newRadiusY;

        if (currentRatio > aspectRatio) {
          newRadiusX = newRadiusY * aspectRatio;
        } else {
          newRadiusY = newRadiusX / aspectRatio;
        }

        // Adjust center based on which corner
        if (handleType === 'top-left') {
          newCenterX = localAnchor.x - newRadiusX;
          newCenterY = localAnchor.y - newRadiusY;
        } else if (handleType === 'top-right') {
          newCenterX = localAnchor.x + newRadiusX;
          newCenterY = localAnchor.y - newRadiusY;
        } else if (handleType === 'bottom-left') {
          newCenterX = localAnchor.x - newRadiusX;
          newCenterY = localAnchor.y + newRadiusY;
        } else {
          newCenterX = localAnchor.x + newRadiusX;
          newCenterY = localAnchor.y + newRadiusY;
        }
      }
    } else if (isHorizontal) {
      newRadiusX = Math.abs(localCurrent.x - localAnchor.x) / 2;
      newCenterX = (localCurrent.x + localAnchor.x) / 2;
      newCenterY = 0;

      if (maintainAspectRatio && original.radiusX > 0) {
        const aspectRatio = original.radiusX / original.radiusY;
        newRadiusY = newRadiusX / aspectRatio;
      }
    } else if (isVertical) {
      newRadiusY = Math.abs(localCurrent.y - localAnchor.y) / 2;
      newCenterX = 0;
      newCenterY = (localCurrent.y + localAnchor.y) / 2;

      if (maintainAspectRatio && original.radiusY > 0) {
        const aspectRatio = original.radiusX / original.radiusY;
        newRadiusX = newRadiusY * aspectRatio;
      }
    }

    // Enforce minimum size
    const minRadius = 5;
    newRadiusX = Math.max(newRadiusX, minRadius);
    newRadiusY = Math.max(newRadiusY, minRadius);

    // Transform new center back to world space
    const worldCenter = new Vec2(newCenterX, newCenterY).rotate(original.rotation);

    return {
      x: original.x + worldCenter.x,
      y: original.y + worldCenter.y,
      radiusX: newRadiusX,
      radiusY: newRadiusY,
    };
  }

  /**
   * Calculate line resize (moving endpoints).
   */
  private calculateLineResize(
    original: Shape,
    handleType: HandleType,
    currentPoint: Vec2
  ): Partial<Shape> {
    if (!isLine(original)) return {};

    // For lines, we move the endpoint that corresponds to the handle
    // Left-side handles move the start point, right-side handles move the end point
    if (handleType === 'top-left' || handleType === 'left' || handleType === 'bottom-left') {
      return {
        x: currentPoint.x,
        y: currentPoint.y,
      };
    } else {
      return {
        x2: currentPoint.x,
        y2: currentPoint.y,
      };
    }
  }

  /**
   * Calculate text resize (adjust width, font size scales with vertical resize).
   */
  private calculateTextResize(
    original: Shape,
    handleType: HandleType,
    currentPoint: Vec2,
    anchor: Vec2
  ): Partial<Shape> {
    if (!isText(original)) return {};

    // Transform current point to local space
    const toLocal = (p: Vec2): Vec2 => {
      const translated = Vec2.subtract(p, new Vec2(original.x, original.y));
      return translated.rotate(-original.rotation);
    };

    const localAnchor = toLocal(anchor);
    const localCurrent = toLocal(currentPoint);

    // Calculate new width based on horizontal handles
    let newWidth = original.width;
    let newCenterX = 0;

    const isHorizontal = ['left', 'right'].includes(handleType);
    const isCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handleType);

    if (isHorizontal || isCorner) {
      newWidth = Math.abs(localCurrent.x - localAnchor.x);
      newCenterX = (localCurrent.x + localAnchor.x) / 2;
    }

    // Enforce minimum width
    const minWidth = 20;
    newWidth = Math.max(newWidth, minWidth);

    // Transform new center back to world space
    const worldCenter = new Vec2(newCenterX, 0).rotate(original.rotation);

    return {
      x: original.x + worldCenter.x,
      width: newWidth,
    };
  }
}
