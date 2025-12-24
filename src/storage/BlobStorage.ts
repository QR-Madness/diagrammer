import type { BlobMetadata, StorageStats } from './BlobTypes';
import { QuotaExceededError, BlobStorageError } from './BlobTypes';

/**
 * IndexedDB database name and version.
 */
const DB_NAME = 'diagrammer-blobs';
const DB_VERSION = 1;

/**
 * Object store names.
 */
const STORE_BLOBS = 'blobs';
const STORE_METADATA = 'blob_metadata';

/**
 * Blob storage implementation using IndexedDB.
 *
 * Features:
 * - Content-addressed storage (SHA-256 hash as ID)
 * - Automatic deduplication
 * - Reference counting for garbage collection
 * - Efficient metadata querying
 *
 * Usage:
 * ```typescript
 * const id = await blobStorage.saveBlob(blob, 'image.png');
 * const loaded = await blobStorage.loadBlob(id);
 * ```
 */
export class BlobStorage {
  private static instance: BlobStorage;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance of BlobStorage.
   */
  static getInstance(): BlobStorage {
    if (!BlobStorage.instance) {
      BlobStorage.instance = new BlobStorage();
    }
    return BlobStorage.instance;
  }

  /**
   * Save a blob to storage.
   *
   * Automatically handles:
   * - Content hashing (SHA-256)
   * - Deduplication (same content = same ID)
   * - Reference counting
   *
   * @param blob - Blob to save
   * @param name - Original filename
   * @returns Blob ID (SHA-256 hash)
   * @throws QuotaExceededError if storage quota is exceeded
   * @throws BlobStorageError if save operation fails
   */
  async saveBlob(blob: Blob, name: string): Promise<string> {
    await this.ensureDB();

    try {
      // Compute content hash
      const id = await this.computeHash(blob);

      // Check if blob already exists
      const existing = await this.getBlobMetadata(id);
      if (existing) {
        // Increment usage count
        await this.incrementUsageCount(id);
        return id;
      }

      // Save blob data
      await this.saveBlobData(id, blob);

      // Save metadata
      const metadata: BlobMetadata = {
        id,
        type: blob.type,
        size: blob.size,
        name,
        createdAt: Date.now(),
        usageCount: 1,
      };
      await this.saveBlobMetadata(metadata);

      return id;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new QuotaExceededError('Storage quota exceeded. Please delete unused images.');
      }
      throw new BlobStorageError('Failed to save blob', error as Error);
    }
  }

  /**
   * Load a blob from storage.
   *
   * @param id - Blob ID (SHA-256 hash)
   * @returns Blob or null if not found
   * @throws BlobStorageError if load operation fails
   */
  async loadBlob(id: string): Promise<Blob | null> {
    await this.ensureDB();

    try {
      return await new Promise<Blob | null>((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_BLOBS], 'readonly');
        const store = transaction.objectStore(STORE_BLOBS);
        const request = store.get(id);

        request.onsuccess = () => {
          const record = request.result;
          resolve(record ? record.data : null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load blob:', id, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Delete a blob from storage.
   *
   * WARNING: Does NOT check reference count. Use with caution.
   * Typically called by garbage collector, not directly.
   *
   * @param id - Blob ID to delete
   * @throws BlobStorageError if delete operation fails
   */
  async deleteBlob(id: string): Promise<void> {
    await this.ensureDB();

    try {
      // Delete blob data
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_BLOBS], 'readwrite');
        const store = transaction.objectStore(STORE_BLOBS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Delete metadata
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_METADATA], 'readwrite');
        const store = transaction.objectStore(STORE_METADATA);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      throw new BlobStorageError(`Failed to delete blob: ${id}`, error as Error);
    }
  }

  /**
   * Get metadata for a blob without loading blob data.
   * Useful for listing blobs and checking existence.
   *
   * @param id - Blob ID
   * @returns Metadata or null if not found
   */
  async getBlobMetadata(id: string): Promise<BlobMetadata | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_METADATA], 'readonly');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all blob metadata.
   * Does not load blob data (efficient for large collections).
   *
   * @returns Array of all blob metadata
   */
  async listAllBlobs(): Promise<BlobMetadata[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_METADATA], 'readonly');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage statistics.
   *
   * @returns Storage stats with used/available bytes and percentage
   */
  async getStorageStats(): Promise<StorageStats> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, available: 0, percentUsed: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentUsed = available > 0 ? (used / available) * 100 : 0;

      return { used, available, percentUsed };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { used: 0, available: 0, percentUsed: 0 };
    }
  }

  /**
   * Increment usage count for a blob.
   * Called when the same blob is uploaded multiple times.
   *
   * @param id - Blob ID
   */
  async incrementUsageCount(id: string): Promise<void> {
    const metadata = await this.getBlobMetadata(id);
    if (!metadata) return;

    metadata.usageCount++;
    await this.saveBlobMetadata(metadata);
  }

  /**
   * Decrement usage count for a blob.
   * Called when a document referencing the blob is deleted.
   *
   * @param id - Blob ID
   */
  async decrementUsageCount(id: string): Promise<void> {
    const metadata = await this.getBlobMetadata(id);
    if (!metadata) return;

    metadata.usageCount = Math.max(0, metadata.usageCount - 1);
    await this.saveBlobMetadata(metadata);
  }

  /**
   * Check if IndexedDB is supported in the current browser.
   *
   * @returns true if IndexedDB is available
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  }

  // Private methods

  /**
   * Ensure database is initialized.
   * Uses singleton pattern to avoid multiple initialization.
   */
  private async ensureDB(): Promise<void> {
    if (this.db) return;

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.initDB();
    await this.initPromise;
    this.initPromise = null;
  }

  /**
   * Initialize IndexedDB database.
   * Creates object stores and indexes on first run.
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create blobs object store
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
        }

        // Create blob_metadata object store with indexes
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          const metadataStore = db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
          metadataStore.createIndex('createdAt', 'createdAt', { unique: false });
          metadataStore.createIndex('usageCount', 'usageCount', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle database errors
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', event);
        };

        resolve();
      };

      request.onerror = () => {
        reject(new BlobStorageError('Failed to open IndexedDB', request.error as Error));
      };

      request.onblocked = () => {
        console.warn('IndexedDB blocked - close other tabs using this app');
      };
    });
  }

  /**
   * Compute SHA-256 hash of blob content.
   * Used as content-addressed ID for deduplication.
   *
   * @param blob - Blob to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private async computeHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Save blob data to IndexedDB.
   *
   * @param id - Blob ID
   * @param blob - Blob data
   */
  private async saveBlobData(id: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_BLOBS], 'readwrite');
      const store = transaction.objectStore(STORE_BLOBS);
      const request = store.put({ id, data: blob });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save blob metadata to IndexedDB.
   *
   * @param metadata - Blob metadata
   */
  private async saveBlobMetadata(metadata: BlobMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_METADATA], 'readwrite');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Singleton instance of BlobStorage.
 * Use this instance throughout the application.
 */
export const blobStorage = BlobStorage.getInstance();
