/**
 * Collaboration Store
 *
 * Manages the collaboration state and ties together:
 * - YjsDocument for CRDT-based shape sync
 * - UnifiedSyncProvider for WebSocket communication
 * - Integration with documentStore for local state
 *
 * This store handles:
 * - Starting/stopping collaboration sessions
 * - Syncing local changes to remote peers
 * - Applying remote changes to local state
 * - Managing presence (cursor positions, selections)
 *
 * Phase 14.1 Collaboration Overhaul - Uses UnifiedSyncProvider
 */

import { create } from 'zustand';
import { YjsDocument } from './YjsDocument';
import { UnifiedSyncProvider, AwarenessUserState } from './UnifiedSyncProvider';
import { useTeamDocumentStore } from '../store/teamDocumentStore';
import { useConnectionStore, type ConnectionStatus } from '../store/connectionStore';
import { usePresenceStore } from '../store/presenceStore';
import type { Shape } from '../shapes/Shape';
import type { DocEvent } from './protocol';

/**
 * Collaboration session configuration
 */
export interface CollaborationConfig {
  /** WebSocket URL (e.g., ws://localhost:9876/ws) */
  serverUrl: string;
  /** Document ID to collaborate on */
  documentId: string;
  /** Authentication token (JWT) - use this OR credentials */
  token?: string;
  /** Host login credentials - alternative to token for client login */
  credentials?: {
    username: string;
    password: string;
  };
  /** Local user info */
  user: {
    id: string;
    name: string;
    color: string;
  };
}

/**
 * Remote user with awareness state
 */
export interface RemoteUser extends AwarenessUserState {
  clientId: number;
}

/**
 * Collaboration store state
 */
interface CollaborationState {
  /** Whether collaboration is active */
  isActive: boolean;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Whether the document is synced with server */
  isSynced: boolean;
  /** Connection error message */
  error: string | null;
  /** Remote users currently viewing the document */
  remoteUsers: RemoteUser[];
  /** Current collaboration config */
  config: CollaborationConfig | null;
}

/**
 * Collaboration store actions
 */
interface CollaborationActions {
  /** Start a collaboration session */
  startSession: (config: CollaborationConfig) => void;
  /** Stop the current collaboration session */
  stopSession: () => void;

  // Local -> Remote sync
  /** Sync a shape change to remote peers */
  syncShape: (shape: Shape) => void;
  /** Sync multiple shapes to remote peers */
  syncShapes: (shapes: Shape[]) => void;
  /** Sync a shape deletion to remote peers */
  syncDeleteShape: (shapeId: string) => void;
  /** Sync shape order to remote peers */
  syncShapeOrder: (order: string[]) => void;

  // Document switching
  /** Switch to a different document for CRDT sync */
  switchDocument: (docId: string) => void;

  // Presence
  /** Update local cursor position */
  updateCursor: (x: number, y: number) => void;
  /** Update local selection */
  updateSelection: (shapeIds: string[]) => void;

  // Internal
  /** Set connection status (internal) */
  _setConnectionStatus: (status: ConnectionStatus) => void;
  /** Set synced state (internal) */
  _setSynced: (synced: boolean) => void;
  /** Set error (internal) */
  _setError: (error: string | null) => void;
  /** Update remote users (internal) */
  _updateRemoteUsers: (users: Map<number, AwarenessUserState>) => void;

  // Access to internals (for document store integration)
  /** Get the YjsDocument instance */
  getYjsDocument: () => YjsDocument | null;
  /** Get the UnifiedSyncProvider instance */
  getSyncProvider: () => UnifiedSyncProvider | null;
}

/**
 * Internal state (not in Zustand to avoid serialization issues)
 */
let yjsDoc: YjsDocument | null = null;
let syncProvider: UnifiedSyncProvider | null = null;
let awarenessUnsubscribe: (() => void) | null = null;

/**
 * Collaboration store for managing real-time sync.
 */
