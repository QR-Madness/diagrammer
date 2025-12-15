import { create } from 'zustand';
import { useDocumentStore } from './documentStore';

/**
 * Available tool types.
 */
export type ToolType = 'select' | 'pan' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'connector';

/**
 * Camera state representing the viewport.
 */
export interface CameraState {
  /** X position in world coordinates */
  x: number;
  /** Y position in world coordinates */
  y: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
}

/**
 * Cursor style options.
 */
export type CursorStyle =
  | 'default'
  | 'pointer'
  | 'grab'
  | 'grabbing'
  | 'crosshair'
  | 'move'
  | 'text'
  | 'not-allowed'
  | 'nwse-resize'
  | 'nesw-resize'
  | 'ns-resize'
  | 'ew-resize';

/**
 * Session state for ephemeral UI state.
 * This is NOT persisted - it's reset on page reload.
 */
export interface SessionState {
  /** Currently selected shape IDs */
  selectedIds: Set<string>;
  /** Camera/viewport state */
  camera: CameraState;
  /** Currently active tool */
  activeTool: ToolType;
  /** Current cursor style */
  cursor: CursorStyle;
  /** Whether the user is currently interacting (dragging, etc.) */
  isInteracting: boolean;
  /** ID of shape being hovered over (for highlighting) */
  hoveredId: string | null;
  /** ID of text shape currently being edited (null if not editing) */
  editingTextId: string | null;
}

/**
 * Actions for modifying session state.
 */
export interface SessionActions {
  // Selection
  select: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  removeFromSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Camera
  setCamera: (camera: Partial<CameraState>) => void;
  resetCamera: () => void;

  // Tool
  setActiveTool: (tool: ToolType) => void;

  // Cursor
  setCursor: (cursor: CursorStyle) => void;

  // Interaction state
  setIsInteracting: (isInteracting: boolean) => void;

  // Hover
  setHoveredId: (id: string | null) => void;

  // Text editing
  startTextEdit: (id: string) => void;
  stopTextEdit: () => void;
  isEditingText: () => boolean;

  // Utilities
  isSelected: (id: string) => boolean;
  getSelectedIds: () => string[];
  hasSelection: () => boolean;
  reset: () => void;
}

/**
 * Default camera state.
 */
const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

/**
 * Initial session state.
 */
const initialState: SessionState = {
  selectedIds: new Set(),
  camera: { ...DEFAULT_CAMERA },
  activeTool: 'select',
  cursor: 'default',
  isInteracting: false,
  hoveredId: null,
  editingTextId: null,
};

/**
 * Session store for ephemeral UI state.
 *
 * Manages selection, camera state, active tool, cursor, and interaction state.
 * This state is NOT persisted - it's reset on page reload.
 *
 * Usage:
 * ```typescript
 * const { selectedIds, select, activeTool } = useSessionStore();
 *
 * // Select shapes
 * select(['shape1', 'shape2']);
 *
 * // Check selection
 * const isSelected = useSessionStore(state => state.isSelected('shape1'));
 *
 * // Change tool
 * setActiveTool('rectangle');
 * ```
 */
export const useSessionStore = create<SessionState & SessionActions>()((set, get) => ({
  // State
  ...initialState,

  // Selection actions
  select: (ids: string[]) => {
    set({ selectedIds: new Set(ids) });
  },

  addToSelection: (ids: string[]) => {
    set((state) => {
      const newSet = new Set(state.selectedIds);
      for (const id of ids) {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    });
  },

  removeFromSelection: (ids: string[]) => {
    set((state) => {
      const newSet = new Set(state.selectedIds);
      for (const id of ids) {
        newSet.delete(id);
      }
      return { selectedIds: newSet };
    });
  },

  toggleSelection: (id: string) => {
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  selectAll: () => {
    const documentState = useDocumentStore.getState();
    set({ selectedIds: new Set(documentState.shapeOrder) });
  },

  // Camera actions
  setCamera: (camera: Partial<CameraState>) => {
    set((state) => ({
      camera: { ...state.camera, ...camera },
    }));
  },

  resetCamera: () => {
    set({ camera: { ...DEFAULT_CAMERA } });
  },

  // Tool actions
  setActiveTool: (tool: ToolType) => {
    set({ activeTool: tool });
  },

  // Cursor actions
  setCursor: (cursor: CursorStyle) => {
    set({ cursor });
  },

  // Interaction state
  setIsInteracting: (isInteracting: boolean) => {
    set({ isInteracting });
  },

  // Hover
  setHoveredId: (id: string | null) => {
    set({ hoveredId: id });
  },

  // Text editing
  startTextEdit: (id: string) => {
    set({ editingTextId: id });
  },

  stopTextEdit: () => {
    set({ editingTextId: null });
  },

  isEditingText: (): boolean => {
    return get().editingTextId !== null;
  },

  // Utilities
  isSelected: (id: string): boolean => {
    return get().selectedIds.has(id);
  },

  getSelectedIds: (): string[] => {
    return Array.from(get().selectedIds);
  },

  hasSelection: (): boolean => {
    return get().selectedIds.size > 0;
  },

  reset: () => {
    set({ ...initialState, selectedIds: new Set() });
  },
}));

/**
 * Get the selected shapes from the document store.
 * Utility for getting actual shape data for selected IDs.
 */
export function getSelectedShapes() {
  const selectedIds = useSessionStore.getState().getSelectedIds();
  const documentState = useDocumentStore.getState();
  return selectedIds
    .map((id) => documentState.shapes[id])
    .filter((shape) => shape !== undefined);
}

/**
 * Check if there's a single shape selected.
 */
export function hasSingleSelection(): boolean {
  return useSessionStore.getState().selectedIds.size === 1;
}

/**
 * Check if there are multiple shapes selected.
 */
export function hasMultipleSelection(): boolean {
  return useSessionStore.getState().selectedIds.size > 1;
}

/**
 * Delete selected shapes from the document.
 * Clears selection after deletion.
 */
export function deleteSelected(): void {
  const selectedIds = useSessionStore.getState().getSelectedIds();
  if (selectedIds.length > 0) {
    useDocumentStore.getState().deleteShapes(selectedIds);
    useSessionStore.getState().clearSelection();
  }
}
