import RBush from 'rbush';
import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { Shape } from '../shapes/Shape';
import { shapeRegistry } from '../shapes/ShapeRegistry';

/**
 * Item stored in the R-tree spatial index.
 * Contains the shape's bounding box and ID for efficient lookup.
 */
export interface SpatialIndexItem {
  /** Minimum X coordinate of bounding box */
  minX: number;
  /** Minimum Y coordinate of bounding box */
  minY: number;
  /** Maximum X coordinate of bounding box */
  maxX: number;
  /** Maximum Y coordinate of bounding box */
  maxY: number;
  /** Shape ID for lookup */
  id: string;
}

/**
 * Spatial index for efficient shape queries using R-tree (RBush).
 *
 * Provides O(log n) point and rectangle queries for large shape collections.
 * The index stores bounding boxes, so queries return candidate shapes that
 * must be precisely hit-tested using shape handlers.
 *
 * Usage:
 * ```typescript
 * const index = new SpatialIndex();
 *
 * // Build from shapes
 * index.rebuild(shapes);
 *
 * // Query point (get candidates)
 * const candidates = index.queryPoint(new Vec2(100, 50));
 *
 * // Query rectangle
 * const inRect = index.queryRect(new Box(0, 0, 200, 200));
 *
 * // Update single shape
 * index.update(shape);
 *
 * // Remove shape
 * index.remove(shapeId);
 * ```
 */
export class SpatialIndex {
  private tree: RBush<SpatialIndexItem>;
  private itemsById: Map<string, SpatialIndexItem>;

  constructor() {
    this.tree = new RBush();
    this.itemsById = new Map();
  }

  /**
   * Rebuild the entire index from an array of shapes.
   * Use this when loading a document or after bulk changes.
   *
   * @param shapes - Array of shapes to index
   */
  rebuild(shapes: Shape[]): void {
    this.clear();

    const items: SpatialIndexItem[] = [];

    for (const shape of shapes) {
      const item = this.createItem(shape);
      if (item) {
        items.push(item);
        this.itemsById.set(shape.id, item);
      }
    }

    // Bulk load is more efficient than individual inserts
    this.tree.load(items);
  }

  /**
   * Insert a new shape into the index.
   *
   * @param shape - Shape to insert
   */
  insert(shape: Shape): void {
    // Remove existing entry if present
    if (this.itemsById.has(shape.id)) {
      this.remove(shape.id);
    }

    const item = this.createItem(shape);
    if (item) {
      this.tree.insert(item);
      this.itemsById.set(shape.id, item);
    }
  }

  /**
   * Update a shape's position in the index.
   * Call this when a shape's bounds change.
   *
   * @param shape - Shape with updated bounds
   */
  update(shape: Shape): void {
    // Remove old entry
    const oldItem = this.itemsById.get(shape.id);
    if (oldItem) {
      this.tree.remove(oldItem);
    }

    // Insert new entry
    const newItem = this.createItem(shape);
    if (newItem) {
      this.tree.insert(newItem);
      this.itemsById.set(shape.id, newItem);
    }
  }

  /**
   * Update multiple shapes in the index.
   *
   * @param shapes - Shapes with updated bounds
   */
  updateMany(shapes: Shape[]): void {
    for (const shape of shapes) {
      this.update(shape);
    }
  }

  /**
   * Remove a shape from the index.
   *
   * @param id - ID of shape to remove
   */
  remove(id: string): void {
    const item = this.itemsById.get(id);
    if (item) {
      this.tree.remove(item);
      this.itemsById.delete(id);
    }
  }

  /**
   * Remove multiple shapes from the index.
   *
   * @param ids - IDs of shapes to remove
   */
  removeMany(ids: string[]): void {
    for (const id of ids) {
      this.remove(id);
    }
  }

  /**
   * Query shapes whose bounding boxes contain a point.
   * Returns candidate shape IDs - use shape handlers for precise hit testing.
   *
   * @param point - Point in world coordinates
   * @returns Array of shape IDs whose bounds contain the point
   */
  queryPoint(point: Vec2): string[] {
    const results = this.tree.search({
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    });

    return results.map((item) => item.id);
  }

  /**
   * Query shapes whose bounding boxes intersect a rectangle.
   * Returns candidate shape IDs - may include shapes that don't
   * actually intersect the rectangle due to rotation.
   *
   * @param rect - Rectangle in world coordinates
   * @returns Array of shape IDs whose bounds intersect the rectangle
   */
  queryRect(rect: Box): string[] {
    const results = this.tree.search({
      minX: rect.minX,
      minY: rect.minY,
      maxX: rect.maxX,
      maxY: rect.maxY,
    });

    return results.map((item) => item.id);
  }

  /**
   * Get all shape IDs in the index.
   *
   * @returns Array of all indexed shape IDs
   */
  getAllIds(): string[] {
    return Array.from(this.itemsById.keys());
  }

  /**
   * Check if a shape is in the index.
   *
   * @param id - Shape ID to check
   * @returns true if the shape is indexed
   */
  has(id: string): boolean {
    return this.itemsById.has(id);
  }

  /**
   * Get the number of shapes in the index.
   */
  get size(): number {
    return this.itemsById.size;
  }

  /**
   * Clear the entire index.
   */
  clear(): void {
    this.tree.clear();
    this.itemsById.clear();
  }

  /**
   * Create an index item from a shape.
   * Uses the shape registry to get bounds.
   */
  private createItem(shape: Shape): SpatialIndexItem | null {
    try {
      const handler = shapeRegistry.getHandler(shape.type);
      const bounds = handler.getBounds(shape);

      return {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY,
        id: shape.id,
      };
    } catch {
      // Shape type not registered - skip
      console.warn(`Cannot index shape ${shape.id}: unknown type ${shape.type}`);
      return null;
    }
  }
}

/**
 * Create a spatial index and populate it from shapes.
 * Convenience factory function.
 */
export function createSpatialIndex(shapes: Shape[]): SpatialIndex {
  const index = new SpatialIndex();
  index.rebuild(shapes);
  return index;
}
