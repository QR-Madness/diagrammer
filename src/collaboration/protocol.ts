/**
 * Protocol message types and structures for team document synchronization.
 *
 * These constants and types must match the Rust backend definitions in
 * src-tauri/src/server/protocol.rs
 */

import type { DocumentMetadata, DiagramDocument } from '../types/Document';

// ============ Message Type Constants ============
// Must match MESSAGE_* constants in Rust

/** Yjs CRDT sync messages */
export const MESSAGE_SYNC = 0;

/** Awareness/presence messages */
export const MESSAGE_AWARENESS = 1;

/** Authentication (JWT token) */
export const MESSAGE_AUTH = 2;

/** Document list request/response */
export const MESSAGE_DOC_LIST = 3;

/** Document get request/response */
export const MESSAGE_DOC_GET = 4;

/** Document save request/response */
export const MESSAGE_DOC_SAVE = 5;

/** Document delete request/response */
export const MESSAGE_DOC_DELETE = 6;

/** Document event broadcast */
export const MESSAGE_DOC_EVENT = 7;

/** Error response */
export const MESSAGE_ERROR = 8;

/** Authentication response */
export const MESSAGE_AUTH_RESPONSE = 9;

/** Join document (for CRDT routing) */
export const MESSAGE_JOIN_DOC = 10;

/** Authentication with username/password (for client login to host) */
export const MESSAGE_AUTH_LOGIN = 11;

/** Document share/permissions update */
export const MESSAGE_DOC_SHARE = 12;

/** Document ownership transfer */
export const MESSAGE_DOC_TRANSFER = 13;

// ============ Request/Response Types ============

/** Authentication login request (username/password) */
export interface AuthLoginRequest {
  username: string;
  password: string;
}

/** Authentication response from server */
export interface AuthResponse {
  success: boolean;
  userId?: string;
  username?: string;
  role?: string;
  /** JWT token (returned on successful login) */
  token?: string;
  /** Token expiration timestamp in milliseconds */
  tokenExpiresAt?: number;
  error?: string;
}

/** Document list request */
export interface DocListRequest {
  requestId: string;
}

/** Document list response */
export interface DocListResponse {
  requestId: string;
  documents: DocumentMetadata[];
}

/** Document get request */
export interface DocGetRequest {
  requestId: string;
  docId: string;
}

/** Document get response */
export interface DocGetResponse {
  requestId: string;
  document?: DiagramDocument;
  error?: string;
}

/** Document save request */
export interface DocSaveRequest {
  requestId: string;
  document: DiagramDocument;
}

/** Document save response */
export interface DocSaveResponse {
  requestId: string;
  success: boolean;
  error?: string;
}

/** Document delete request */
export interface DocDeleteRequest {
  requestId: string;
  docId: string;
}

/** Document delete response */
export interface DocDeleteResponse {
  requestId: string;
  success: boolean;
  error?: string;
}

/** Document event types */
export type DocEventType = 'created' | 'updated' | 'deleted';

/** Document event broadcast message */
export interface DocEvent {
  eventType: DocEventType;
  docId: string;
  metadata?: DocumentMetadata;
  userId: string;
}

/** Join document request (for CRDT routing) */
export interface JoinDocRequest {
  docId: string;
}

/** Share entry for permission updates */
export interface ShareEntry {
  userId: string;
  userName: string;
  /** "viewer" | "editor" | "none" (none = revoke) */
  permission: string;
}

/** Document share request */
export interface DocShareRequest {
  requestId: string;
  docId: string;
  shares: ShareEntry[];
}

/** Document share response */
export interface DocShareResponse {
  requestId: string;
  success: boolean;
  error?: string;
}

/** Document ownership transfer request */
export interface DocTransferRequest {
  requestId: string;
  docId: string;
  newOwnerId: string;
  newOwnerName: string;
}

/** Document ownership transfer response */
export interface DocTransferResponse {
  requestId: string;
  success: boolean;
  error?: string;
}

/** Error response */
export interface ErrorResponse {
  requestId?: string;
  error: string;
  /** Error code for programmatic handling */
  code?: string;
}

// ============ Permission Error Codes ============
// Must match error_codes in Rust permissions.rs

/** User lacks required permission for operation */
export const ERR_ACCESS_DENIED = 'ERR_ACCESS_DENIED';
/** Document not found */
export const ERR_DOC_NOT_FOUND = 'ERR_DOC_NOT_FOUND';
/** User not authenticated */
export const ERR_NOT_AUTHENTICATED = 'ERR_NOT_AUTHENTICATED';
/** Permission level insufficient for delete operation */
export const ERR_DELETE_FORBIDDEN = 'ERR_DELETE_FORBIDDEN';
/** Permission level insufficient for edit operation */
export const ERR_EDIT_FORBIDDEN = 'ERR_EDIT_FORBIDDEN';
/** Permission level insufficient for view operation */
export const ERR_VIEW_FORBIDDEN = 'ERR_VIEW_FORBIDDEN';

/**
 * Check if an error string contains a specific error code.
 */
export function hasErrorCode(error: string, code: string): boolean {
  return error.startsWith(code);
}

/**
 * Check if an error is a permission error.
 */
