/**
 * CustomShapeTool - Tool for placing custom library shapes.
 *
 * This tool places a custom shape from the user's shape library
 * at the click position. It loads the serialized shape data,
 * deserializes it with new IDs, and adds it to the document.
 */

import { BaseTool, ToolContext } from './Tool';
import { NormalizedPointerEvent } from '../InputHandler';
import { ToolType } from '../../store/sessionStore';
import { useCustomShapeLibraryStore } from '../../store/customShapeLibraryStore';
import { deserializeShapes } from '../../utils/shapeSerializer';
import type { CustomShapeItem } from '../../storage/ShapeLibraryTypes';

/**
 * Tool for placing custom shapes from user libraries.
 *
 * Features:
 * - Click to place a custom shape at that position
 * - Supports both single shapes and groups
 * - Automatically selects created shapes and switches to Select tool
 * - Increments usage count for the shape item
 */
export class CustomShapeTool extends BaseTool {
  readonly type: ToolType;
  readonly name: string;

  private itemId: string;
  private item: CustomShapeItem | null = null;

  constructor(itemId: string, itemName: string) {
    super();
    this.itemId = itemId;
    this.type = `custom-shape:${itemId}`;
    this.name = itemName;
  }

  async loadItem(): Promise<CustomShapeItem | null> {
    if (this.item) return this.item;

    const store = useCustomShapeLibraryStore.getState();
    const data = await store.loadItemData(this.itemId);

    if (!data) return null;

    // Get the cached item from store
    this.item = store.itemsCache[this.itemId] || null;
    return this.item;
  }

  onActivate(ctx: ToolContext): void {
    ctx.setCursor('crosshair');
    // Pre-load the item data
    this.loadItem();
  }

  onDeactivate(ctx: ToolContext): void {
    ctx.setCursor('default');
    this.item = null;
  }

  async onPointerDown(event: NormalizedPointerEvent, ctx: ToolContext): Promise<void> {
    if (event.button !== 'left') return;

    // Load item if not already loaded
    const item = await this.loadItem();
    if (!item) {
      console.error('Failed to load custom shape item:', this.itemId);
      ctx.setActiveTool('select');
      return;
    }

    // Push history before creating shapes
    ctx.pushHistory(`Create ${item.name}`);

    // Deserialize shapes at click position
    const shapes = deserializeShapes(item.shapeData, event.worldPoint);

    if (shapes.length === 0) {
      console.error('No shapes deserialized from item:', this.itemId);
      ctx.setActiveTool('select');
      return;
    }

    // Add all shapes to document
    for (const shape of shapes) {
      ctx.addShape(shape);
      ctx.spatialIndex.insert(shape);
    }

    // Select the root shape (first one)
    const rootId = shapes[0]!.id;
    ctx.select([rootId]);

    // Increment usage count
    useCustomShapeLibraryStore.getState().incrementItemUsage(this.itemId);

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

  /**
   * Render a preview of the shape at the cursor position.
   */
  renderOverlay(_ctx2d: CanvasRenderingContext2D, _toolCtx: ToolContext): void {
    // For now, we don't render a preview
    // This could be enhanced to show the shape outline at the cursor
  }
}

/**
 * Create a custom shape tool for a specific item.
 */
export function createCustomShapeTool(item: CustomShapeItem): CustomShapeTool {
  return new CustomShapeTool(item.id, item.name);
}
