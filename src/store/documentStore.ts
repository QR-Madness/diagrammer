import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Shape } from '../shapes/Shape';

/**
 * Document state containing all shape data.
 * This is the single source of truth for document content.
 */
export interface DocumentState {
  /** Map of shape ID to shape data */
  shapes: Record<string, Shape>;
  /** Ordered list of shape IDs (determines z-order, first = bottom) */
  shapeOrder: string[];
}

/**
 * Actions for modifying document state.
 * All mutations are immutable via Immer.
 */
export interface DocumentActions {
  // CRUD operations
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;

  // Batch operations
  addShapes: (shapes: Shape[]) => void;
  updateShapes: (updates: Array<{ id: string; updates: Partial<Shape> }>) => void;
  deleteShapes: (ids: string[]) => void;

  // Z-order operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // Batch z-order
  bringToFrontMultiple: (ids: string[]) => void;
  sendToBackMultiple: (ids: string[]) => void;

  // Serialization
  getSnapshot: () => DocumentSnapshot;
  loadSnapshot: (snapshot: DocumentSnapshot) => void;

  // Utilities
  getShape: (id: string) => Shape | undefined;
  getShapesInOrder: () => Shape[];
  clear: () => void;
}

/**
 * Serializable document snapshot for persistence and undo/redo.
 */
export interface DocumentSnapshot {
  shapes: Record<string, Shape>;
  shapeOrder: string[];
  version: number;
}

/** Current snapshot version for migration support */
const SNAPSHOT_VERSION = 1;

/**
 * Initial empty document state.
 */
const initialState: DocumentState = {
  shapes: {},
  shapeOrder: [],
};

/**
 * Document store for managing shape data.
 *
 * Uses Zustand with Immer middleware for immutable updates.
 * Shape data is stored in a map for O(1) lookups, with a separate
 * array maintaining z-order.
 *
 * Usage:
 * ```typescript
 * const { shapes, addShape, updateShape } = useDocumentStore();
 *
 * // Add a shape
 * addShape(rectangleHandler.create(new Vec2(100, 100), nanoid()));
 *
 * // Update a shape
 * updateShape(shapeId, { fill: '#ff0000' });
 *
 * // Get shapes in z-order
 * const orderedShapes = useDocumentStore(state => state.getShapesInOrder());
 * ```
 */
