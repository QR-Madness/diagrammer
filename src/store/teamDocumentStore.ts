/**
 * Team Document Store
 *
 * Manages team documents fetched from the host server.
 * Works alongside persistenceStore which handles local documents.
 *
 * Team documents are stored on the host and synced to clients.
 * This store maintains the client-side view of team documents.
 *
 * Phase 14.1: Updated to work with UnifiedSyncProvider
 */

import { create } from 'zustand';
import type { DocumentMetadata, DiagramDocument } from '../types/Document';
import type { DocEvent } from '../collaboration/protocol';
import type { UnifiedSyncProvider } from '../collaboration/UnifiedSyncProvider';
import { useDocumentRegistry } from './documentRegistry';
import { useConnectionStore } from './connectionStore';
import { useUserStore } from './userStore';
import type { Permission } from '../types/DocumentRegistry';
import {
  bundleDocumentWithAssets,
  extractAssetsFromBundle,
  hasBlobReferences,
  hasEmbeddedAssets,
} from '../storage/AssetBundler';

/**
 * Calculate the effective permission for a user on a document.
 * Mirrors the backend permission logic in permissions.rs
 */
function getEffectivePermission(
  doc: DocumentMetadata,
  userId: string | undefined,
  userRole: string | undefined
): Permission {
  if (!userId) return 'viewer'; // Unauthenticated users get minimal access
  
  // Owner has full access
  if (doc.ownerId === userId) return 'owner';
  
  // Admins have full access
  if (userRole === 'admin') return 'owner';
  
  // Check explicit shares
  if (doc.sharedWith) {
    for (const share of doc.sharedWith) {
      if (share.userId === userId) {
        // Map share permission to our Permission type
        if (share.permission === 'edit') return 'editor';
        if (share.permission === 'view') return 'viewer';
      }
    }
  }
  
  // Default: viewer (can see in list, but limited actions)
  return 'viewer';
}

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

/**
 * Provider interface that both UnifiedSyncProvider and DocumentSyncProvider implement.
 * This allows the store to work with either provider type.
 */
interface DocumentProvider {
  listDocuments(): Promise<DocumentMetadata[]>;
  getDocument(docId: string): Promise<DiagramDocument | { document: DiagramDocument; serverVersion?: number }>;
  saveDocument(doc: DiagramDocument, expectedVersion?: number): Promise<void | { newVersion?: number }>;
  deleteDocument(docId: string): Promise<void>;
  updateDocumentShares?(
    docId: string,
    shares: Array<{ userId: string; userName: string; permission: string }>
  ): Promise<void>;
  transferDocumentOwnership?(
    docId: string,
    newOwnerId: string,
    newOwnerName: string
  ): Promise<void>;
}

/** Team document store actions */
interface TeamDocumentActions {
  /** Set provider from UnifiedSyncProvider */
  setProvider: (provider: UnifiedSyncProvider | null) => void;

  /** Fetch document list from host */
  fetchDocumentList: () => Promise<void>;

  /** Load a team document's content */
  loadTeamDocument: (docId: string) => Promise<DiagramDocument>;

  /** 
   * Save a document to host as team document.
   * Uses optimistic locking if expectedVersion is provided.
   * @throws VersionConflictError if version mismatch detected
   */
  saveToHost: (doc: DiagramDocument, expectedVersion?: number) => Promise<{ newVersion?: number }>;

  /** Delete a team document from host */
  deleteFromHost: (docId: string) => Promise<void>;

  /** Update document sharing permissions */
  updateDocumentShares: (
    docId: string,
    shares: Array<{ userId: string; userName: string; permission: string }>
  ) => Promise<void>;

  /** Transfer document ownership */
  transferDocumentOwnership: (
    docId: string,
    newOwnerId: string,
    newOwnerName: string
  ) => Promise<void>;

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

/** Document provider instance (module-level singleton) */
let docProvider: DocumentProvider | null = null;

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
      docProvider = provider;