export const useCollaborationStore = create<CollaborationState & CollaborationActions>()(
  (set, get) => ({
    // Initial state
    isActive: false,
    connectionStatus: 'disconnected',
    isSynced: false,
    error: null,
    remoteUsers: [],
    config: null,

    startSession: (config: CollaborationConfig) => {
      // Stop any existing session
      if (get().isActive) {
        get().stopSession();
      }

      // Set host info in connection store
      useConnectionStore.getState().setHost({
        address: new URL(config.serverUrl).host,
        url: config.serverUrl,
      });

      // Create Yjs document
      yjsDoc = new YjsDocument(config.documentId);

      // Create unified sync provider
      syncProvider = new UnifiedSyncProvider(yjsDoc.getDoc(), {
        url: config.serverUrl,
        documentId: config.documentId,
        token: config.token,
        credentials: config.credentials,
        onStatusChange: (status, error) => {
          get()._setConnectionStatus(status);
          if (error) {
            get()._setError(error);
          }

          // Update team document store connection status
          const isConnected = status === 'connected' || status === 'authenticated';
          useTeamDocumentStore.getState().setHostConnected(isConnected);
          if (error) {
            useTeamDocumentStore.getState().setError(`Connection: ${error}`);
          } else if (isConnected) {
            useTeamDocumentStore.getState().setError(null);
          }
        },
        onSynced: () => {
          get()._setSynced(true);
        },
        onAuthenticated: (success, user) => {
          useTeamDocumentStore.getState().setAuthenticated(success);

          // Update config user info if we logged in with credentials
          if (success && user && config.credentials) {
            config.user.id = user.id;
            if (user.username) {
              config.user.name = user.username;
            }
          }
        },
        onDocumentEvent: (event: DocEvent) => {
          useTeamDocumentStore.getState().handleDocumentEvent(event);
        },
      });

      // Set up awareness change handler
      awarenessUnsubscribe = syncProvider.onAwarenessChange((users) => {
        get()._updateRemoteUsers(users);
      });

      // Set local user awareness
      syncProvider.setLocalAwareness({
        id: config.user.id,
        name: config.user.name,
        color: config.user.color,
      });

      // Set local user in presence store
      usePresenceStore.getState().setLocalUser({
        userId: config.user.id,
        name: config.user.name,
        color: config.user.color,
      });

      // Register provider with team document store
      useTeamDocumentStore.getState().setProvider(syncProvider);

      // Connect
      syncProvider.connect();

      set({
        isActive: true,
        config,
        error: null,
      });
    },

    stopSession: () => {

      // Unsubscribe from awareness changes before destroying provider
      if (awarenessUnsubscribe) {
        awarenessUnsubscribe();
        awarenessUnsubscribe = null;
      }

      if (syncProvider) {
        syncProvider.destroy();
        syncProvider = null;
      }

      if (yjsDoc) {
        yjsDoc.destroy();
        yjsDoc = null;
      }

      // Clear team document store
      useTeamDocumentStore.getState().setProvider(null);
      useTeamDocumentStore.getState().clearTeamDocuments();

      // Clear presence store
      usePresenceStore.getState().setLocalUser(null);
      usePresenceStore.getState().clearRemoteUsers();

      // Reset connection store
      useConnectionStore.getState().reset();

      set({
        isActive: false,
        connectionStatus: 'disconnected',
        isSynced: false,
        error: null,
        remoteUsers: [],
        config: null,
      });
    },

    syncShape: (shape: Shape) => {
      if (yjsDoc) {
        yjsDoc.setShape(shape);
      }
    },

    syncShapes: (shapes: Shape[]) => {
      if (yjsDoc) {
        yjsDoc.setShapes(shapes);
      }
    },

    syncDeleteShape: (shapeId: string) => {
      if (yjsDoc) {
        yjsDoc.deleteShape(shapeId);
      }
    },

    syncShapeOrder: (order: string[]) => {
      if (yjsDoc) {
        yjsDoc.setShapeOrder(order);
      }
    },

    switchDocument: (docId: string) => {
      
      if (yjsDoc) {
        // Clear the CRDT document state for the new document
        yjsDoc.clear();
      }
      
      if (syncProvider) {
        // Tell the server we're now on a different document
        syncProvider.joinDocument(docId);
        // Request initial sync for the new document
        syncProvider.requestSync();
      }
      
      // Update the config
      const config = get().config;
      if (config) {
        set({
          config: { ...config, documentId: docId },
          isSynced: false,
        });
      }
    },

    updateCursor: (x: number, y: number) => {
      if (syncProvider) {
        syncProvider.updateCursor(x, y);
      }
    },

    updateSelection: (shapeIds: string[]) => {
      if (syncProvider) {
        syncProvider.updateSelection(shapeIds);
      }
    },

    _setConnectionStatus: (status: ConnectionStatus) => {
      set({ connectionStatus: status });
    },

    _setSynced: (synced: boolean) => {
      set({ isSynced: synced });
    },

    _setError: (error: string | null) => {
      set({ error });
    },

    _updateRemoteUsers: (users: Map<number, AwarenessUserState>) => {
      const remoteUsers: RemoteUser[] = [];
      users.forEach((user, clientId) => {
        remoteUsers.push({ ...user, clientId });
      });
      set({ remoteUsers });

      // Sync to presenceStore for optimized presence rendering
      usePresenceStore.getState().syncRemoteUsers(users);
    },

    getYjsDocument: () => yjsDoc,
    getSyncProvider: () => syncProvider,
  })
);

/**
 * Subscribe to remote shape changes.
 * Returns unsubscribe function.
 *
 * This should be called from the document store to integrate CRDT changes.
 */
export function subscribeToRemoteChanges(
  onShapeChange: (added: Shape[], updated: Shape[], removed: string[]) => void,
  onOrderChange: (order: string[]) => void
): () => void {
  const store = useCollaborationStore.getState();
  const yjsDoc = store.getYjsDocument();

  if (!yjsDoc) {
    return () => {};
  }

  const unsubShape = yjsDoc.onShapeChange(onShapeChange);
  const unsubOrder = yjsDoc.onOrderChange(onOrderChange);

  return () => {
    unsubShape();
    unsubOrder();
  };
}

/**
 * Initialize CRDT with existing document state.
 * Call this when starting collaboration on an existing document.
 */
export function initializeCRDTFromState(
  shapes: Shape[],
  order: string[]
): void {
  const store = useCollaborationStore.getState();
  const yjsDoc = store.getYjsDocument();

  if (yjsDoc) {
    yjsDoc.initializeFromState(shapes, order);
  }
}

// Re-export types for backwards compatibility
export type { ConnectionStatus } from '../store/connectionStore';
export type { AwarenessUserState } from './UnifiedSyncProvider';

export default useCollaborationStore;
