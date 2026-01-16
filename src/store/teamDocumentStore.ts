/**
 * Team Document Store
 *
 * Manages team documents fetched from the host server.
 * Works alongside persistenceStore which handles local documents.
 *
 * Team documents are stored on the host and synced to clients.
 * This store maintains the client-side view of team documents.
 */

import { create } from 'zustand';
import type { DocumentMetadata, DiagramDocument } from '../types/Document';
import type { DocEvent } from '../collaboration/protocol';
import { DocumentSyncProvider } from '../collaboration/DocumentSyncProvider';

/** Team document store state */
interface TeamDocumentState {
  /** Team documents from host (metadata only until loaded) */
  teamDocuments: Record<string, DocumentMetadata>;

  /** Currently loading document IDs */
  loadingDocs: Set<string>;

  /** Cached full documents (for quick switching) */
  documentCache: Record<string, DiagramDocument>;

  /** Connection status to host */
  hostConnected: boolean;

  /** Whether authenticated with host */
  authenticated: boolean;

  /** Last sync timestamp */
  lastSyncAt: number | null;

  /** Error state */
  error: string | null;

  /** Loading state for document list */
  isLoadingList: boolean;
}

/** Team document store actions */
interface TeamDocumentActions {
  /** Set the document sync provider */
  setProvider: (provider: DocumentSyncProvider | null) => void;

  /** Fetch document list from host */
  fetchDocumentList: () => Promise<void>;

  /** Load a team document's content */
  loadTeamDocument: (docId: string) => Promise<DiagramDocument>;

  /** Save a document to host as team document */
  saveToHost: (doc: DiagramDocument) => Promise<void>;

  /** Delete a team document from host */
  deleteFromHost: (docId: string) => Promise<void>;

  /** Handle document events from host */
  handleDocumentEvent: (event: DocEvent) => void;

  /** Set host connection status */
  setHostConnected: (connected: boolean) => void;

  /** Set authenticated status */
  setAuthenticated: (authenticated: boolean) => void;

  /** Clear team documents (on disconnect) */
  clearTeamDocuments: () => void;

  /** Set error state */
  setError: (error: string | null) => void;

  /** Check if a document is a team document */
  isTeamDocument: (docId: string) => boolean;

  /** Get metadata for a team document */
  getMetadata: (docId: string) => DocumentMetadata | undefined;

  /** Get cached document content */
  getCachedDocument: (docId: string) => DiagramDocument | undefined;
}

/** Document sync provider instance (module-level singleton) */
let docSyncProvider: DocumentSyncProvider | null = null;

/** Create the team document store */
export const useTeamDocumentStore = create<TeamDocumentState & TeamDocumentActions>(
  (set, get) => ({
    // Initial state
    teamDocuments: {},
    loadingDocs: new Set(),
    documentCache: {},
    hostConnected: false,
    authenticated: false,
    lastSyncAt: null,
    error: null,
    isLoadingList: false,

    // Actions
    setProvider: (provider) => {
      docSyncProvider = provider;

      if (provider) {
        // Subscribe to document events
        provider.onDocumentEvent((event) => {
          get().handleDocumentEvent(event);
        });
      }
    },

    fetchDocumentList: async () => {
      if (!docSyncProvider) {
        set({ error: 'Not connected to host' });
        return;
      }

      set({ isLoadingList: true, error: null });

      try {
        const documents = await docSyncProvider.listDocuments();

        // Convert to record
        const teamDocuments: Record<string, DocumentMetadata> = {};
        for (const doc of documents) {
          teamDocuments[doc.id] = doc;
        }

        set({
          teamDocuments,
          lastSyncAt: Date.now(),
          isLoadingList: false,
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to fetch documents';
        set({ error, isLoadingList: false });
        throw e;
      }
    },

    loadTeamDocument: async (docId) => {
      if (!docSyncProvider) {
        throw new Error('Not connected to host');
      }

      // Check cache first
      const cached = get().documentCache[docId];
      if (cached) {
        return cached;
      }

      // Mark as loading
      set((state) => ({
        loadingDocs: new Set(state.loadingDocs).add(docId),
        error: null,
      }));

      try {
        const doc = await docSyncProvider.getDocument(docId);

        // Cache the document
        set((state) => {
          const loadingDocs = new Set(state.loadingDocs);
          loadingDocs.delete(docId);
          return {
            loadingDocs,
            documentCache: {
              ...state.documentCache,
              [docId]: doc,
            },
          };
        });

        return doc;
      } catch (e) {
        // Remove from loading
        set((state) => {
          const loadingDocs = new Set(state.loadingDocs);
          loadingDocs.delete(docId);
          return {
            loadingDocs,
            error: e instanceof Error ? e.message : 'Failed to load document',
          };
        });
        throw e;
      }
    },

    saveToHost: async (doc) => {
      if (!docSyncProvider) {
        throw new Error('Not connected to host');
      }

      try {
        await docSyncProvider.saveDocument(doc);

        // Update cache
        set((state) => ({
          documentCache: {
            ...state.documentCache,
            [doc.id]: doc,
          },
        }));
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to save document';
        set({ error });
        throw e;
      }
    },

    deleteFromHost: async (docId) => {
      if (!docSyncProvider) {
        throw new Error('Not connected to host');
      }

      try {
        await docSyncProvider.deleteDocument(docId);

        // Remove from local state
        set((state) => {
          const teamDocuments = { ...state.teamDocuments };
          delete teamDocuments[docId];

          const documentCache = { ...state.documentCache };
          delete documentCache[docId];

          return { teamDocuments, documentCache };
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to delete document';
        set({ error });
        throw e;
      }
    },

    handleDocumentEvent: (event) => {
      set((state) => {
        const teamDocuments = { ...state.teamDocuments };
        const documentCache = { ...state.documentCache };

        switch (event.eventType) {
          case 'created':
          case 'updated':
            if (event.metadata) {
              teamDocuments[event.docId] = event.metadata;
            }
            // Invalidate cache on update (will be refetched when needed)
            if (event.eventType === 'updated') {
              delete documentCache[event.docId];
            }
            break;

          case 'deleted':
            delete teamDocuments[event.docId];
            delete documentCache[event.docId];
            break;
        }

        return { teamDocuments, documentCache };
      });
    },

    setHostConnected: (connected) => {
      set({ hostConnected: connected });

      if (!connected) {
        // Clear state on disconnect
        set({
          authenticated: false,
          error: null,
        });
      }
    },

    setAuthenticated: (authenticated) => {
      set({ authenticated });

      // Fetch document list when authenticated
      if (authenticated && docSyncProvider) {
        get().fetchDocumentList().catch(console.error);
      }
    },

    clearTeamDocuments: () => {
      set({
        teamDocuments: {},
        loadingDocs: new Set(),
        documentCache: {},
        hostConnected: false,
        authenticated: false,
        lastSyncAt: null,
        error: null,
        isLoadingList: false,
      });
    },

    setError: (error) => {
      set({ error });
    },

    isTeamDocument: (docId) => {
      return docId in get().teamDocuments;
    },

    getMetadata: (docId) => {
      return get().teamDocuments[docId];
    },

    getCachedDocument: (docId) => {
      return get().documentCache[docId];
    },
  })
);

/** Get the document sync provider */
export function getDocSyncProvider(): DocumentSyncProvider | null {
  return docSyncProvider;
}

export default useTeamDocumentStore;
