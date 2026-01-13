/**
 * Collaboration module for real-time document sync.
 *
 * This module provides CRDT-based collaboration using Yjs:
 * - YjsDocument: Wrapper for syncing shapes via Y.Map
 * - SyncProvider: WebSocket-based sync with presence
 * - collaborationStore: Zustand store for managing sync state
 */

export { YjsDocument } from './YjsDocument';
export type { YjsDocumentMetadata, ShapeChangeCallback, OrderChangeCallback, MetadataChangeCallback } from './YjsDocument';

export { SyncProvider } from './SyncProvider';
export type { SyncProviderOptions, AwarenessUserState, ConnectionStatus } from './SyncProvider';

export {
  useCollaborationStore,
  subscribeToRemoteChanges,
  initializeCRDTFromState,
} from './collaborationStore';
export type { CollaborationConfig, RemoteUser } from './collaborationStore';

export { useCollaborationSync, isRemoteSyncInProgress } from './useCollaborationSync';
