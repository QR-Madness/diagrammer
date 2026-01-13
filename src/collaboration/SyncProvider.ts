/**
 * Sync Provider for WebSocket-based Yjs synchronization.
 *
 * This provider handles:
 * - WebSocket connection management with auto-reconnect
 * - Yjs document synchronization using the y-protocols
 * - Awareness (presence) for cursor positions and user info
 * - Offline queue for changes made while disconnected
 *
 * The sync protocol uses:
 * - y-protocols/sync for document state
 * - y-protocols/awareness for presence
 */

import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

/**
 * Message types for the sync protocol
 */
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_AUTH = 2;

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Sync provider options
 */
export interface SyncProviderOptions {
  /** WebSocket URL to connect to */
  url: string;
  /** Document ID for room identification */
  documentId: string;
  /** Authentication token (JWT) */
  token?: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Callback for connection status changes */
  onStatusChange?: (status: ConnectionStatus, error?: string) => void;
  /** Callback for sync completion */
  onSynced?: () => void;
}

/**
 * Awareness user state
 */
export interface AwarenessUserState {
  /** User ID */
  id: string;
  /** Display name */
  name: string;
  /** User color (for cursor) */
  color: string;
  /** Cursor position in world coordinates */
  cursor?: { x: number; y: number };
  /** Currently selected shape IDs */
  selection?: string[];
}

/**
 * SyncProvider manages WebSocket-based Yjs synchronization.
 *
 * Usage:
 * ```typescript
 * const provider = new SyncProvider(doc, {
 *   url: 'ws://localhost:9876',
 *   documentId: 'my-doc',
 *   token: 'jwt-token',
 *   onStatusChange: (status) => console.log(status),
 * });
 *
 * // Set local user awareness
 * provider.setLocalAwareness({
 *   id: 'user-1',
 *   name: 'John',
 *   color: '#ff0000',
 * });
 *
 * // Clean up
 * provider.destroy();
 * ```
 */
export class SyncProvider {
  private doc: Y.Doc;
  private options: Required<SyncProviderOptions>;
  private ws: WebSocket | null = null;
  private awareness: awarenessProtocol.Awareness;

  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private synced = false;

  constructor(doc: Y.Doc, options: SyncProviderOptions) {
    this.doc = doc;
    this.options = {
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      onStatusChange: () => {},
      onSynced: () => {},
      token: '',
      ...options,
    };

    // Create awareness instance
    this.awareness = new awarenessProtocol.Awareness(doc);

    // Set up document update handler
    this.doc.on('update', this.handleDocumentUpdate);

    // Set up awareness update handler
    this.awareness.on('update', this.handleAwarenessUpdate);
  }

  /**
   * Get current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if document is synced with server.
   */
  isSynced(): boolean {
    return this.synced;
  }

