/**
 * Blob Sync Service
 *
 * HTTP-based blob synchronization for embedded files in collaborative documents.
 * Uploads blobs to server before document save, downloads missing blobs after
 * document load.
 *
 * Features:
 * - HTTP transport (separate from WebSocket document sync)
 * - Retry with exponential backoff
 * - Progress tracking
 * - Integration with local BlobStorage
 *
 * Phase 17.5 Collaboration Support
 */

import type { DiagramDocument } from '../types/Document';
import type { Shape, FileShape } from '../shapes/Shape';
import { BlobStorage } from '../storage/BlobStorage';

// ============ Types ============

/** Progress state for blob sync operations */
export interface BlobSyncProgress {
  /** Current phase of sync */
  phase: 'checking' | 'uploading' | 'downloading';
  /** Current item being processed */
  current: number;
  /** Total items to process */
  total: number;
  /** Hash of current blob being processed */
  currentBlobHash?: string;
  /** Bytes transferred so far for current blob */
  bytesTransferred?: number;
  /** Total bytes of current blob */
  bytesTotal?: number;
}

/** Options for BlobSyncService */
export interface BlobSyncServiceOptions {
  /** Server base URL (e.g., http://192.168.1.100:9876) - no trailing slash */
  serverUrl: string;
  /** JWT token for authentication */
  token: string;
  /** Progress callback */
  onProgress?: ((progress: BlobSyncProgress) => void) | undefined;
  /** Max retry attempts (default: 5) */
  maxRetries?: number | undefined;
  /** Initial retry delay in ms (default: 1000) */
  initialRetryDelay?: number | undefined;
  /** Max retry delay in ms (default: 30000) */
  maxRetryDelay?: number | undefined;
}

/** Result of a blob existence check */
interface BlobExistsResult {
  exists: boolean;
  size?: number | undefined;
  mimeType?: string | undefined;
}

/** Result of a batch sync operation */
export interface BlobSyncResult {
  /** Total blobs processed */
  total: number;
  /** Blobs successfully synced */
  success: number;
  /** Blobs that failed */
  failed: number;
  /** Error messages for failed blobs */
  errors: Map<string, string>;
}

// ============ BlobSyncService ============

/**
 * Service for synchronizing blobs between client and server via HTTP.
 *
 * Usage:
 * ```typescript
 * const service = new BlobSyncService({
 *   serverUrl: 'http://192.168.1.100:9876',
 *   token: 'jwt-token',
 *   onProgress: (p) => console.log(`${p.phase}: ${p.current}/${p.total}`),
 * });
 *
 * // Sync blobs for a document (upload missing to server, download missing locally)
 * await service.syncBlobsForDocument(document);
 * ```
 */
export class BlobSyncService {
  private serverUrl: string;
  private token: string;
  private onProgress: ((progress: BlobSyncProgress) => void) | undefined;
  private maxRetries: number;
  private initialRetryDelay: number;
  private maxRetryDelay: number;
  private blobStorage: BlobStorage;

  constructor(options: BlobSyncServiceOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = options.token;
    this.onProgress = options.onProgress ?? undefined;
    this.maxRetries = options.maxRetries ?? 5;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.maxRetryDelay = options.maxRetryDelay ?? 30000;
    this.blobStorage = BlobStorage.getInstance();
  }

  /**
   * Update the JWT token (e.g., after refresh).
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Check if a blob exists on the server.
   */
  async checkBlobExists(hash: string): Promise<BlobExistsResult> {
    const url = `${this.serverUrl}/api/blobs/${hash}`;

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (response.status === 204) {
      return {
        exists: true,
        size: parseInt(response.headers.get('Content-Length') || '0', 10),
        mimeType: response.headers.get('Content-Type') || undefined,
      };
    }

    if (response.status === 404) {
      return { exists: false };
    }

    if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or expired token');
    }

