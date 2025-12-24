/**
 * Type definitions for blob storage.
 */

/**
 * Metadata for a stored blob.
 * Stored separately from blob data for efficient querying.
 */
export interface BlobMetadata {
  /** SHA-256 hash of blob content (serves as unique ID) */
  id: string;
  /** MIME type (e.g., 'image/png', 'image/jpeg') */
  type: string;
  /** Size in bytes */
  size: number;
  /** Original filename */
  name: string;
  /** Timestamp when blob was first created */
  createdAt: number;
  /** Number of documents referencing this blob */
  usageCount: number;
}

/**
 * Statistics from garbage collection operation.
 */
export interface GCStats {
  /** Number of blobs deleted */
  blobsDeleted: number;
  /** Total bytes freed */
  bytesFreed: number;
  /** Duration of GC operation in milliseconds */
  durationMs: number;
}

/**
 * Storage usage statistics.
 */
export interface StorageStats {
  /** Bytes used */
  used: number;
  /** Bytes available (quota) */
  available: number;
  /** Percentage used (0-100) */
  percentUsed: number;
}

/**
 * Backend interface for pluggable blob storage implementations.
 * Enables future support for File System Access API.
 */
export interface BlobStorageBackend {
  /** Save a blob and return its ID */
  saveBlob(blob: Blob, name: string): Promise<string>;
  /** Load a blob by ID */
  loadBlob(id: string): Promise<Blob | null>;
  /** Delete a blob by ID */
  deleteBlob(id: string): Promise<void>;
  /** Get metadata for a blob */
  getBlobMetadata(id: string): Promise<BlobMetadata | null>;
  /** List all blob metadata */
  listAllBlobs(): Promise<BlobMetadata[]>;
  /** Get storage usage statistics */
  getStorageStats(): Promise<StorageStats>;
}

/**
 * Error thrown when IndexedDB quota is exceeded.
 */
export class QuotaExceededError extends Error {
  constructor(message: string = 'Storage quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Error thrown when a blob operation fails.
 */
export class BlobStorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'BlobStorageError';
  }
}