  /**
   * Get the awareness instance for presence.
   */
  getAwareness(): awarenessProtocol.Awareness {
    return this.awareness;
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    if (this.ws) {
      return;
    }

    this.setStatus('connecting');

    try {
      // Build URL with document ID and token
      const url = new URL(this.options.url);
      url.searchParams.set('doc', this.options.documentId);
      if (this.options.token) {
        url.searchParams.set('token', this.options.token);
      }

      this.ws = new WebSocket(url.toString());
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      this.setStatus('error', errorMsg);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Set local user awareness state.
   */
  setLocalAwareness(state: Partial<AwarenessUserState>): void {
    this.awareness.setLocalStateField('user', state);
  }

  /**
   * Update cursor position in awareness.
   */
  updateCursor(x: number, y: number): void {
    const currentState = this.awareness.getLocalState();
    const user = (currentState?.['user'] as AwarenessUserState) ?? {};
    this.awareness.setLocalStateField('user', {
      ...user,
      cursor: { x, y },
    });
  }

  /**
   * Update selection in awareness.
   */
  updateSelection(shapeIds: string[]): void {
    const currentState = this.awareness.getLocalState();
    const user = (currentState?.['user'] as AwarenessUserState) ?? {};
    this.awareness.setLocalStateField('user', {
      ...user,
      selection: shapeIds,
    });
  }

  /**
   * Get all remote users' awareness states.
   */
  getRemoteUsers(): Map<number, AwarenessUserState> {
    const result = new Map<number, AwarenessUserState>();
    const states = this.awareness.getStates();

    states.forEach((state, clientId) => {
      // Skip local client
      if (clientId === this.doc.clientID) return;

      const userState = state['user'];
      if (userState) {
        result.set(clientId, userState as AwarenessUserState);
      }
    });

    return result;
  }

  /**
   * Subscribe to awareness changes.
   */
  onAwarenessChange(callback: (users: Map<number, AwarenessUserState>) => void): () => void {
    const handler = () => callback(this.getRemoteUsers());
    this.awareness.on('change', handler);
    return () => this.awareness.off('change', handler);
  }

  /**
   * Destroy the provider and clean up.
   */
  destroy(): void {
    this.disconnect();

    this.doc.off('update', this.handleDocumentUpdate);
    this.awareness.off('update', this.handleAwarenessUpdate);
    this.awareness.destroy();
  }

  // ============ Private Methods ============

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;
    this.options.onStatusChange(status, error);
  }

  private handleOpen = (): void => {
    this.setStatus('connected');
    this.reconnectAttempts = 0;

    // Send auth message if token provided
    if (this.options.token) {
      this.sendAuthMessage(this.options.token);
    }

    // Send initial sync step 1
    this.sendSyncStep1();

    // Send initial awareness
    this.sendAwarenessUpdate();
  };

  private handleMessage = (event: MessageEvent): void => {
    const data = new Uint8Array(event.data as ArrayBuffer);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        this.handleSyncMessage(decoder);
        break;
      case MESSAGE_AWARENESS:
        this.handleAwarenessMessage(decoder);
        break;
      case MESSAGE_AUTH:
        // Auth response handling (if needed)
        break;
    }
  };

  private handleClose = (): void => {
    this.ws = null;
    this.synced = false;

    if (this.status !== 'disconnected') {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  };

  private handleError = (): void => {
    this.setStatus('error', 'WebSocket error');
  };

  private handleDocumentUpdate = (update: Uint8Array, origin: unknown): void => {
    // Don't send updates that originated from the server
    if (origin === this) return;

    if (this.ws?.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      this.ws.send(encoding.toUint8Array(encoder));
    }
  };

  private handleAwarenessUpdate = ({ added, updated, removed }: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void => {
    const changedClients = added.concat(updated).concat(removed);
    const localClientId = this.doc.clientID;

    // Only send if local client's awareness changed
    if (changedClients.includes(localClientId)) {
      this.sendAwarenessUpdate();
    }
  };

  private handleSyncMessage(decoder: decoding.Decoder): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    const syncMessageType = syncProtocol.readSyncMessage(
      decoder,
      encoder,
      this.doc,
      this
    );

    // If there's a response to send, send it
    if (encoding.length(encoder) > 1) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(encoding.toUint8Array(encoder));
      }
    }

    // Mark as synced after sync step 2
    if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !this.synced) {
      this.synced = true;
      this.options.onSynced();
    }
  }

  private handleAwarenessMessage(decoder: decoding.Decoder): void {
    awarenessProtocol.applyAwarenessUpdate(
      this.awareness,
      decoding.readVarUint8Array(decoder),
      this
    );
  }

  private sendSyncStep1(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    this.ws.send(encoding.toUint8Array(encoder));
  }

  private sendAwarenessUpdate(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
    );
    this.ws.send(encoding.toUint8Array(encoder));
  }

  private sendAuthMessage(token: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AUTH);
    encoding.writeVarString(encoder, token);
    this.ws.send(encoding.toUint8Array(encoder));
  }

  private scheduleReconnect(): void {
    if (!this.options.autoReconnect) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setStatus('error', 'Max reconnect attempts reached');
      return;
    }

    this.clearReconnectTimeout();

    // Exponential backoff
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export default SyncProvider;
