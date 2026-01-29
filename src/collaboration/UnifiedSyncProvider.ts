/**
 * Unified Sync Provider
 *
 * Single WebSocket provider that handles all collaboration functionality:
 * - CRDT sync via Yjs (shapes, order, metadata)
 * - Awareness/presence (cursors, selections)
 * - Document operations (list, get, save, delete)
 * - Authentication (token or credentials)
 *
 * Replaces separate SyncProvider and DocumentSyncProvider with unified architecture.
 *
 * Phase 14.1 Collaboration Overhaul
 */

import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

import type { DocumentMetadata, DiagramDocument } from '../types/Document';
import {
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  MESSAGE_AUTH,
  MESSAGE_AUTH_LOGIN,
  MESSAGE_AUTH_RESPONSE,
  MESSAGE_DOC_LIST,
  MESSAGE_DOC_GET,
  MESSAGE_DOC_SAVE,
  MESSAGE_DOC_DELETE,
  MESSAGE_DOC_EVENT,
  MESSAGE_JOIN_DOC,
  encodeMessage,
  decodeMessageType,
  decodePayload,
  generateRequestId,
  type AuthLoginRequest,
  type AuthResponse,
  type DocListRequest,
  type DocListResponse,
  type DocGetRequest,
  type DocGetResponse,
  type DocSaveRequest,
  type DocSaveResponse,
  type DocDeleteRequest,
  type DocDeleteResponse,
  type DocEvent,
  type JoinDocRequest,
} from './protocol';
import { useConnectionStore, type ConnectionStatus, type AuthenticatedUser } from '../store/connectionStore';

// ============ Types ============

/** Awareness user state */
export interface AwarenessUserState {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string[];
}

/** Unified provider options */
export interface UnifiedSyncProviderOptions {
  /** WebSocket URL (e.g., ws://localhost:9876/ws) */
  url: string;
  /** Document ID for CRDT room */
  documentId: string;
  /** JWT token for authentication (use this OR credentials) */
  token?: string | undefined;
  /** Login credentials (alternative to token) */
  credentials?: {
    username: string;
    password: string;
  } | undefined;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean | undefined;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number | undefined;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number | undefined;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number | undefined;

  // Callbacks
  /** Called when connection status changes */
  onStatusChange?: ((status: ConnectionStatus, error?: string) => void) | undefined;
  /** Called when CRDT is synced */
  onSynced?: (() => void) | undefined;
  /** Called when authentication completes */
  onAuthenticated?: ((success: boolean, user?: AuthenticatedUser) => void) | undefined;
  /** Called when document event received */
  onDocumentEvent?: ((event: DocEvent) => void) | undefined;
}

/** Resolved options with defaults applied (no undefined values) */
interface ResolvedSyncProviderOptions {
  url: string;
  documentId: string;
  token: string;
  credentials: { username: string; password: string } | null;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  requestTimeout: number;
  onStatusChange: (status: ConnectionStatus, error?: string) => void;
  onSynced: () => void;
  onAuthenticated: (success: boolean, user?: AuthenticatedUser) => void;
  onDocumentEvent: (event: DocEvent) => void;
}

/** Pending request tracking */
interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ============ UnifiedSyncProvider ============

/**
 * UnifiedSyncProvider manages all WebSocket-based collaboration.
 *
 * Single connection handles:
 * - Yjs CRDT sync (MESSAGE_SYNC)
 * - Awareness/presence (MESSAGE_AWARENESS)
 * - Authentication (MESSAGE_AUTH, MESSAGE_AUTH_LOGIN, MESSAGE_AUTH_RESPONSE)
 * - Document operations (MESSAGE_DOC_*)
 */
export class UnifiedSyncProvider {
  private doc: Y.Doc;
  private options: ResolvedSyncProviderOptions;
  private ws: WebSocket | null = null;
  private awareness: awarenessProtocol.Awareness;

  private status: ConnectionStatus = 'disconnected';
  private synced = false;
  private authenticated = false;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Pending document requests by request ID */
  private pendingRequests: Map<string, PendingRequest<unknown>> = new Map();

  /** Current document ID for CRDT routing */
  private currentDocId: string | null = null;

  /** Flag for pending login request (prevents double auth handling) */
  private pendingLoginRequest = false;

