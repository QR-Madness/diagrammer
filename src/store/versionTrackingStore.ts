/**
 * Version Tracking Store
 *
 * Zustand store that bridges version conflict detection with the UI.
 * Monitors the current document for external changes and exposes
 * conflict state for the VersionConflictDialog and DocumentChangedBanner.
 *
 * Phase 16 - Document Version Tracking UI
 */

import { create } from 'zustand';
import type { VersionConflict, ConflictResolution } from '../types/VersionConflict';
import {
  isVersionStale,
  setDocumentVersion,
  getDocumentVersion,
  initializeVersion,
  confirmSave,
  clearDocumentVersion,
} from '../types/VersionConflict';

// ============ Types ============

interface VersionTrackingState {
  /** Currently active conflict (null if none) */
  activeConflict: VersionConflict | null;
  /** Whether an external change banner should be shown */
  externalChangeDetected: boolean;
  /** Server version that triggered the external change banner */
  externalChangeVersion: number | null;
}

interface VersionTrackingActions {
  /**
   * Report a version conflict for UI handling.
   * Opens the VersionConflictDialog.
   */
  reportConflict: (conflict: VersionConflict) => void;

  /**
   * Resolve the active conflict with a chosen resolution.
   */
  resolveConflict: (resolution: ConflictResolution) => void;

  /**
   * Dismiss the active conflict without resolving.
   */
  dismissConflict: () => void;

  /**
   * Report that the current document was changed externally.
   * Shows the DocumentChangedBanner.
   */
  reportExternalChange: (documentId: string, newServerVersion: number) => void;

  /**
   * Dismiss the external change notification.
   */
  dismissExternalChange: () => void;

  /**
   * Initialize version tracking for a document on load.
   */
  trackDocument: (documentId: string, version: number, etag?: string) => void;

  /**
   * Stop tracking a document (on close or delete).
   */
  untrackDocument: (documentId: string) => void;

  /**
   * Confirm a successful save.
   */
  confirmDocumentSave: (documentId: string, newVersion: number, etag?: string) => void;

  /**
   * Check if a document has a stale version.
   */
  isStale: (documentId: string, serverVersion: number) => boolean;

  /** Reset state */
  reset: () => void;
}

// ============ Store ============

const initialState: VersionTrackingState = {
  activeConflict: null,
  externalChangeDetected: false,
  externalChangeVersion: null,
};

export const useVersionTrackingStore = create<VersionTrackingState & VersionTrackingActions>()(
  (set, get) => ({
    ...initialState,

    reportConflict: (conflict: VersionConflict) => {
      set({ activeConflict: conflict });
    },

    resolveConflict: (_resolution: ConflictResolution) => {
      set({ activeConflict: null });
      // Resolution handling is done by the caller — the store just manages UI state.
      // The persistence layer calls this after performing the actual resolution.
    },

    dismissConflict: () => {
      set({ activeConflict: null });
    },

    reportExternalChange: (documentId: string, newServerVersion: number) => {
      // Update the internal version store
      const current = getDocumentVersion(documentId);
      if (current) {
        setDocumentVersion(documentId, {
          ...current,
          serverVersion: newServerVersion,
        });
      }

      set({
        externalChangeDetected: true,
        externalChangeVersion: newServerVersion,
      });
    },

    dismissExternalChange: () => {
      set({
        externalChangeDetected: false,
        externalChangeVersion: null,
      });
    },

    trackDocument: (documentId: string, version: number, etag?: string) => {
      initializeVersion(documentId, version, etag);
    },

    untrackDocument: (documentId: string) => {
      clearDocumentVersion(documentId);
      // Clear UI state if this was the document being tracked
      const state = get();
      if (state.activeConflict?.documentId === documentId) {
        set({ activeConflict: null });
      }
    },

    confirmDocumentSave: (documentId: string, newVersion: number, etag?: string) => {
      confirmSave(documentId, newVersion, etag);
    },

    isStale: (documentId: string, serverVersion: number) => {
      return isVersionStale(documentId, serverVersion);
    },

    reset: () => {
      set(initialState);
    },
  })
);
