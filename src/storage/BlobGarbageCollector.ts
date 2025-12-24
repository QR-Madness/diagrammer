import type { BlobStorage } from './BlobStorage';
import type { BlobMetadata, GCStats } from './BlobTypes';
import { usePersistenceStore } from '../store/persistenceStore';
import { loadDocumentFromStorage } from '../store/persistenceStore';

/**
 * Garbage collector for orphaned blobs.
 *
 * Identifies and deletes blobs that are no longer referenced by any document.
 * Uses mark-and-sweep algorithm:
 * 1. Scan all documents and collect referenced blob IDs (mark)
 * 2. Find blobs not in the reference set (orphans)
 * 3. Delete orphaned blobs (sweep)
 *
 * Usage:
 * ```typescript
 * const stats = await blobGC.collectGarbage();
 * console.log(`Freed ${stats.bytesFreed} bytes`);
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
   * @returns Statistics about the cleanup operation
   */
  async collectGarbage(): Promise<GCStats> {
    const startTime = Date.now();

    // Get all document references
    const referencedBlobIds = await this.getAllDocumentReferences();

    // Get all blobs in storage
    const allBlobs = await this.storage.listAllBlobs();

    // Find orphans
    const orphans = allBlobs.filter((blob) => !referencedBlobIds.has(blob.id));

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
   * @returns Array of orphaned blob metadata
   */
  async getOrphanedBlobs(): Promise<BlobMetadata[]> {
    const referencedBlobIds = await this.getAllDocumentReferences();
    const allBlobs = await this.storage.listAllBlobs();

    return allBlobs.filter((blob) => !referencedBlobIds.has(blob.id));
  }

  /**
   * Get total size of orphaned blobs in bytes.
   *
   * @returns Total bytes that can be freed
   */
  async getOrphanedSize(): Promise<number> {
    const orphans = await this.getOrphanedBlobs();
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