  constructor(doc: Y.Doc, options: UnifiedSyncProviderOptions) {
    this.doc = doc;
    this.options = {
      url: options.url,
      documentId: options.documentId,
      token: options.token ?? '',
      credentials: options.credentials ?? null,
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      requestTimeout: options.requestTimeout ?? 30000,
      onStatusChange: options.onStatusChange ?? (() => {}),
      onSynced: options.onSynced ?? (() => {}),
      onAuthenticated: options.onAuthenticated ?? (() => {}),
      onDocumentEvent: options.onDocumentEvent ?? (() => {}),
    };

    // Create awareness instance
    this.awareness = new awarenessProtocol.Awareness(doc);

    // Set up document update handler
    this.doc.on('update', this.handleDocumentUpdate);

    // Set up awareness update handler
    this.awareness.on('update', this.handleAwarenessUpdate);
  }

  // ============ Connection ============

  /** Get current connection status */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Check if CRDT is synced */
  isSynced(): boolean {
    return this.synced;
  }

  /** Check if authenticated */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /** Check if ready (connected and authenticated) */
  isReady(): boolean {
    return this.status === 'authenticated' && this.authenticated;
  }

  /** Connect to the WebSocket server */
  connect(): void {
    if (this.ws) {
      return;
    }

    this.setStatus('connecting');

    try {
      // Build URL with document ID
      const url = new URL(this.options.url);
      url.searchParams.set('doc', this.options.documentId);

      this.ws = new WebSocket(url.toString());
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      console.error('[UnifiedSyncProvider] Connection error:', errorMsg);
      this.setStatus('error', errorMsg);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from the WebSocket server */
  disconnect(): void {
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();

    this.synced = false;
    this.authenticated = false;
    this.setStatus('disconnected');
  }

  /** Destroy the provider and clean up */
  destroy(): void {
    this.disconnect();

    this.doc.off('update', this.handleDocumentUpdate);
    this.awareness.off('update', this.handleAwarenessUpdate);
    this.awareness.destroy();
  }

  // ============ Awareness/Presence ============

  /** Get the awareness instance */
  getAwareness(): awarenessProtocol.Awareness {
    return this.awareness;
  }

  /** Set local user awareness state */
  setLocalAwareness(state: Partial<AwarenessUserState>): void {
    this.awareness.setLocalStateField('user', state);
  }

  /** Update cursor position */
  updateCursor(x: number, y: number): void {
    const currentState = this.awareness.getLocalState();
    const user = (currentState?.['user'] as AwarenessUserState) ?? {};
    this.awareness.setLocalStateField('user', { ...user, cursor: { x, y } });
  }

  /** Update selection */
  updateSelection(shapeIds: string[]): void {
    const currentState = this.awareness.getLocalState();
    const user = (currentState?.['user'] as AwarenessUserState) ?? {};
    this.awareness.setLocalStateField('user', { ...user, selection: shapeIds });
  }

  /** Get all remote users' awareness states */
  getRemoteUsers(): Map<number, AwarenessUserState> {
    const result = new Map<number, AwarenessUserState>();
    const states = this.awareness.getStates();

    states.forEach((state, clientId) => {
      if (clientId === this.doc.clientID) return;
      const userState = state['user'];
      if (userState) {
        result.set(clientId, userState as AwarenessUserState);
      }
    });

    return result;
  }

  /** Subscribe to awareness changes */
  onAwarenessChange(callback: (users: Map<number, AwarenessUserState>) => void): () => void {
    const handler = () => callback(this.getRemoteUsers());
    this.awareness.on('change', handler);
    return () => this.awareness.off('change', handler);
  }

  // ============ Document Operations ============

  /** List all team documents from host */
  async listDocuments(): Promise<DocumentMetadata[]> {
    const requestId = generateRequestId();
    const request: DocListRequest = { requestId };

    const response = await this.sendRequest<DocListResponse>(
      MESSAGE_DOC_LIST,
      request,
      requestId
    );

    return response.documents;
  }

  /** Get a document by ID from host */
  async getDocument(docId: string): Promise<DiagramDocument> {
    const requestId = generateRequestId();
    const request: DocGetRequest = { requestId, docId };

    const response = await this.sendRequest<DocGetResponse>(
      MESSAGE_DOC_GET,
      request,
      requestId
    );

    if (response.error || !response.document) {
      throw new Error(response.error ?? 'Document not found');
    }

    return response.document;
  }

  /** Save a document to host */
  async saveDocument(document: DiagramDocument): Promise<void> {
    const requestId = generateRequestId();
    const request: DocSaveRequest = { requestId, document };

    const response = await this.sendRequest<DocSaveResponse>(
      MESSAGE_DOC_SAVE,
      request,
      requestId
    );

    if (!response.success) {
      throw new Error(response.error ?? 'Failed to save document');
    }
  }

  /** Delete a document from host */
  async deleteDocument(docId: string): Promise<void> {
    const requestId = generateRequestId();
    const request: DocDeleteRequest = { requestId, docId };

    const response = await this.sendRequest<DocDeleteResponse>(
      MESSAGE_DOC_DELETE,
      request,
      requestId
    );

    if (!response.success) {
      throw new Error(response.error ?? 'Failed to delete document');
    }
  }

  /** Join a document for CRDT routing */
  joinDocument(docId: string): void {
    this.currentDocId = docId;

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request: JoinDocRequest = { docId };
      const data = encodeMessage(MESSAGE_JOIN_DOC, request);
      this.ws.send(data);
    }
  }

  /** Request initial sync after joining a document */
  requestSync(): void {
    this.synced = false;
    this.sendSyncStep1();
  }

  /** Leave current document */
  leaveDocument(): void {
    this.currentDocId = null;
  }

  // ============ Authentication ============

  /**
   * Login with username and password.
   * Returns token on success for future connections.
   */
  async loginWithCredentials(
    username: string,
    password: string
  ): Promise<{
    success: boolean;
    token?: string;
    tokenExpiresAt?: number;
    user?: AuthenticatedUser;
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      this.pendingLoginRequest = true;
      let resolved = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Cleanup function to ensure no memory leaks
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.ws?.removeEventListener('message', handleAuth);
        this.pendingLoginRequest = false;
      };

      // Wrapper to ensure cleanup on all resolve paths
      const safeResolve = (result: {
        success: boolean;
        token?: string;
        tokenExpiresAt?: number;
        user?: AuthenticatedUser;
        error?: string;
      }) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };

