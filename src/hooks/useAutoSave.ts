/**
 * Auto-save hook for automatic document persistence.
 *
 * Subscribes to store changes and saves after a debounce period.
 * Also flushes pending saves on page unload.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { usePageStore } from '../store/pageStore';
import { usePersistenceStore, AUTO_SAVE_DEBOUNCE } from '../store/persistenceStore';
import { useRichTextStore } from '../store/richTextStore';

/**
 * Auto-save status for UI feedback.
 */
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Hook options.
 */
export interface UseAutoSaveOptions {
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Debounce time in ms (default: AUTO_SAVE_DEBOUNCE) */
  debounceMs?: number;
  /** Callback when save completes */
  onSave?: () => void;
  /** Callback when save fails */
  onError?: (error: Error) => void;
}

/**
 * Hook return value.
 */
export interface UseAutoSaveResult {
  /** Current auto-save status */
  status: AutoSaveStatus;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Last saved timestamp */
  lastSavedAt: number | null;
  /** Manually trigger a save */
  saveNow: () => void;
}

/**
 * Hook for automatic document saving.
 *
 * Usage:
 * ```typescript
 * const { status, isDirty, lastSavedAt, saveNow } = useAutoSave();
 *
 * // Show save indicator
 * {status === 'saving' && <span>Saving...</span>}
 * {status === 'saved' && <span>Saved</span>}
 * ```
 */
export function useAutoSave(options: UseAutoSaveOptions = {}): UseAutoSaveResult {
  const { enabled = true, debounceMs = AUTO_SAVE_DEBOUNCE, onSave, onError } = options;

  const statusRef = useRef<AutoSaveStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);

  // Get store state
  const autoSaveEnabled = usePersistenceStore((state) => state.autoSaveEnabled);
  const isDirty = usePersistenceStore((state) => state.isDirty);
  const lastSavedAt = usePersistenceStore((state) => state.lastSavedAt);
  const currentDocumentId = usePersistenceStore((state) => state.currentDocumentId);

  // Perform the actual save
  const performSave = useCallback(() => {
    if (!enabled || !autoSaveEnabled) return;

    try {
      statusRef.current = 'saving';
      usePersistenceStore.getState().saveDocument();

      // Clear rich text store dirty flag after successful save
      useRichTextStore.getState().clearDirty();

      statusRef.current = 'saved';
      onSave?.();

      // Reset to idle after a short delay
      setTimeout(() => {
        statusRef.current = 'idle';
      }, 2000);
    } catch (error) {
      statusRef.current = 'error';
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }

    pendingSaveRef.current = false;
  }, [enabled, autoSaveEnabled, onSave, onError]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (!enabled || !autoSaveEnabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    statusRef.current = 'pending';
    pendingSaveRef.current = true;

    // Schedule save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [enabled, autoSaveEnabled, debounceMs, performSave]);

  // Manual save function
  const saveNow = useCallback(() => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    performSave();
  }, [performSave]);

  // Subscribe to document store changes
  useEffect(() => {
    if (!enabled || !autoSaveEnabled) return;

    const unsubscribe = useDocumentStore.subscribe(() => {
      // Mark as dirty and trigger debounced save
      usePersistenceStore.getState().markDirty();
      debouncedSave();
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, autoSaveEnabled, debouncedSave]);

  // Subscribe to page store changes (page name changes, reordering, etc.)
  useEffect(() => {
    if (!enabled || !autoSaveEnabled) return;

    const unsubscribe = usePageStore.subscribe((state, prevState) => {
      // Only trigger save for meaningful changes
      const pagesChanged = state.pages !== prevState.pages;
      const orderChanged = state.pageOrder !== prevState.pageOrder;

      if (pagesChanged || orderChanged) {
        usePersistenceStore.getState().markDirty();
        debouncedSave();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, autoSaveEnabled, debouncedSave]);

  // Subscribe to rich text store changes
  useEffect(() => {
    if (!enabled || !autoSaveEnabled) return;

    const unsubscribe = useRichTextStore.subscribe((state, prevState) => {
      // Only trigger save when content changes (isDirty becomes true)
      if (state.isDirty && !prevState.isDirty) {
        usePersistenceStore.getState().markDirty();
        debouncedSave();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, autoSaveEnabled, debouncedSave]);

  // Flush pending saves on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If there's a pending save, perform it immediately
      if (pendingSaveRef.current || isDirty) {
        // Clear debounce timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Perform synchronous save
        try {
          usePersistenceStore.getState().saveDocument();
        } catch (error) {
          console.error('Failed to save on unload:', error);
        }
      }

      // If still dirty, warn the user
      if (usePersistenceStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save when document ID changes (e.g., after "Save As")
  useEffect(() => {
    // Reset status when document changes
    statusRef.current = 'idle';
  }, [currentDocumentId]);

  return {
    status: statusRef.current,
    isDirty,
    lastSavedAt,
    saveNow,
  };
}

/**
 * Format a timestamp for display.
 */
export function formatLastSaved(timestamp: number | null): string {
  if (!timestamp) return 'Never saved';

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  // Format as date
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}
