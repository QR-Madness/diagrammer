/**
 * Utilities for serializing and deserializing shapes for custom libraries.
 *
 * Handles:
 * - Deep cloning shapes with all properties
 * - Collecting child shapes for groups (recursive)
 * - Calculating combined bounds
 * - Generating preview thumbnails
 * - Deserializing with new IDs and position offsets
 */

import { nanoid } from 'nanoid';
import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { Shape, isGroup, GroupShape } from '../shapes/Shape';
import { shapeRegistry } from '../shapes/ShapeRegistry';
import type { SerializedShapeData } from '../storage/ShapeLibraryTypes';

/**
 * Deep clone a shape object.
 */
function cloneShape<T extends Shape>(shape: T): T {
  return JSON.parse(JSON.stringify(shape));
}

/**
 * Recursively collect all child shapes for a group.
 * Returns a flattened array of all descendant shapes.
 */
function collectChildShapes(
  groupShape: GroupShape,
  allShapes: Record<string, Shape>
): Shape[] {
  const children: Shape[] = [];

  for (const childId of groupShape.childIds) {
    const child = allShapes[childId];
    if (!child) continue;

    children.push(cloneShape(child));

    // Recursively collect nested groups
    if (isGroup(child)) {
      children.push(...collectChildShapes(child, allShapes));
    }
  }

  return children;
}

/**
 * Calculate the combined bounding box for multiple shapes.
 */
function calculateCombinedBounds(shapes: Shape[]): Box {
  if (shapes.length === 0) {
    return new Box(0, 0, 100, 100);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    try {
      const handler = shapeRegistry.getHandler(shape.type);
      const bounds = handler.getBounds(shape);

      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    } catch {
      // Skip shapes without handlers
    }
  }

  if (!isFinite(minX)) {
    return new Box(0, 0, 100, 100);
  }

  return new Box(minX, minY, maxX, maxY);
}

/**
 * Serialize shapes for storage in a custom library.
 *
 * For single shapes: just clones the shape
 * For groups: collects all child shapes recursively
 * For multiple shapes: creates a virtual group
 *
 * @param selectedIds - IDs of shapes to serialize
 * @param allShapes - Map of all shapes in the document
 * @returns Serialized shape data ready for storage
 */
export function serializeShapes(
  selectedIds: string[],
  allShapes: Record<string, Shape>
): SerializedShapeData | null {
  if (selectedIds.length === 0) return null;

  // Collect selected shapes
  const selectedShapes = selectedIds
    .map((id) => allShapes[id])
    .filter((s): s is Shape => s !== undefined);

  if (selectedShapes.length === 0) return null;

  // Single shape case
  if (selectedShapes.length === 1) {
    const shape = selectedShapes[0]!;
    const rootShape = cloneShape(shape);
    let childShapes: Shape[] = [];

    // If it's a group, collect children
    if (isGroup(shape)) {
      childShapes = collectChildShapes(shape, allShapes);
    }

    // Calculate bounds - for groups, include all children
    const shapesForBounds: Shape[] = isGroup(shape) ? [shape, ...childShapes] : [shape];
    const bounds = calculateCombinedBounds(shapesForBounds);

    return {
      rootShape,
      childShapes,
      originalBounds: {
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.width,
        height: bounds.height,
      },
    };
  }

  // Multiple shapes: create a virtual group
  const rootGroup: GroupShape = {
    id: nanoid(),
    type: 'group',
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: null,
    stroke: null,
    strokeWidth: 0,
    childIds: selectedIds.slice(),
  };

  // Collect all shapes (including nested children)
  const childShapes: Shape[] = [];
  for (const shape of selectedShapes) {
    childShapes.push(cloneShape(shape));
    if (isGroup(shape)) {
      childShapes.push(...collectChildShapes(shape, allShapes));
    }
  }

  // Calculate combined bounds
  const bounds = calculateCombinedBounds(selectedShapes);

  // Update group position to center of bounds
  rootGroup.x = bounds.minX + bounds.width / 2;
  rootGroup.y = bounds.minY + bounds.height / 2;

  return {
    rootShape: rootGroup,
    childShapes,
    originalBounds: {
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
    },
  };
}

/**
 * Deserialize shapes from storage, assigning new IDs and positioning.
 *
 * @param data - Serialized shape data
 * @param targetPosition - World position to place the shapes at (center)
 * @returns Array of shapes ready to add to document
 */
