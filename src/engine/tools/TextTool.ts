import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { ToolType } from '../../store/sessionStore';
import { TextShape, DEFAULT_TEXT } from '../../shapes/Shape';
import { nanoid } from 'nanoid';

/**
 * Text tool for creating text shapes.
 *
 * Features:
 * - Click to create a text shape at that position
 * - Automatically selects created shape and switches to Select tool
 */
export class TextTool extends BaseTool {
  readonly type: ToolType = 'text';
  readonly name = 'Text';
  readonly shortcut = 't';

  onActivate(ctx: ToolContext): void {
    ctx.setCursor('text');
  }

  onDeactivate(ctx: ToolContext): void {
    ctx.setCursor('default');
  }

  onPointerDown(event: NormalizedPointerEvent, ctx: ToolContext): void {
    if (event.button !== 'left') return;

    // Push history before creating shape
    ctx.pushHistory('Create text');

    // Create the shape at click position
    const id = nanoid();
    const shape: TextShape = {
      id,
      type: 'text',
      x: event.worldPoint.x,
      y: event.worldPoint.y,
      text: 'Text',
      fontSize: DEFAULT_TEXT.fontSize,
      fontFamily: DEFAULT_TEXT.fontFamily,
      textAlign: DEFAULT_TEXT.textAlign,
      width: DEFAULT_TEXT.width,
      rotation: DEFAULT_TEXT.rotation,
      opacity: DEFAULT_TEXT.opacity,
      locked: DEFAULT_TEXT.locked,
      visible: DEFAULT_TEXT.visible,
      fill: '#000000',
      stroke: DEFAULT_TEXT.stroke,
      strokeWidth: DEFAULT_TEXT.strokeWidth,
    };

    // Add to document
    ctx.addShape(shape);

    // Update spatial index
    ctx.spatialIndex.insert(shape);

    // Select the new shape
    ctx.select([id]);

    // Switch to select tool
    ctx.setActiveTool('select');

    ctx.requestRender();
  }

  onKeyDown(event: KeyboardEvent, ctx: ToolContext): boolean {
    if (event.key === 'Escape') {
      ctx.setActiveTool('select');
      return true;
    }
    return false;
  }
}
