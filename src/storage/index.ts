/**
 * Storage Module Exports
 *
 * Re-exports all storage-related types and implementations.
 */

// Core interfaces
export type {
  StorageBackend,
  StorageBackendConfig,
  StorageBackendType,
  StorageResult,
} from './StorageBackend';

// Backend implementations
export {
  LocalStorageBackend,
  localStorageBackend,
} from './LocalStorageBackend';

export {
  FileSystemBackend,
  createFileSystemBackend,
} from './FileSystemBackend';

// Factory
export {
  StorageFactory,
  storageFactory,
  getStorageBackend,
} from './StorageFactory';
export type { StorageMode, StorageFactoryConfig } from './StorageFactory';

// Blob storage (existing)
export { blobStorage, BlobStorage } from './BlobStorage';
export type { BlobMetadata } from './BlobTypes';
