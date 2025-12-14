import { create } from 'zustand';
import { useDocumentStore, DocumentSnapshot } from './documentStore';

/**
 * Maximum number of history entries to keep.
 */
const MAX_HISTORY_SIZE = 100;

/**
 * Minimum time between pushes in milliseconds for debouncing.
 */
const DEBOUNCE_TIME = 300;

/**
 * A snapshot of the document state at a point in time.
 */
export interface HistoryEntry {
  /** Document state snapshot */
  snapshot: DocumentSnapshot;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Optional description of the action */
  description?: string | undefined;
}

/**
 * History state for undo/redo functionality.
 */
export interface HistoryState {
  /** Past states (undo stack) */
  past: HistoryEntry[];
  /** Future states (redo stack) */
  future: HistoryEntry[];
  /** Whether history tracking is enabled */
  isTracking: boolean;
  /** Last push timestamp for debouncing */
  lastPushTime: number;
}

/**
 * History actions for undo/redo.
 */
export interface HistoryActions {
  /**
   * Push the current document state onto the history stack.
   * @param description Optional description of the change
   */
  push: (description?: string) => void;

  /**
   * Undo the last change.
   */
  undo: () => void;

  /**
   * Redo the last undone change.
   */
  redo: () => void;

  /**
   * Clear all history.
   */
  clear: () => void;

  /**
   * Enable or disable history tracking.
   */
  setTracking: (enabled: boolean) => void;

  /**
   * Check if undo is available.
   */
  canUndo: () => boolean;

  /**
   * Check if redo is available.
   */
  canRedo: () => boolean;

  /**
   * Get the number of undo steps available.
   */
  getUndoCount: () => number;

  /**
   * Get the number of redo steps available.
   */
  getRedoCount: () => number;
}

/**
 * Initial history state.
 */
const initialState: HistoryState = {
  past: [],
  future: [],
  isTracking: true,
  lastPushTime: 0,
};

/**
 * Create a snapshot of the current document state.
 */
function createSnapshot(): DocumentSnapshot {
  return useDocumentStore.getState().getSnapshot();
}

/**
 * Restore a snapshot to the document store.
 */
function restoreSnapshot(snapshot: DocumentSnapshot): void {
  useDocumentStore.getState().loadSnapshot(snapshot);
}

/**
 * History store for undo/redo functionality.
 *
 * The history system stores complete document snapshots for simplicity.
 * For large documents, structural sharing could be implemented later.
 *
 * Usage:
 * ```typescript
 * const { undo, redo, canUndo, canRedo } = useHistoryStore();
 *
 * // Push state before making changes
 * push('Move shapes');
 *
 * // Undo/Redo
 * if (canUndo()) undo();
 * if (canRedo()) redo();
 * ```
 */
export const useHistoryStore = create<HistoryState & HistoryActions>()((set, get) => ({
  // State
  ...initialState,

  // Actions
  push: (description?: string) => {
    const state = get();

    if (!state.isTracking) return;

    // Debounce rapid pushes
    const now = Date.now();
    if (now - state.lastPushTime < DEBOUNCE_TIME) {
      return;
    }

    const snapshot = createSnapshot();
    const entry: HistoryEntry = {
      snapshot,
      timestamp: now,
      description,
    };

    set((state) => {
      // Add to past, clear future (new branch)
      const newPast = [...state.past, entry];

      // Trim if exceeds max size
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }

      return {
        past: newPast,
        future: [],
        lastPushTime: now,
      };
    });
  },

  undo: () => {
    const state = get();

    if (state.past.length === 0) return;

    // Get the last entry from past
    const lastEntry = state.past[state.past.length - 1];
    if (!lastEntry) return;

    // Save current state to future before restoring
    const currentSnapshot = createSnapshot();
    const currentEntry: HistoryEntry = {
      snapshot: currentSnapshot,
      timestamp: Date.now(),
    };

    // Temporarily disable tracking while restoring
    set({ isTracking: false });

    // Restore the snapshot
    restoreSnapshot(lastEntry.snapshot);

    // Update history stacks
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [currentEntry, ...state.future],
      isTracking: true,
    }));
  },

  redo: () => {
    const state = get();

    if (state.future.length === 0) return;

    // Get the first entry from future
    const nextEntry = state.future[0];
    if (!nextEntry) return;

    // Save current state to past before restoring
    const currentSnapshot = createSnapshot();
    const currentEntry: HistoryEntry = {
      snapshot: currentSnapshot,
      timestamp: Date.now(),
    };

    // Temporarily disable tracking while restoring
    set({ isTracking: false });

    // Restore the snapshot
    restoreSnapshot(nextEntry.snapshot);

    // Update history stacks
    set((state) => ({
      past: [...state.past, currentEntry],
      future: state.future.slice(1),
      isTracking: true,
    }));
  },

  clear: () => {
    set({
      past: [],
      future: [],
      lastPushTime: 0,
    });
  },

  setTracking: (enabled: boolean) => {
    set({ isTracking: enabled });
  },

  canUndo: () => {
    return get().past.length > 0;
  },

  canRedo: () => {
    return get().future.length > 0;
  },

  getUndoCount: () => {
    return get().past.length;
  },

  getRedoCount: () => {
    return get().future.length;
  },
}));

/**
 * Push a history entry with automatic debouncing.
 * Convenience function for use in mutations.
 */
export function pushHistory(description?: string): void {
  useHistoryStore.getState().push(description);
}

/**
 * Perform an action with history tracking.
 * Pushes history before the action and optionally after if successful.
 */
export function withHistory<T>(
  action: () => T,
  description?: string
): T {
  pushHistory(description);
  return action();
}