export function deserializeShapes(
  data: SerializedShapeData,
  targetPosition: Vec2
): Shape[] {
  // Create ID mapping for remapping references
  const idMap = new Map<string, string>();

  // Clone root shape with new ID
  const newRootId = nanoid();
  idMap.set(data.rootShape.id, newRootId);

  // Clone child shapes with new IDs
  const newChildShapes: Shape[] = data.childShapes.map((child) => {
    const newId = nanoid();
    idMap.set(child.id, newId);
    return { ...cloneShape(child), id: newId };
  });

  // Clone root shape
  const newRootShape = { ...cloneShape(data.rootShape), id: newRootId };

  // Calculate offset from original bounds center to target position
  const originalCenter = new Vec2(
    data.originalBounds.x + data.originalBounds.width / 2,
    data.originalBounds.y + data.originalBounds.height / 2
  );
  const offset = Vec2.subtract(targetPosition, originalCenter);

  // Apply offset to root shape
  newRootShape.x += offset.x;
  newRootShape.y += offset.y;

  // Apply offset to child shapes
  for (const child of newChildShapes) {
    child.x += offset.x;
    child.y += offset.y;
  }

  // Remap childIds in groups
  if (isGroup(newRootShape)) {
    newRootShape.childIds = newRootShape.childIds.map(
      (id) => idMap.get(id) || id
    );
  }

  // Remap childIds in nested groups
  for (const child of newChildShapes) {
    if (isGroup(child)) {
      child.childIds = child.childIds.map((id) => idMap.get(id) || id);
    }
  }

  // Remap connector references
  for (const shape of [newRootShape, ...newChildShapes]) {
    if ('startShapeId' in shape && shape.startShapeId) {
      (shape as { startShapeId: string | null }).startShapeId =
        idMap.get(shape.startShapeId as string) || null;
    }
    if ('endShapeId' in shape && shape.endShapeId) {
      (shape as { endShapeId: string | null }).endShapeId =
        idMap.get(shape.endShapeId as string) || null;
    }
  }

  // Return all shapes (root first, then children)
  return [newRootShape, ...newChildShapes];
}

/**
 * Generate a thumbnail image for shapes.
 *
 * @param shapes - Shapes to render
 * @param allShapes - Map of all shapes (for group children)
 * @param size - Thumbnail size in pixels (square)
 * @returns Base64 data URL of the thumbnail
 */
export function generateThumbnail(
  shapes: Shape[],
  allShapes: Record<string, Shape>,
  size: number = 64
): string {
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(dpr, dpr);

  // Clear with transparent background
  ctx.clearRect(0, 0, size, size);

  // Collect all shapes including children
  const allShapesToRender: Shape[] = [];
  for (const shape of shapes) {
    allShapesToRender.push(shape);
    if (isGroup(shape)) {
      const children = collectChildShapesForRender(shape, allShapes);
      allShapesToRender.push(...children);
    }
  }

  if (allShapesToRender.length === 0) return '';

  // Calculate bounds
  const bounds = calculateCombinedBounds(allShapesToRender);

  // Calculate scale to fit in canvas with padding
  const padding = 4;
  const availableSize = size - padding * 2;
  const scaleX = availableSize / bounds.width;
  const scaleY = availableSize / bounds.height;
  const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x to avoid too large

  // Calculate offset to center
  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;
  const offsetX = (size - scaledWidth) / 2;
  const offsetY = (size - scaledHeight) / 2;

  // Apply transform
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-bounds.minX, -bounds.minY);

  // Render shapes (simplified - just fills and strokes)
  for (const shape of allShapesToRender) {
    if (isGroup(shape)) continue; // Groups don't render themselves

    try {
      const handler = shapeRegistry.getHandler(shape.type);
      handler.render(ctx, shape);
    } catch {
      // Skip shapes without handlers
    }
  }

  // Return as data URL
  return canvas.toDataURL('image/png');
}

/**
 * Collect child shapes for rendering (using actual shape references).
 */
function collectChildShapesForRender(
  groupShape: GroupShape,
  allShapes: Record<string, Shape>
): Shape[] {
  const children: Shape[] = [];

  for (const childId of groupShape.childIds) {
    const child = allShapes[childId];
    if (!child) continue;

    children.push(child);

    if (isGroup(child)) {
      children.push(...collectChildShapesForRender(child, allShapes));
    }
  }

  return children;
}

/**
 * Check if serialized data represents a group.
 */
export function isSerializedGroup(data: SerializedShapeData): boolean {
  return isGroup(data.rootShape as GroupShape);
}

/**
 * Get shape type from serialized data.
 */
export function getSerializedShapeType(
  data: SerializedShapeData
): 'single' | 'group' {
  return data.childShapes.length > 0 || isGroup(data.rootShape as GroupShape)
    ? 'group'
    : 'single';
}
