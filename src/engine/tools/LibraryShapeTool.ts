/**
 * LibraryShapeTool - Generic tool for creating library shapes.
 *
 * This tool is parameterized with a LibraryShapeDefinition and can create
 * any library shape type (diamond, terminator, hexagon, etc.) using the
 * same drag-to-create pattern as RectangleTool.
 */

import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';
import { LibraryShape, DEFAULT_LIBRARY_SHAPE } from '../../shapes/Shape';
import type { LibraryShapeDefinition } from '../../shapes/library/ShapeLibraryTypes';
import { nanoid } from 'nanoid';

/**
 * State machine states for the LibraryShapeTool.
 */
type LibraryShapeState = 'idle' | 'drawing';

/**
 * Minimum size in world units to create a shape.
 */
const MIN_SIZE = 5;

/**
 * Generic tool for creating library shapes.
 *
 * Features:
 * - Click and drag to create the shape
 * - Preview shape path while drawing
 * - Hold Shift to constrain to square aspect ratio
 * - Escape to cancel creation
 * - Automatically selects created shape and switches to Select tool
 */
export class LibraryShapeTool extends BaseTool {
  readonly type: ToolType;
  readonly name: string;
  // Note: Library shapes don't have keyboard shortcuts by default
  // as there are too many shapes to assign unique shortcuts

  private definition: LibraryShapeDefinition;
  private state: LibraryShapeState = 'idle';
  private startPoint: Vec2 | null = null;
  private currentPoint: Vec2 | null = null;
  private isShiftHeld = false;

  constructor(definition: LibraryShapeDefinition) {
    super();
    this.definition = definition;
    this.type = definition.type;
    this.name = definition.metadata.name;
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

    // Calculate shape dimensions
    const rect = this.calculateDimensions();

    if (rect && rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
      // Push history before creating shape
      ctx.pushHistory(`Create ${this.definition.metadata.name.toLowerCase()}`);

      // Create the shape
      const id = nanoid();
      const shape: LibraryShape = {
        id,
        type: this.definition.type,
        x: rect.centerX,
        y: rect.centerY,
        width: rect.width,
        height: rect.height,
        rotation: DEFAULT_LIBRARY_SHAPE.rotation,
        opacity: DEFAULT_LIBRARY_SHAPE.opacity,
        locked: DEFAULT_LIBRARY_SHAPE.locked,
        visible: DEFAULT_LIBRARY_SHAPE.visible,
        fill: DEFAULT_LIBRARY_SHAPE.fill,
        stroke: DEFAULT_LIBRARY_SHAPE.stroke,
        strokeWidth: DEFAULT_LIBRARY_SHAPE.strokeWidth,
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
      return false;
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

    const rect = this.calculateDimensions();
    if (!rect) return;

    const camera = toolCtx.camera;

    // Convert world center to screen coordinates
    const screenCenter = camera.worldToScreen(new Vec2(rect.centerX, rect.centerY));

    // Scale dimensions to screen space
    const screenWidth = rect.width * camera.zoom;
    const screenHeight = rect.height * camera.zoom;

    ctx2d.save();

    // Translate to screen center position
    ctx2d.translate(screenCenter.x, screenCenter.y);

    // Build the path at screen scale
    // Note: We scale the path dimensions, not the canvas
    const path = this.definition.pathBuilder(screenWidth, screenHeight);

    // Draw preview shape
    ctx2d.fillStyle = 'rgba(74, 144, 217, 0.3)'; // Semi-transparent blue
    ctx2d.fill(path);

    ctx2d.strokeStyle = '#4a90d9';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([]);
    ctx2d.stroke(path);

    ctx2d.restore();
  }

  /**
   * Calculate the shape dimensions from start and current points.
   * Applies aspect ratio constraint if shift is held, or if shape has locked aspect ratio.
   */
  private calculateDimensions(): {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  } | null {
    if (!this.startPoint || !this.currentPoint) return null;

    let width = Math.abs(this.currentPoint.x - this.startPoint.x);
    let height = Math.abs(this.currentPoint.y - this.startPoint.y);

    // Constrain to square if shift is held or shape has locked aspect ratio
    if (this.isShiftHeld || this.definition.metadata.aspectRatioLocked) {
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

  private resetState(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.isShiftHeld = false;
  }
}
