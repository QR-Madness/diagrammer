import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { ShapeHandler, shapeRegistry } from './ShapeRegistry';
import { GroupShape, Handle, DEFAULT_GROUP, Shape } from './Shape';
import { useDocumentStore } from '../store/documentStore';

/**
 * Get all shapes from the document store.
 * Used to resolve child shapes for bounds and hit testing.
 */
function getShapes(): Record<string, Shape> {
  return useDocumentStore.getState().shapes;
}

/**
 * Recursively get bounds for a shape, handling groups.
 */
function getShapeBounds(shape: Shape): Box {
  const handler = shapeRegistry.getHandler(shape.type);
  return handler.getBounds(shape);
}

/**
 * Group shape handler implementation.
 * Groups are containers that hold other shapes. They don't render themselves,
 * but delegate to their children for hit testing and bounds calculation.
 */
export const groupHandler: ShapeHandler<GroupShape> = {
  /**
   * Groups don't render themselves - children are rendered separately by the Renderer.
   * This method is intentionally empty.
   */
  render(_ctx: CanvasRenderingContext2D, _shape: GroupShape): void {
    // Groups have no visual representation
    // Children are rendered by the Renderer when iterating through group.childIds
  },

  /**
   * Hit test by delegating to children.
   * Returns true if any child shape is hit.
   */
  hitTest(shape: GroupShape, worldPoint: Vec2): boolean {
    const shapes = getShapes();

    for (const childId of shape.childIds) {
      const child = shapes[childId];
      if (!child || !child.visible) continue;

      const handler = shapeRegistry.getHandler(child.type);
      if (handler.hitTest(child, worldPoint)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get the combined bounding box of all children.
   */
  getBounds(shape: GroupShape): Box {
    const shapes = getShapes();
    let combined: Box | null = null;

    for (const childId of shape.childIds) {
      const child = shapes[childId];
      if (!child) continue;

      const childBounds = getShapeBounds(child);
      combined = combined ? combined.union(childBounds) : childBounds;
    }

    // If no children or all children removed, return a point at group position
    return combined ?? new Box(shape.x, shape.y, shape.x, shape.y);
  },

  /**
   * Groups don't have handles for now (move-only, no resize/rotation).
   * Returns an empty array.
   */
  getHandles(_shape: GroupShape): Handle[] {
    // No handles for groups - they can only be moved
    return [];
  },

  /**
   * Create a new group shape.
   * Note: childIds should be set after creation when grouping shapes.
   */
  create(position: Vec2, id: string): GroupShape {
    return {
      id,
      type: 'group',
      x: position.x,
      y: position.y,
      rotation: DEFAULT_GROUP.rotation,
      opacity: DEFAULT_GROUP.opacity,
      locked: DEFAULT_GROUP.locked,
      visible: DEFAULT_GROUP.visible,
      fill: DEFAULT_GROUP.fill,
      stroke: DEFAULT_GROUP.stroke,
      strokeWidth: DEFAULT_GROUP.strokeWidth,
      childIds: [],
    };
  },
};

// Register the group handler
shapeRegistry.register('group', groupHandler);
