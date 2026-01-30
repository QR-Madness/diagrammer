/**
 * Collaboration module for real-time document sync.
 *
 * This module provides CRDT-based collaboration using Yjs:
 * - YjsDocument: Wrapper for syncing shapes via Y.Map
 * - UnifiedSyncProvider: Single WebSocket provider for CRDT sync + document operations
 * - collaborationStore: Zustand store for managing sync state
 *
 * Phase 14.1 Collaboration Overhaul
 */

export { YjsDocument } from './YjsDocument';
export type { YjsDocumentMetadata, ShapeChangeCallback, OrderChangeCallback, MetadataChangeCallback } from './YjsDocument';

// Unified provider (Phase 14.1)
export { UnifiedSyncProvider } from './UnifiedSyncProvider';
export type { UnifiedSyncProviderOptions, AwarenessUserState } from './UnifiedSyncProvider';

// Legacy SyncProvider kept for reference (not actively used)
export { SyncProvider } from './SyncProvider';
export type { SyncProviderOptions, ConnectionStatus } from './SyncProvider';

export {
  useCollaborationStore,
  subscribeToRemoteChanges,
  initializeCRDTFromState,
} from './collaborationStore';
export type { CollaborationConfig, RemoteUser } from './collaborationStore';

export { useCollaborationSync, isRemoteSyncInProgress } from './useCollaborationSync';

// Protocol types and helpers
export * from './protocol';

// Offline sync (Phase 14.1.3)
export { OfflineQueue, getOfflineQueue, resetOfflineQueue } from './OfflineQueue';
export type {
  QueuedOperation,
  QueuedSaveOperation,
  QueuedDeleteOperation,
  QueuedOperationType,
  ProcessResult,
  QueueStats,
} from './OfflineQueue';

export { SyncStateManager, getSyncStateManager, resetSyncStateManager } from './SyncStateManager';
export type { SyncStateManagerOptions, SyncManagerState } from './SyncStateManager';
