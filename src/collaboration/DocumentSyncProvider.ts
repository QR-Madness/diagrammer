/**
 * Document Sync Provider for team document operations.
 *
 * Handles document-level operations (list, get, save, delete) with the host server.
 * Works alongside SyncProvider which handles CRDT sync for shape content.
 */

import type { DocumentMetadata, DiagramDocument } from '../types/Document';
import {
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

/** Connection status */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error';

/** Document sync provider options */
export interface DocumentSyncProviderOptions {
  /** WebSocket URL to connect to */
  url: string;
  /** JWT token for authentication */
  token?: string;
  /** Callback for connection status changes */
  onStatusChange?: (status: ConnectionStatus, error?: string) => void;
  /** Callback for authentication result */
  onAuthenticated?: (success: boolean, userId?: string, username?: string) => void;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
}

/** Pending request tracking */
interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * DocumentSyncProvider manages document operations with the host server.
 *
 * Usage:
 * ```typescript
 * const provider = new DocumentSyncProvider({
 *   url: 'ws://localhost:9876/ws',
 *   token: 'jwt-token',
 *   onStatusChange: (status) => console.log(status),
 * });
 *
 * provider.connect();
 *
 * // List documents
 * const docs = await provider.listDocuments();
 *
 * // Load a document
 * const doc = await provider.getDocument('doc-id');
 *
 * // Save a document
 * await provider.saveDocument(myDoc);
 *
 * // Subscribe to document events
 * const unsubscribe = provider.onDocumentEvent((event) => {
 *   console.log('Document changed:', event);
 * });
 *
 * // Cleanup
 * provider.destroy();
 * ```
 */
export class DocumentSyncProvider {
  private ws: WebSocket | null = null;
  private options: Required<DocumentSyncProviderOptions>;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Pending request tracking by request ID */
  private pendingRequests: Map<string, PendingRequest<unknown>> = new Map();

  /** Document event callbacks */
  private docEventCallbacks: Set<(event: DocEvent) => void> = new Set();

  /** Current document ID for CRDT routing */
  private currentDocId: string | null = null;

  /** Flag to indicate a login request is pending (prevents double onAuthenticated call) */
  private pendingLoginRequest = false;

  constructor(options: DocumentSyncProviderOptions) {
    this.options = {
      token: '',
      onStatusChange: () => {},
      onAuthenticated: () => {},
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      requestTimeout: 30000,
      ...options,
    };
  }

  /** Get current connection status */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Check if connected and authenticated */
  isReady(): boolean {
    return this.status === 'authenticated';
  }

  /** Connect to the WebSocket server */
  connect(): void {
    if (this.ws) {
      console.log('[DocumentSyncProvider] Already connected, skipping');
      return;
    }

    console.log('[DocumentSyncProvider] Connecting to:', this.options.url);
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.options.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      console.error('[DocumentSyncProvider] Connection error:', errorMsg);
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

    this.setStatus('disconnected');
  }

  /** Destroy the provider and clean up */
  destroy(): void {
    this.disconnect();
    this.docEventCallbacks.clear();
  }

  // ============ Document Operations ============

  /** List all team documents from the host */
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

  /** Get a document by ID from the host */
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

  /** Save a document to the host */
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

  /** Delete a document from the host */
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

  /** Leave current document */
  leaveDocument(): void {
    this.currentDocId = null;
  }

  // ============ Authentication ============

  /**
   * Login to the host server with username and password.
   * This is used when the client doesn't have a local user store.
   * On success, the returned token can be stored for future connections.
   */
  async loginWithCredentials(
    username: string,
    password: string
  ): Promise<{ success: boolean; token?: string; tokenExpiresAt?: number; userId?: string; username?: string; error?: string }> {
    return new Promise((resolve) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      // Set flag to prevent handleAuthResponse from also calling onAuthenticated
      this.pendingLoginRequest = true;

      // Set up one-time handler for auth response
      const handleAuth = (event: MessageEvent) => {
        const data = event.data as ArrayBuffer;
        const msgType = decodeMessageType(data);

        if (msgType === MESSAGE_AUTH_RESPONSE) {
          // Clear the flag so handleAuthResponse knows we've handled it
          this.pendingLoginRequest = false;

          try {
            const response = decodePayload<AuthResponse>(data);
            console.log('[DocumentSyncProvider] Login response:', response.success ? 'success' : 'failed', response.error || '');

            if (response.success) {
              // Update client state
              this.setStatus('authenticated');
              this.options.onAuthenticated(true, response.userId, response.username);

              // Store the token for future use
              if (response.token) {
                this.options.token = response.token;
              }
            }

            // Build response, only including defined values
            const result: {
              success: boolean;
              token?: string;
              tokenExpiresAt?: number;
              userId?: string;
              username?: string;
              error?: string;
            } = { success: response.success };
            if (response.token) result.token = response.token;
            if (response.tokenExpiresAt) result.tokenExpiresAt = response.tokenExpiresAt;
            if (response.userId) result.userId = response.userId;
            if (response.username) result.username = response.username;
            if (response.error) result.error = response.error;
            resolve(result);
          } catch (e) {
            console.error('[DocumentSyncProvider] Failed to parse login response:', e);
            resolve({ success: false, error: 'Failed to parse response' });
          }

          // Remove the listener after handling
          this.ws?.removeEventListener('message', handleAuth);
        }
      };

      // Add temporary message handler
      this.ws.addEventListener('message', handleAuth);

      // Set timeout
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handleAuth);
        resolve({ success: false, error: 'Login timeout' });
      }, this.options.requestTimeout);

      // Send login request
      const request: AuthLoginRequest = { username, password };
      const data = encodeMessage(MESSAGE_AUTH_LOGIN, request);
      this.ws.send(data);

      // Clear timeout on resolve
      const originalResolve = resolve;
      (resolve as (value: unknown) => void) = (value: unknown) => {
        clearTimeout(timeout);
        originalResolve(value as { success: boolean; token?: string; tokenExpiresAt?: number; userId?: string; username?: string; error?: string });
      };
    });
  }

  // ============ Event Subscriptions ============

  /** Subscribe to document events (created, updated, deleted) */
  onDocumentEvent(callback: (event: DocEvent) => void): () => void {
    this.docEventCallbacks.add(callback);
    return () => this.docEventCallbacks.delete(callback);
  }

  // ============ Private Methods ============

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;
    this.options.onStatusChange(status, error);
  }

  private handleOpen = (): void => {
    console.log('[DocumentSyncProvider] WebSocket opened');
    this.setStatus('connected');
    this.reconnectAttempts = 0;

    // Send auth message if token provided
    if (this.options.token) {
      console.log('[DocumentSyncProvider] Sending auth token');
      this.sendAuth(this.options.token);
    } else {
      console.log('[DocumentSyncProvider] No token provided, skipping auth');
    }

    // Rejoin document if we were on one
    if (this.currentDocId) {
      this.joinDocument(this.currentDocId);
    }
  };

  private handleMessage = (event: MessageEvent): void => {
    const data = event.data as ArrayBuffer;
    const msgType = decodeMessageType(data);

    if (msgType === null) {
      return;
    }

    switch (msgType) {
      case MESSAGE_AUTH_RESPONSE:
        this.handleAuthResponse(data);
        break;
      case MESSAGE_DOC_LIST:
        this.handleResponse<DocListResponse>(data);
        break;
      case MESSAGE_DOC_GET:
        this.handleResponse<DocGetResponse>(data);
        break;
      case MESSAGE_DOC_SAVE:
        this.handleResponse<DocSaveResponse>(data);
        break;
      case MESSAGE_DOC_DELETE:
        this.handleResponse<DocDeleteResponse>(data);
        break;
      case MESSAGE_DOC_EVENT:
        this.handleDocEvent(data);
        break;
      default:
        // Ignore other message types (handled by SyncProvider)
        break;
    }
  };

  private handleClose = (event: CloseEvent): void => {
    console.log('[DocumentSyncProvider] WebSocket closed, code:', event.code, 'reason:', event.reason || '(none)');
    this.ws = null;

    if (this.status !== 'disconnected') {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  };

  private handleError = (event: Event): void => {
    console.error('[DocumentSyncProvider] WebSocket error:', event);
    this.setStatus('error', 'WebSocket error');
  };

  private sendAuth(token: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const data = encodeMessage(MESSAGE_AUTH, token);
    this.ws.send(data);
  }

  private handleAuthResponse(data: ArrayBuffer): void {
    // If a login request is pending, let loginWithCredentials handle the response
    // This prevents double onAuthenticated calls
    if (this.pendingLoginRequest) {
      return;
    }

    try {
      const response = decodePayload<AuthResponse>(data);
      console.log('[DocumentSyncProvider] Auth response:', response.success ? 'success' : 'failed', response.error || '');

      if (response.success) {
        this.setStatus('authenticated');
        this.options.onAuthenticated(true, response.userId, response.username);
      } else {
        this.setStatus('error', response.error ?? 'Authentication failed');
        this.options.onAuthenticated(false);
      }
    } catch (e) {
      console.error('[DocumentSyncProvider] Failed to parse auth response:', e);
    }
  }

  private handleResponse<T extends { requestId: string }>(data: ArrayBuffer): void {
    try {
      const response = decodePayload<T>(data);
      const pending = this.pendingRequests.get(response.requestId);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.requestId);
        pending.resolve(response);
      }
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }

  private handleDocEvent(data: ArrayBuffer): void {
    try {
      const event = decodePayload<DocEvent>(data);
      this.docEventCallbacks.forEach((callback) => callback(event));
    } catch (e) {
      console.error('Failed to parse doc event:', e);
    }
  }

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

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.options.requestTimeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      // Send message
      const data = encodeMessage(msgType, payload);
      this.ws.send(data);
    });
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

export default DocumentSyncProvider;
