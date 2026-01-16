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

/** Error response */
export interface ErrorResponse {
  requestId?: string;
  error: string;
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