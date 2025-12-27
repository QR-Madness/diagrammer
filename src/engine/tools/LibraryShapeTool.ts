/**
 * LibraryShapeTool - Generic tool for creating library shapes.
 *
 * This tool extends DragToCreateTool and is parameterized with a
 * LibraryShapeDefinition to create any library shape type (diamond,
 * terminator, hexagon, etc.).
 */

import { ToolContext } from './Tool';
import { DragToCreateTool, DragRect } from './DragToCreateTool';
import { Vec2 } from '../../math/Vec2';
import { ToolType } from '../../store/sessionStore';
import { LibraryShape, Shape, DEFAULT_LIBRARY_SHAPE } from '../../shapes/Shape';
import type { LibraryShapeDefinition } from '../../shapes/library/ShapeLibraryTypes';

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
export class LibraryShapeTool extends DragToCreateTool {
  readonly type: ToolType;
  readonly name: string;
  // Note: Library shapes don't have keyboard shortcuts by default
  // as there are too many shapes to assign unique shortcuts

  private definition: LibraryShapeDefinition;

  constructor(definition: LibraryShapeDefinition) {
    super();
    this.definition = definition;
    this.type = definition.type;
    this.name = definition.metadata.name;
  }

  /**
   * Create a LibraryShape from the drag rectangle.
   */
  protected createShape(rect: DragRect, id: string): Shape {
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
    return shape;
  }

  /**
   * Render the path-based shape preview.
   */
  protected renderPreview(
    ctx2d: CanvasRenderingContext2D,
    toolCtx: ToolContext,
    rect: DragRect
  ): void {
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
    const path = this.definition.pathBuilder(screenWidth, screenHeight);

    // Draw preview shape
    ctx2d.fillStyle = 'rgba(74, 144, 217, 0.3)';
    ctx2d.fill(path);

    ctx2d.strokeStyle = '#4a90d9';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([]);
    ctx2d.stroke(path);

    ctx2d.restore();
  }

  /**
   * Override calculateRect to support aspectRatioLocked from metadata.
   */
  protected calculateRect(): DragRect | null {
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
}