      // Note: Document events are handled by collaborationStore's onDocumentEvent callback
      // which calls handleDocumentEvent directly, so no subscription needed here
    },

    fetchDocumentList: async () => {
      if (!docProvider) {
        set({ error: 'Not connected to host' });
        return;
      }

      set({ isLoadingList: true, error: null });

      try {
        const documents = await docProvider.listDocuments();

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

        // Register remote documents in the registry with proper permissions
        const registry = useDocumentRegistry.getState();
        const connection = useConnectionStore.getState();
        const userState = useUserStore.getState();
        const hostId = connection.host?.address ?? 'unknown';
        const userId = userState.currentUser?.id;
        const userRole = userState.currentUser?.role;

        // Register each document with its calculated effective permission
        for (const doc of documents) {
          const permission = getEffectivePermission(doc, userId, userRole);
          registry.registerRemote(doc, hostId, permission, 'synced');
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to fetch documents';
        set({ error, isLoadingList: false });
        throw e;
      }
    },

    loadTeamDocument: async (docId) => {
      if (!docProvider) {
        throw new Error('Not connected to host');
      }

      const registry = useDocumentRegistry.getState();

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
      registry.setDocumentLoading(docId, true);

      try {
        const result = await docProvider.getDocument(docId);
        
        // Handle both old format (DiagramDocument) and new format ({ document, serverVersion })
        let doc: DiagramDocument;
        let serverVersion: number | undefined;
        
        if ('document' in result && result.document) {
          doc = result.document;
          serverVersion = result.serverVersion;
        } else {
          doc = result as DiagramDocument;
        }

        // Store serverVersion on document for version tracking
        if (serverVersion !== undefined) {
          doc = { ...doc, serverVersion };
        }

        // Extract embedded assets from the document if present
        // This converts data: URLs to local blob:// references
        if (hasEmbeddedAssets(doc)) {
          console.log('[teamDocumentStore] Extracting embedded assets from document:', docId);
          const assetResult = await extractAssetsFromBundle(doc);
          doc = assetResult.document;
          // Preserve serverVersion after extraction
          if (serverVersion !== undefined) {
            doc = { ...doc, serverVersion };
          }
          console.log(`[teamDocumentStore] Extracted ${assetResult.assetCount} assets`);
        }

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

        // Also cache in registry
        registry.setDocumentContent(docId, doc);

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
        registry.setDocumentLoading(docId, false, e instanceof Error ? e.message : 'Failed to load');
        throw e;
      }
    },

    saveToHost: async (doc, expectedVersion) => {
      if (!docProvider) {
        throw new Error('Not connected to host');
      }

      const registry = useDocumentRegistry.getState();

      // Set sync state to syncing
      registry.setSyncState(doc.id, 'syncing');

      try {
        // Bundle assets as base64 data URLs before sending
        // This ensures other clients can access the assets
        let docToSave = doc;
        if (hasBlobReferences(doc)) {
          console.log('[teamDocumentStore] Bundling assets for document:', doc.id);
          const bundleResult = await bundleDocumentWithAssets(doc);
          docToSave = bundleResult.document;
          console.log(`[teamDocumentStore] Bundled ${bundleResult.assetCount} assets (${bundleResult.totalSize} bytes)`);
        }

        // Save with optional version check
        const saveResult = await docProvider.saveDocument(docToSave, expectedVersion);
        const newVersion = saveResult && typeof saveResult === 'object' && 'newVersion' in saveResult
          ? saveResult.newVersion
          : undefined;

        // Update cache with the original doc (with blob:// references)
        // The bundled version is only for transmission
        // Also update serverVersion if returned
        const updatedDoc = newVersion !== undefined
          ? { ...doc, serverVersion: newVersion }
          : doc;
        
        set((state) => ({
          documentCache: {
            ...state.documentCache,
            [doc.id]: updatedDoc,
          },
        }));

        // Update registry
        registry.setDocumentContent(doc.id, updatedDoc);
        registry.setSyncState(doc.id, 'synced');

        // Return result with proper optional property handling
        const result: { newVersion?: number } = {};
        if (newVersion !== undefined) {
          result.newVersion = newVersion;
        }
        return result;
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to save document';
        set({ error });
        registry.setSyncState(doc.id, 'error');
        throw e;
      }
    },

    deleteFromHost: async (docId) => {
      if (!docProvider) {
        throw new Error('Not connected to host');
      }

      try {
        await docProvider.deleteDocument(docId);

        // Remove from local state
        set((state) => {
          const teamDocuments = { ...state.teamDocuments };
          delete teamDocuments[docId];

          const documentCache = { ...state.documentCache };
          delete documentCache[docId];

          return { teamDocuments, documentCache };
        });

        // Remove from registry
        useDocumentRegistry.getState().removeDocument(docId);
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to delete document';
        set({ error });
        throw e;
      }
    },

    updateDocumentShares: async (docId, shares) => {
      if (!docProvider) {
        throw new Error('Not connected to host');
      }

      if (!docProvider.updateDocumentShares) {
        throw new Error('Provider does not support share updates');
      }

      try {
        await docProvider.updateDocumentShares(docId, shares);
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to update shares';
        set({ error });
        throw e;
      }
    },

    transferDocumentOwnership: async (docId, newOwnerId, newOwnerName) => {
      if (!docProvider) {
        throw new Error('Not connected to host');
      }

      if (!docProvider.transferDocumentOwnership) {
        throw new Error('Provider does not support ownership transfer');
      }

      try {
        await docProvider.transferDocumentOwnership(docId, newOwnerId, newOwnerName);
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to transfer ownership';
        set({ error });
        throw e;
      }
    },

    handleDocumentEvent: (event) => {
      const registry = useDocumentRegistry.getState();
      const connection = useConnectionStore.getState();
      const userState = useUserStore.getState();
      const hostId = connection.host?.address ?? 'unknown';
      const userId = userState.currentUser?.id;
      const userRole = userState.currentUser?.role;

      set((state) => {
        const teamDocuments = { ...state.teamDocuments };
        const documentCache = { ...state.documentCache };

        switch (event.eventType) {
          case 'created':
          case 'updated':
            if (event.metadata) {
              teamDocuments[event.docId] = event.metadata;
              // Calculate proper permission for this user
              const permission = getEffectivePermission(event.metadata, userId, userRole);
              // Update registry
              registry.registerRemote(event.metadata, hostId, permission, 'synced');
            }
            // Invalidate cache on update (will be refetched when needed)
            if (event.eventType === 'updated') {
              delete documentCache[event.docId];
              registry.invalidateContent(event.docId);
            }
            break;

          case 'deleted':
            delete teamDocuments[event.docId];
            delete documentCache[event.docId];
            // Remove from registry
            registry.removeDocument(event.docId);
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
      if (authenticated && docProvider) {
        get().fetchDocumentList().catch(console.error);
      }
    },

    clearTeamDocuments: () => {
      // Clear remote documents from registry for the current host
      const connection = useConnectionStore.getState();
      if (connection.host?.address) {
        useDocumentRegistry.getState().clearRemoteDocuments(connection.host.address);
      }

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

/** Get the current document provider */
export function getDocProvider(): DocumentProvider | null {
  return docProvider;
}

export default useTeamDocumentStore;