      const handleAuth = (event: MessageEvent) => {
        const data = event.data as ArrayBuffer;
        const msgType = decodeMessageType(data);

        // Only process auth response messages
        if (msgType !== MESSAGE_AUTH_RESPONSE) return;

        try {
          const response = decodePayload<AuthResponse>(data);

          if (response.success) {
            this.authenticated = true;
            this.setStatus('authenticated');

            const user: AuthenticatedUser | undefined = response.userId
              ? { id: response.userId, username: response.username ?? '', role: response.role ?? undefined }
              : undefined;

            // Update connection store
            useConnectionStore.getState().setUser(user ?? null);
            if (response.token) {
              useConnectionStore.getState().setToken(response.token, response.tokenExpiresAt ?? null);
              this.options.token = response.token;
            }

            this.options.onAuthenticated?.(true, user);

            // Build result with only defined values
            const result: {
              success: boolean;
              token?: string;
              tokenExpiresAt?: number;
              user?: AuthenticatedUser;
              error?: string;
            } = { success: true };
            if (response.token) result.token = response.token;
            if (response.tokenExpiresAt) result.tokenExpiresAt = response.tokenExpiresAt;
            if (user) result.user = user;

            safeResolve(result);
          } else {
            safeResolve({ success: false, error: response.error ?? 'Authentication failed' });
          }
        } catch (e) {
          console.error('[UnifiedSyncProvider] Failed to parse login response:', e);
          safeResolve({ success: false, error: 'Failed to parse response' });
        }
      };

      this.ws.addEventListener('message', handleAuth);

      // Timeout
      timeoutId = setTimeout(() => {
        safeResolve({ success: false, error: 'Login timeout' });
      }, this.options.requestTimeout);