export function isPermissionError(error: string): boolean {
  return hasErrorCode(error, ERR_ACCESS_DENIED) ||
         hasErrorCode(error, ERR_DELETE_FORBIDDEN) ||
         hasErrorCode(error, ERR_EDIT_FORBIDDEN) ||
         hasErrorCode(error, ERR_VIEW_FORBIDDEN) ||
         hasErrorCode(error, ERR_NOT_AUTHENTICATED);
}

// ============ Encoding/Decoding Helpers ============

/**
 * Encode a message with type prefix for sending over WebSocket.
 * Format: [msgType (1 byte)][JSON payload]
 */
export function encodeMessage<T>(msgType: number, payload: T): Uint8Array {
  const json = JSON.stringify(payload);
  const jsonBytes = new TextEncoder().encode(json);
  const data = new Uint8Array(1 + jsonBytes.length);
  data[0] = msgType;
  data.set(jsonBytes, 1);
  return data;
}

/**
 * Decode the message type from binary data.
 */
export function decodeMessageType(data: Uint8Array | ArrayBuffer): number | null {
  const arr = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  if (arr.length === 0) return null;
  const msgType = arr[0];
  return msgType !== undefined ? msgType : null;
}

/**
 * Decode the message payload (everything after the first byte).
 */
export function decodePayload<T>(data: Uint8Array | ArrayBuffer): T {
  const arr = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  if (arr.length < 2) {
    throw new Error('Message too short');
  }
  const json = new TextDecoder().decode(arr.slice(1));
  return JSON.parse(json) as T;
}

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============ Message Channel Classification ============

/**
 * Message channels for routing in UnifiedSyncProvider.
 * Groups related message types together.
 */
export type MessageChannel = 'crdt' | 'document' | 'auth';

/**
 * Get the channel for a message type.
 * Used by UnifiedSyncProvider to route messages to appropriate handlers.
 */
export function getMessageChannel(msgType: number): MessageChannel {
  switch (msgType) {
    case MESSAGE_SYNC:
    case MESSAGE_AWARENESS:
      return 'crdt';

    case MESSAGE_AUTH:
    case MESSAGE_AUTH_LOGIN:
    case MESSAGE_AUTH_RESPONSE:
      return 'auth';

    case MESSAGE_DOC_LIST:
    case MESSAGE_DOC_GET:
    case MESSAGE_DOC_SAVE:
    case MESSAGE_DOC_DELETE:
    case MESSAGE_DOC_EVENT:
    case MESSAGE_JOIN_DOC:
    case MESSAGE_ERROR:
      return 'document';

    default:
      // Unknown messages go to document channel by default
      return 'document';
  }
}

/**
 * Check if a message type is a CRDT sync message.
 */
export function isCRDTMessage(msgType: number): boolean {
  return msgType === MESSAGE_SYNC || msgType === MESSAGE_AWARENESS;
}

/**
 * Check if a message type is an auth message.
 */
export function isAuthMessage(msgType: number): boolean {
  return msgType === MESSAGE_AUTH ||
         msgType === MESSAGE_AUTH_LOGIN ||
         msgType === MESSAGE_AUTH_RESPONSE;
}

/**
 * Check if a message type is a document operation message.
 */
export function isDocumentMessage(msgType: number): boolean {
  return msgType === MESSAGE_DOC_LIST ||
         msgType === MESSAGE_DOC_GET ||
         msgType === MESSAGE_DOC_SAVE ||
         msgType === MESSAGE_DOC_DELETE ||
         msgType === MESSAGE_DOC_EVENT ||
         msgType === MESSAGE_JOIN_DOC ||
         msgType === MESSAGE_ERROR;
}

/**
 * Check if a message type expects a response (request/response pattern).
 */
export function isRequestMessage(msgType: number): boolean {
  return msgType === MESSAGE_DOC_LIST ||
         msgType === MESSAGE_DOC_GET ||
         msgType === MESSAGE_DOC_SAVE ||
         msgType === MESSAGE_DOC_DELETE ||
         msgType === MESSAGE_AUTH_LOGIN;
}

/**
 * Get human-readable name for a message type (for debugging).
 */
export function getMessageTypeName(msgType: number): string {
  switch (msgType) {
    case MESSAGE_SYNC: return 'SYNC';
    case MESSAGE_AWARENESS: return 'AWARENESS';
    case MESSAGE_AUTH: return 'AUTH';
    case MESSAGE_DOC_LIST: return 'DOC_LIST';
    case MESSAGE_DOC_GET: return 'DOC_GET';
    case MESSAGE_DOC_SAVE: return 'DOC_SAVE';
    case MESSAGE_DOC_DELETE: return 'DOC_DELETE';
    case MESSAGE_DOC_EVENT: return 'DOC_EVENT';
    case MESSAGE_ERROR: return 'ERROR';
    case MESSAGE_AUTH_RESPONSE: return 'AUTH_RESPONSE';
    case MESSAGE_JOIN_DOC: return 'JOIN_DOC';
    case MESSAGE_AUTH_LOGIN: return 'AUTH_LOGIN';
    default: return `UNKNOWN(${msgType})`;
  }
}