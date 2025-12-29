import type { BlobStorage } from './BlobStorage';
import type { BlobMetadata, GCStats } from './BlobTypes';
import { usePersistenceStore } from '../store/persistenceStore';
import { loadDocumentFromStorage } from '../store/persistenceStore';

/**
 * Options for garbage collection.
 */
export interface GCOptions {
  /** Include icons (SVG files) in garbage collection. Default: false */
  includeIcons?: boolean;
}

/**
 * Check if a blob is an icon (SVG file).
 */
function isIconBlob(blob: BlobMetadata): boolean {
  return blob.type === 'image/svg+xml';
}

/**
 * Garbage collector for orphaned blobs.
 *
 * Identifies and deletes blobs that are no longer referenced by any document.
 * Uses mark-and-sweep algorithm:
 * 1. Scan all documents and collect referenced blob IDs (mark)
 * 2. Find blobs not in the reference set (orphans)
 * 3. Delete orphaned blobs (sweep)
 *
 * By default, icons (SVG files) are preserved to avoid accidentally deleting
 * user-uploaded icons. Use `includeIcons: true` to also clean up unused icons.
 *
 * Usage:
 * ```typescript
 * // Clean images only (default)
 * const stats = await blobGC.collectGarbage();
 *
 * // Clean both images and icons
 * const stats = await blobGC.collectGarbage({ includeIcons: true });
 * ```
 */
export class BlobGarbageCollector {
  constructor(private storage: BlobStorage) {}

  /**
   * Collect garbage blobs not referenced by any document.
   *
   * This is a potentially expensive operation that scans all documents.
   * Run during idle time or when user explicitly requests cleanup.
   *
   * @param options - GC options (includeIcons defaults to false)
   * @returns Statistics about the cleanup operation
   */
  async collectGarbage(options: GCOptions = {}): Promise<GCStats> {
    const { includeIcons = false } = options;
    const startTime = Date.now();

    // Get all document references
    const referencedBlobIds = await this.getAllDocumentReferences();

    // Get all blobs in storage
    const allBlobs = await this.storage.listAllBlobs();

    // Find orphans (optionally excluding icons)
    const orphans = allBlobs.filter((blob) => {
      if (!referencedBlobIds.has(blob.id)) {
        // If not including icons, skip SVG files
        if (!includeIcons && isIconBlob(blob)) {
          return false;
        }
        return true;
      }
      return false;
    });

    // Delete orphans
    let bytesFreed = 0;
    for (const orphan of orphans) {
      try {
        await this.storage.deleteBlob(orphan.id);
        bytesFreed += orphan.size;
      } catch (error) {
        console.error('Failed to delete orphaned blob:', orphan.id, error);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      blobsDeleted: orphans.length,
      bytesFreed,
      durationMs,
    };
  }

  /**
   * Get list of orphaned blobs without deleting them.
   *
   * Useful for showing preview in Storage Manager UI before cleanup.
   *
   * @param options - GC options (includeIcons defaults to false)
   * @returns Array of orphaned blob metadata
   */
  async getOrphanedBlobs(options: GCOptions = {}): Promise<BlobMetadata[]> {
    const { includeIcons = false } = options;
    const referencedBlobIds = await this.getAllDocumentReferences();
    const allBlobs = await this.storage.listAllBlobs();

    return allBlobs.filter((blob) => {
      if (!referencedBlobIds.has(blob.id)) {
        if (!includeIcons && isIconBlob(blob)) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  /**
   * Get total size of orphaned blobs in bytes.
   *
   * @param options - GC options (includeIcons defaults to false)
   * @returns Total bytes that can be freed
   */
  async getOrphanedSize(options: GCOptions = {}): Promise<number> {
    const orphans = await this.getOrphanedBlobs(options);
    return orphans.reduce((total, blob) => total + blob.size, 0);
  }

  /**
   * Scan all documents and collect blob references.
   *
   * This reads all documents from localStorage and extracts their blobReferences arrays.
   *
   * @returns Set of all referenced blob IDs
   */
  private async getAllDocumentReferences(): Promise<Set<string>> {
    const references = new Set<string>();

    try {
      // Get all document IDs from persistence store
      const persistenceStore = usePersistenceStore.getState();
      const allDocuments = persistenceStore.getDocumentList();

      // Load each document and collect blob references
      for (const docMeta of allDocuments) {
        try {
          const doc = loadDocumentFromStorage(docMeta.id);
          if (doc?.blobReferences) {
            doc.blobReferences.forEach((id) => references.add(id));
          }
        } catch (error) {
          console.error('Failed to load document for GC:', docMeta.id, error);
          // Continue with other documents
        }
      }
    } catch (error) {
      console.error('Failed to get document references:', error);
    }

    return references;
  }
}