      // Send login request
      const request: AuthLoginRequest = { username, password };
      const data = encodeMessage(MESSAGE_AUTH_LOGIN, request);
      this.ws.send(data);
    });
  }

  // ============ Private: Connection Handlers ============

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;

    // Update connection store
    useConnectionStore.getState().setStatus(status, error);

    this.options.onStatusChange?.(status, error);
  }

  private handleOpen = (): void => {
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    useConnectionStore.getState().resetReconnectAttempts();

    // Authenticate if we have token
    if (this.options.token) {
      this.setStatus('authenticating');
      useConnectionStore.getState().setAuthMethod('token');
      this.sendAuth(this.options.token);
    } else if (this.options.credentials) {
      this.setStatus('authenticating');
      useConnectionStore.getState().setAuthMethod('credentials');
      this.loginWithCredentials(
        this.options.credentials.username,
        this.options.credentials.password
      ).catch((err) => {
        console.error('[UnifiedSyncProvider] Credentials login failed:', err);
      });
    } else {
      useConnectionStore.getState().setAuthMethod('none');
    }

    // Join document FIRST - this sets current_doc_id on server for routing
    // Must happen before sending any CRDT messages
    const docToJoin = this.currentDocId ?? this.options.documentId;
    if (docToJoin) {
      this.joinDocument(docToJoin);
    }

    // Send initial CRDT sync step 1 (now routed to correct document)
    this.sendSyncStep1();

    // Send initial awareness
    this.sendAwarenessUpdate();
  };

  private handleMessage = (event: MessageEvent): void => {
    const data = event.data as ArrayBuffer;
    const arr = new Uint8Array(data);

    if (arr.length === 0) return;

    const msgType = arr[0]!;

    switch (msgType) {
      case MESSAGE_SYNC:
        this.handleSyncMessage(arr);
        break;
      case MESSAGE_AWARENESS:
        this.handleAwarenessMessage(arr);
        break;
      case MESSAGE_AUTH_RESPONSE:
        this.handleAuthResponse(data);
        break;
      case MESSAGE_DOC_LIST:
      case MESSAGE_DOC_GET:
      case MESSAGE_DOC_SAVE:
      case MESSAGE_DOC_DELETE:
        this.handleDocResponse(data);
        break;
      case MESSAGE_DOC_EVENT:
        this.handleDocEvent(data);
        break;
      default:
        // Unknown message type, ignore
        break;
    }
  };

  private handleClose = (_event: CloseEvent): void => {
    this.ws = null;
    this.synced = false;
    this.authenticated = false;

    if (this.status !== 'disconnected') {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  };

  private handleError = (): void => {
    console.error('[UnifiedSyncProvider] WebSocket error');
    this.setStatus('error', 'WebSocket error');
  };

  // ============ Private: CRDT Sync ============

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

    if (changedClients.includes(this.doc.clientID)) {
      this.sendAwarenessUpdate();
    }
  };

  private handleSyncMessage(data: Uint8Array): void {
    const decoder = decoding.createDecoder(data);
    decoding.readVarUint(decoder); // Skip message type

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    const syncMessageType = syncProtocol.readSyncMessage(
      decoder,
      encoder,
      this.doc,
      this
    );

    // Send response if needed
    if (encoding.length(encoder) > 1) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(encoding.toUint8Array(encoder));
      }
    }

    // Mark as synced after sync step 2
    if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !this.synced) {
      this.synced = true;
      this.options.onSynced?.();
    }
  }

  private handleAwarenessMessage(data: Uint8Array): void {
    const decoder = decoding.createDecoder(data);
    decoding.readVarUint(decoder); // Skip message type

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

  // ============ Private: Authentication ============

  private sendAuth(token: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const data = encodeMessage(MESSAGE_AUTH, token);
    this.ws.send(data);
  }

  private handleAuthResponse(data: ArrayBuffer): void {
    // If login request is pending, let loginWithCredentials handle it
    if (this.pendingLoginRequest) return;

    try {
      const response = decodePayload<AuthResponse>(data);

      if (response.success) {
        this.authenticated = true;
        this.setStatus('authenticated');

        const user: AuthenticatedUser | undefined = response.userId
          ? { id: response.userId, username: response.username ?? '', role: response.role ?? undefined }
          : undefined;

        useConnectionStore.getState().setUser(user ?? null);
        this.options.onAuthenticated?.(true, user);
      } else {
        this.setStatus('error', response.error ?? 'Authentication failed');
        this.options.onAuthenticated?.(false);
      }
    } catch (e) {
      console.error('[UnifiedSyncProvider] Failed to parse auth response:', e);
    }
  }

  // ============ Private: Document Operations ============

  private sendRequest<T>(
    msgType: number,
    payload: unknown,
    requestId: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.options.requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      const data = encodeMessage(msgType, payload);
      this.ws.send(data);
    });
  }

  private handleDocResponse(data: ArrayBuffer): void {
    try {
      const response = decodePayload<{ requestId: string }>(data);
      const pending = this.pendingRequests.get(response.requestId);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.requestId);
        pending.resolve(response);
      }
    } catch (e) {
      console.error('[UnifiedSyncProvider] Failed to parse doc response:', e);
    }
  }

  private handleDocEvent(data: ArrayBuffer): void {
    try {
      const event = decodePayload<DocEvent>(data);
      this.options.onDocumentEvent?.(event);
    } catch (e) {
      console.error('[UnifiedSyncProvider] Failed to parse doc event:', e);
    }
  }

  // ============ Private: Reconnection ============

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
    useConnectionStore.getState().incrementReconnectAttempts();

    console.log(`[UnifiedSyncProvider] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

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

export default UnifiedSyncProvider;