    throw new Error(`Unexpected response: ${response.status}`);
  }

  /**
   * Upload a blob to the server.
   */
  async uploadBlob(hash: string, blob: Blob): Promise<void> {
    const url = `${this.serverUrl}/api/blobs/${hash}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': blob.type || 'application/octet-stream',
      },
      body: blob,
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 400 && text.includes('Hash mismatch')) {
        throw new Error(`Hash mismatch: blob content doesn't match hash ${hash}`);
      }
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid or expired token');
      }
      throw new Error(`Upload failed: ${response.status} ${text}`);
    }
  }

  /**
   * Download a blob from the server.
   */
  async downloadBlob(hash: string): Promise<Blob> {
    const url = `${this.serverUrl}/api/blobs/${hash}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Blob not found: ${hash}`);
      }
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid or expired token');
      }
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    return blob;
  }

  /**
   * Ensure all blobs referenced by a document are uploaded to the server.
   *
   * Call this before saving a document to ensure blobs are available.
   */
  async ensureBlobsUploaded(hashes: string[]): Promise<BlobSyncResult> {
    const result: BlobSyncResult = {
      total: hashes.length,
      success: 0,
      failed: 0,
      errors: new Map(),
    };

    if (hashes.length === 0) return result;

    // First, check which blobs need uploading
    this.reportProgress({ phase: 'checking', current: 0, total: hashes.length });

    const toUpload: string[] = [];
    for (let i = 0; i < hashes.length; i++) {
      const hash = hashes[i]!;
      this.reportProgress({
        phase: 'checking',
        current: i + 1,
        total: hashes.length,
        currentBlobHash: hash,
      });

      try {
        const { exists } = await this.checkBlobExists(hash);
        if (!exists) {
          toUpload.push(hash);
        } else {
          result.success++;
        }
      } catch (error) {
        // If check fails, try to upload anyway
        toUpload.push(hash);
      }
    }

    // Upload missing blobs
    if (toUpload.length > 0) {
      this.reportProgress({ phase: 'uploading', current: 0, total: toUpload.length });

      for (let i = 0; i < toUpload.length; i++) {
        const hash = toUpload[i]!;
        this.reportProgress({
          phase: 'uploading',
          current: i + 1,
          total: toUpload.length,
          currentBlobHash: hash,
        });

        try {
          // Load blob from local storage
          const blob = await this.blobStorage.loadBlob(hash);
          if (!blob) {
            result.failed++;
            result.errors.set(hash, 'Blob not found in local storage');
            continue;
          }

          // Upload to server
          await this.uploadBlob(hash, blob);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.set(hash, error instanceof Error ? error.message : String(error));
        }
      }
    }

    return result;
  }

  /**
   * Download missing blobs from the server to local storage.
   *
   * Call this after loading a document to ensure all blobs are available locally.
   */
  async downloadMissingBlobs(hashes: string[]): Promise<BlobSyncResult> {
    const result: BlobSyncResult = {
      total: hashes.length,
      success: 0,
      failed: 0,
      errors: new Map(),
    };

    if (hashes.length === 0) return result;

    // Check which blobs are missing locally
    this.reportProgress({ phase: 'checking', current: 0, total: hashes.length });

    const toDownload: string[] = [];
    for (let i = 0; i < hashes.length; i++) {
      const hash = hashes[i]!;
      this.reportProgress({
        phase: 'checking',
        current: i + 1,
        total: hashes.length,
        currentBlobHash: hash,
      });

      const localBlob = await this.blobStorage.loadBlob(hash);
      if (!localBlob) {
        toDownload.push(hash);
      } else {
        result.success++;
      }
    }

    // Download missing blobs
    if (toDownload.length > 0) {
      this.reportProgress({ phase: 'downloading', current: 0, total: toDownload.length });

      for (let i = 0; i < toDownload.length; i++) {
        const hash = toDownload[i]!;
        this.reportProgress({
          phase: 'downloading',
          current: i + 1,
          total: toDownload.length,
          currentBlobHash: hash,
        });

        try {
          // Download from server
          const blob = await this.downloadBlob(hash);

          // Save to local storage
          // The blob ID should match the hash since we're using content-addressed storage
          await this.blobStorage.saveBlob(blob, hash);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.set(hash, error instanceof Error ? error.message : String(error));
        }
      }
    }

    return result;
  }

  /**
   * Sync all blobs for a document.
   *
   * This is a convenience method that:
   * 1. Extracts blob references from the document
   * 2. Uploads any blobs that exist locally but not on server
   * 3. Downloads any blobs that exist on server but not locally
   */
  async syncBlobsForDocument(document: DiagramDocument): Promise<BlobSyncResult> {
    const blobHashes = this.extractBlobReferences(document);

    if (blobHashes.length === 0) {
      return { total: 0, success: 0, failed: 0, errors: new Map() };
    }

    // First upload local blobs to server
    const uploadResult = await this.ensureBlobsUploaded(blobHashes);

    // Then download any missing from server
    const downloadResult = await this.downloadMissingBlobs(blobHashes);

    // Combine results
    return {
      total: blobHashes.length,
      success: Math.max(uploadResult.success, downloadResult.success),
      failed: Math.min(uploadResult.failed, downloadResult.failed),
      errors: new Map([...uploadResult.errors, ...downloadResult.errors]),
    };
  }

  /**
   * Extract blob references from a document.
   * Scans all pages for FileShape.blobRef fields.
   */
  extractBlobReferences(document: DiagramDocument): string[] {
    const hashes = new Set<string>();

    // Scan all pages
    for (const page of Object.values(document.pages)) {
      for (const shape of Object.values(page.shapes)) {
        if (this.isFileShape(shape) && shape.blobRef) {
          hashes.add(shape.blobRef);
        }
      }
    }

    return Array.from(hashes);
  }

  /**
   * Type guard for FileShape.
   */
  private isFileShape(shape: Shape): shape is FileShape {
    return shape.type === 'file';
  }

  /**
   * Report progress to callback.
   */
  private reportProgress(progress: BlobSyncProgress): void {
    this.onProgress?.(progress);
  }

  /**
   * Fetch with retry and exponential backoff.
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (4xx) except rate limiting
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      // Retry server errors (5xx) and rate limiting
      if (response.status >= 500 || response.status === 429) {
        if (attempt < this.maxRetries) {
          await this.delay(this.getRetryDelay(attempt));
          return this.fetchWithRetry(url, options, attempt + 1);
        }
      }

      return response;
    } catch (error) {
      // Network errors - retry
      if (attempt < this.maxRetries) {
        await this.delay(this.getRetryDelay(attempt));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter.
   */
  private getRetryDelay(attempt: number): number {
    const exponentialDelay = this.initialRetryDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.maxRetryDelay);
    // Add ±10% jitter
    const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Delay helper.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
