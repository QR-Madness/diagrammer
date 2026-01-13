/**
 * Storage Backend Interface
 *
 * Defines an abstract interface for document storage operations.
 * Implementations can use localStorage, file system (Tauri), or remote storage.
 */

import { DiagramDocument } from '../types/Document';

/**
 * Storage backend type identifier
 */
export type StorageBackendType = 'localStorage' | 'fileSystem' | 'remote';

/**
 * Result of a storage operation
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Abstract interface for document storage backends.
 *
 * All methods are async to support both synchronous (localStorage)
 * and asynchronous (file system, remote) storage mechanisms.
 */
export interface StorageBackend {
  /**
   * Storage backend type identifier
   */
  readonly type: StorageBackendType;

  /**
   * Check if the backend is available/initialized
   */
  isAvailable(): Promise<boolean>;

  /**
   * Save a document to storage
   * @param doc - The document to save
   * @returns Result with success status
   */
  saveDocument(doc: DiagramDocument): Promise<StorageResult<void>>;

  /**
   * Load a document from storage
   * @param id - Document ID to load
   * @returns Result with the document or error
   */
  loadDocument(id: string): Promise<StorageResult<DiagramDocument>>;

  /**
   * Delete a document from storage
   * @param id - Document ID to delete
   * @returns Result with success status
   */
  deleteDocument(id: string): Promise<StorageResult<void>>;

  /**
   * Check if a document exists in storage
   * @param id - Document ID to check
   * @returns Result with boolean indicating existence
   */
  documentExists(id: string): Promise<StorageResult<boolean>>;

  /**
   * List all document IDs in storage
   * @returns Result with array of document IDs
   */
  listDocumentIds(): Promise<StorageResult<string[]>>;

  /**
   * Get storage location/path for a document (for display purposes)
   * @param id - Document ID
   * @returns Human-readable storage location
   */
  getStorageLocation(id: string): string;
}

/**
 * Configuration for storage backends
 */
export interface StorageBackendConfig {
  /**
   * For FileSystemBackend: Base directory for document storage
   */
  basePath?: string;

  /**
   * For RemoteBackend: Server URL
   */
  serverUrl?: string;

  /**
   * For RemoteBackend: Authentication token
   */
  authToken?: string;
}
