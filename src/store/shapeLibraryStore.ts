/**
 * Shape library store for managing shape library registration.
 *
 * This store handles:
 * - Registering shape definitions with the ShapeRegistry
 * - Tracking registered categories
 * - Providing shape metadata for UI components
 */

import { create } from 'zustand';
import { shapeRegistry } from '../shapes/ShapeRegistry';
import { createLibraryShapeHandler } from '../shapes/library/LibraryShapeHandler';
import { flowchartShapes } from '../shapes/library/flowchartShapes';
import { umlUseCaseShapes } from '../shapes/library/umlUseCaseShapes';
import type { LibraryShapeDefinition } from '../shapes/library/ShapeLibraryTypes';
import type { ShapeMetadata, ShapeLibraryCategory } from '../shapes/ShapeMetadata';

/**
 * Shape library state.
 */
export interface ShapeLibraryState {
  /** Whether the library has been initialized */
  isInitialized: boolean;
  /** Registered library categories */
  registeredCategories: ShapeLibraryCategory[];
  /** Registered shape definitions (for tool creation) */
  registeredDefinitions: LibraryShapeDefinition[];
}

/**
 * Shape library actions.
 */
export interface ShapeLibraryActions {
  /** Initialize the library by registering all shapes */
  initialize: () => void;
  /** Register a single shape definition */
  registerShape: (definition: LibraryShapeDefinition) => void;
  /** Register multiple shape definitions */
  registerShapes: (definitions: LibraryShapeDefinition[]) => void;
  /** Get all library shapes (excluding basic/core shapes) */
  getAllLibraryShapes: () => ShapeMetadata[];
  /** Get shapes by category */
  getShapesByCategory: (category: ShapeLibraryCategory) => ShapeMetadata[];
  /** Get a specific shape definition by type */
  getShapeDefinition: (type: string) => LibraryShapeDefinition | undefined;
  /** Check if a shape type is a library shape */
  isLibraryShape: (type: string) => boolean;
}

/**
 * Initial state.
 */
const initialState: ShapeLibraryState = {
  isInitialized: false,
  registeredCategories: [],
  registeredDefinitions: [],
};

/**
 * Shape library store.
 *
 * Usage:
 * ```typescript
 * const { initialize, getAllLibraryShapes } = useShapeLibraryStore();
 *
 * // Initialize on app startup
 * initialize();
 *
 * // Get shapes for ShapePicker UI
 * const shapes = getAllLibraryShapes();
 * ```
 */
export const useShapeLibraryStore = create<ShapeLibraryState & ShapeLibraryActions>()(
  (set, get) => ({
    ...initialState,

    initialize: () => {
      if (get().isInitialized) return;

      // Register all flowchart shapes
      get().registerShapes(flowchartShapes);

      // Register UML use-case shapes
      get().registerShapes(umlUseCaseShapes);

      set({ isInitialized: true });
    },

    registerShape: (definition) => {
      // Skip if already registered
      if (shapeRegistry.hasHandler(definition.type)) {
        return;
      }

      // Create and register handler
      const handler = createLibraryShapeHandler(definition);
      shapeRegistry.register(definition.type, handler, definition.metadata);

      // Update state
      set((state) => {
        const newCategories = state.registeredCategories.includes(definition.metadata.category)
          ? state.registeredCategories
          : [...state.registeredCategories, definition.metadata.category];

        return {
          registeredCategories: newCategories,
          registeredDefinitions: [...state.registeredDefinitions, definition],
        };
      });
    },

    registerShapes: (definitions) => {
      for (const definition of definitions) {
        get().registerShape(definition);
      }
    },

    getAllLibraryShapes: () => {
      // Get all metadata, filter out basic shapes
      return shapeRegistry.getAllMetadata().filter(
        (m) => m.category !== 'basic'
      );
    },

    getShapesByCategory: (category) => {
      return shapeRegistry.getMetadataByCategory(category);
    },

    getShapeDefinition: (type) => {
      return get().registeredDefinitions.find((d) => d.type === type);
    },

    isLibraryShape: (type) => {
      return get().registeredDefinitions.some((d) => d.type === type);
    },
  })
);

/**
 * Initialize the shape library.
 * Should be called once on application startup.
 */
export function initializeShapeLibrary(): void {
  useShapeLibraryStore.getState().initialize();
}

/**
 * Get all library shape definitions.
 * Useful for creating tools.
 */
export function getLibraryShapeDefinitions(): LibraryShapeDefinition[] {
  return useShapeLibraryStore.getState().registeredDefinitions;
}