export const useDocumentStore = create<DocumentState & DocumentActions>()(
  immer((set, get) => ({
    // State
    ...initialState,

    // CRUD operations
    addShape: (shape: Shape) => {
      set((state) => {
        if (state.shapes[shape.id]) {
          console.warn(`Shape with id ${shape.id} already exists`);
          return;
        }
        state.shapes[shape.id] = shape;
        state.shapeOrder.push(shape.id);
      });
    },

    updateShape: (id: string, updates: Partial<Shape>) => {
      set((state) => {
        const shape = state.shapes[id];
        if (!shape) {
          console.warn(`Shape with id ${id} not found`);
          return;
        }
        // Merge updates into shape
        Object.assign(shape, updates);
      });
    },

    deleteShape: (id: string) => {
      set((state) => {
        if (!state.shapes[id]) {
          return;
        }
        delete state.shapes[id];
        const index = state.shapeOrder.indexOf(id);
        if (index !== -1) {
          state.shapeOrder.splice(index, 1);
        }
      });
    },

    // Batch operations
    addShapes: (shapes: Shape[]) => {
      set((state) => {
        for (const shape of shapes) {
          if (!state.shapes[shape.id]) {
            state.shapes[shape.id] = shape;
            state.shapeOrder.push(shape.id);
          }
        }
      });
    },

    updateShapes: (updates: Array<{ id: string; updates: Partial<Shape> }>) => {
      set((state) => {
        for (const { id, updates: shapeUpdates } of updates) {
          const shape = state.shapes[id];
          if (shape) {
            Object.assign(shape, shapeUpdates);
          }
        }
      });
    },

    deleteShapes: (ids: string[]) => {
      set((state) => {
        for (const id of ids) {
          if (state.shapes[id]) {
            delete state.shapes[id];
          }
        }
        // Filter out deleted shapes from order
        state.shapeOrder = state.shapeOrder.filter((id) => state.shapes[id]);
      });
    },

    // Z-order operations
    bringToFront: (id: string) => {
      set((state) => {
        const index = state.shapeOrder.indexOf(id);
        if (index === -1 || index === state.shapeOrder.length - 1) {
          return;
        }
        state.shapeOrder.splice(index, 1);
        state.shapeOrder.push(id);
      });
    },

    sendToBack: (id: string) => {
      set((state) => {
        const index = state.shapeOrder.indexOf(id);
        if (index === -1 || index === 0) {
          return;
        }
        state.shapeOrder.splice(index, 1);
        state.shapeOrder.unshift(id);
      });
    },

    bringForward: (id: string) => {
      set((state) => {
        const index = state.shapeOrder.indexOf(id);
        if (index === -1 || index === state.shapeOrder.length - 1) {
          return;
        }
        // Swap with next element
        const temp = state.shapeOrder[index + 1];
        if (temp !== undefined) {
          state.shapeOrder[index + 1] = id;
          state.shapeOrder[index] = temp;
        }
      });
    },

    sendBackward: (id: string) => {
      set((state) => {
        const index = state.shapeOrder.indexOf(id);
        if (index === -1 || index === 0) {
          return;
        }
        // Swap with previous element
        const temp = state.shapeOrder[index - 1];
        if (temp !== undefined) {
          state.shapeOrder[index - 1] = id;
          state.shapeOrder[index] = temp;
        }
      });
    },

    // Batch z-order
    bringToFrontMultiple: (ids: string[]) => {
      set((state) => {
        // Remove all specified ids from their current positions
        const idsSet = new Set(ids);
        const remaining = state.shapeOrder.filter((id) => !idsSet.has(id));
        const toMove = state.shapeOrder.filter((id) => idsSet.has(id));
        // Append in their original relative order
        state.shapeOrder = [...remaining, ...toMove];
      });
    },

    sendToBackMultiple: (ids: string[]) => {
      set((state) => {
        // Remove all specified ids from their current positions
        const idsSet = new Set(ids);
        const remaining = state.shapeOrder.filter((id) => !idsSet.has(id));
        const toMove = state.shapeOrder.filter((id) => idsSet.has(id));
        // Prepend in their original relative order
        state.shapeOrder = [...toMove, ...remaining];
      });
    },

    // Serialization
    getSnapshot: (): DocumentSnapshot => {
      const state = get();
      return {
        shapes: JSON.parse(JSON.stringify(state.shapes)),
        shapeOrder: [...state.shapeOrder],
        version: SNAPSHOT_VERSION,
      };
    },

    loadSnapshot: (snapshot: DocumentSnapshot) => {
      set((state) => {
        // Clear existing data
        state.shapes = {};
        state.shapeOrder = [];

        // Load snapshot data
        if (snapshot.shapes) {
          state.shapes = JSON.parse(JSON.stringify(snapshot.shapes));
        }
        if (snapshot.shapeOrder) {
          // Filter out any orphaned IDs
          state.shapeOrder = snapshot.shapeOrder.filter((id) => state.shapes[id]);
        }
      });
    },

    // Utilities
    getShape: (id: string): Shape | undefined => {
      return get().shapes[id];
    },

    getShapesInOrder: (): Shape[] => {
      const state = get();
      return state.shapeOrder
        .map((id) => state.shapes[id])
        .filter((shape): shape is Shape => shape !== undefined);
    },

    clear: () => {
      set((state) => {
        state.shapes = {};
        state.shapeOrder = [];
      });
    },
  }))
);

/**
 * Get shapes by their IDs.
 * Utility function for external use.
 */
export function getShapesByIds(ids: string[]): Shape[] {
  const state = useDocumentStore.getState();
  return ids
    .map((id) => state.shapes[id])
    .filter((shape): shape is Shape => shape !== undefined);
}

/**
 * Check if a shape exists.
 */
export function shapeExists(id: string): boolean {
  return useDocumentStore.getState().shapes[id] !== undefined;
}
