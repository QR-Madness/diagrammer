/**
 * Collaboration Store
 *
 * Manages the collaboration state and ties together:
 * - YjsDocument for CRDT-based shape sync
 * - SyncProvider for WebSocket communication
 * - Integration with documentStore for local state
 *
 * This store handles:
 * - Starting/stopping collaboration sessions
 * - Syncing local changes to remote peers
 * - Applying remote changes to local state
 * - Managing presence (cursor positions, selections)
 */

import { create } from 'zustand';
import { YjsDocument } from './YjsDocument';
import { SyncProvider, ConnectionStatus, AwarenessUserState, SyncProviderOptions } from './SyncProvider';
import type { Shape } from '../shapes/Shape';

/**
 * Collaboration session configuration
 */
export interface CollaborationConfig {
  /** WebSocket URL (e.g., ws://localhost:9876) */
  serverUrl: string;
  /** Document ID to collaborate on */
  documentId: string;
  /** Authentication token (JWT) */
  token?: string;
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
  /** Get the SyncProvider instance */
  getSyncProvider: () => SyncProvider | null;
}

/**
 * Internal state (not in Zustand to avoid serialization issues)
 */
let yjsDoc: YjsDocument | null = null;
let syncProvider: SyncProvider | null = null;

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

      // Create Yjs document
      yjsDoc = new YjsDocument(config.documentId);

      // Build sync provider options
      const providerOptions: SyncProviderOptions = {
        url: config.serverUrl,
        documentId: config.documentId,
        onStatusChange: (status, error) => {
          get()._setConnectionStatus(status);
          if (error) {
            get()._setError(error);
          }
        },
        onSynced: () => {
          get()._setSynced(true);
        },
      };

      // Add token only if defined
      if (config.token) {
        providerOptions.token = config.token;
      }

      // Create sync provider
      syncProvider = new SyncProvider(yjsDoc.getDoc(), providerOptions);

      // Set up awareness change handler
      syncProvider.onAwarenessChange((users) => {
        get()._updateRemoteUsers(users);
      });

      // Set local user awareness
      syncProvider.setLocalAwareness({
        id: config.user.id,
        name: config.user.name,
        color: config.user.color,
      });

      // Connect
      syncProvider.connect();

      set({
        isActive: true,
        config,
        error: null,
      });
    },

    stopSession: () => {
      if (syncProvider) {
        syncProvider.destroy();
        syncProvider = null;
      }

      if (yjsDoc) {
        yjsDoc.destroy();
        yjsDoc = null;
      }

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

export default useCollaborationStore;
