/**
 * BlobSyncService Tests
 *
 * Tests for HTTP-based blob synchronization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlobSyncService, type BlobSyncProgress } from './BlobSyncService';

// Mock BlobStorage
vi.mock('../storage/BlobStorage', () => ({
  BlobStorage: {
    getInstance: () => ({
      loadBlob: vi.fn(),
      saveBlob: vi.fn(),
      getBlobMetadata: vi.fn(),
    }),
  },
}));

describe('BlobSyncService', () => {
  let service: BlobSyncService;
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof fetch;
  const testServerUrl = 'http://localhost:9876';
  const testToken = 'test-jwt-token';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Save original fetch
    originalFetch = global.fetch;

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;

    // Create service
    service = new BlobSyncService({
      serverUrl: testServerUrl,
      token: testToken,
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('checkBlobExists', () => {
    it('returns exists: true when server returns 204', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 204,
        headers: new Headers({
          'Content-Length': '1024',
          'Content-Type': 'image/png',
        }),
      });

      const result = await service.checkBlobExists('abc123');

      expect(result.exists).toBe(true);
      expect(result.size).toBe(1024);
      expect(result.mimeType).toBe('image/png');

      expect(mockFetch).toHaveBeenCalledWith(
        `${testServerUrl}/api/blobs/abc123`,
        {
          method: 'HEAD',
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        }
      );
    });

    it('returns exists: false when server returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
        headers: new Headers(),
      });

      const result = await service.checkBlobExists('nonexistent');

      expect(result.exists).toBe(false);
    });

    it('throws on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        headers: new Headers(),
      });

      await expect(service.checkBlobExists('abc123')).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('uploadBlob', () => {
    it('uploads blob successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const blob = new Blob(['test content'], { type: 'text/plain' });
      await service.uploadBlob('abc123', blob);

      expect(mockFetch).toHaveBeenCalledWith(
        `${testServerUrl}/api/blobs/abc123`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`,
            'Content-Type': 'text/plain',
          }),
          body: blob,
        })
      );
    });

    it('throws on hash mismatch (400)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Hash mismatch: expected abc, got xyz'),
      });

      const blob = new Blob(['test content'], { type: 'text/plain' });
      await expect(service.uploadBlob('abc123', blob)).rejects.toThrow(
        'Hash mismatch'
      );
    });

    it('throws on unauthorized (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const blob = new Blob(['test content'], { type: 'text/plain' });
      await expect(service.uploadBlob('abc123', blob)).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('downloadBlob', () => {
    it('downloads blob successfully', async () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await service.downloadBlob('abc123');

      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledWith(
        `${testServerUrl}/api/blobs/abc123`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`,
          }),
        })
      );
    });

    it('throws on 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(service.downloadBlob('nonexistent')).rejects.toThrow(
        'Blob not found'
      );
    });
  });

  describe('extractBlobReferences', () => {
    it('extracts blobRef from FileShape', () => {
      const doc = {
        id: 'doc-1',
        name: 'Test',
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {
              'shape-1': {
                id: 'shape-1',
                type: 'file',
                blobRef: 'hash1',
                fileName: 'test.pdf',
              },
              'shape-2': {
                id: 'shape-2',
                type: 'rectangle',
                // No blobRef
              },
              'shape-3': {
                id: 'shape-3',
                type: 'file',
                blobRef: 'hash2',
                fileName: 'test2.pdf',
              },
            },
            shapeOrder: ['shape-1', 'shape-2', 'shape-3'],
            createdAt: 0,
            modifiedAt: 0,
          },
        },
        pageOrder: ['page-1'],
        activePageId: 'page-1',
        createdAt: 0,
        modifiedAt: 0,
        version: 1,
      };

      // @ts-expect-error - simplified document for testing
      const hashes = service.extractBlobReferences(doc);

      expect(hashes).toHaveLength(2);
      expect(hashes).toContain('hash1');
      expect(hashes).toContain('hash2');
    });

    it('returns empty array for document with no FileShapes', () => {
      const doc = {
        id: 'doc-1',
        name: 'Test',
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {
              'shape-1': {
                id: 'shape-1',
                type: 'rectangle',
              },
            },
            shapeOrder: ['shape-1'],
            createdAt: 0,
            modifiedAt: 0,
          },
        },
        pageOrder: ['page-1'],
        activePageId: 'page-1',
        createdAt: 0,
        modifiedAt: 0,
        version: 1,
      };

      // @ts-expect-error - simplified document for testing
      const hashes = service.extractBlobReferences(doc);

      expect(hashes).toHaveLength(0);
    });
  });

  describe('progress callback', () => {
    it('calls onProgress during operations', async () => {
      const progressCallbacks: BlobSyncProgress[] = [];
      const serviceWithProgress = new BlobSyncService({
        serverUrl: testServerUrl,
        token: testToken,
        onProgress: (p) => progressCallbacks.push({ ...p }),
      });

      // Mock check - blob doesn't exist
      mockFetch.mockResolvedValueOnce({
        status: 404,
        headers: new Headers(),
      });

      // Mock upload success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      // Mock BlobStorage
      const { BlobStorage } = await import('../storage/BlobStorage');
      const mockInstance = BlobStorage.getInstance();
      (mockInstance.loadBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Blob(['test'], { type: 'text/plain' })
      );

      await serviceWithProgress.ensureBlobsUploaded(['hash1']);

      // Should have progress for checking and uploading phases
      expect(progressCallbacks.some((p) => p.phase === 'checking')).toBe(true);
      expect(progressCallbacks.some((p) => p.phase === 'uploading')).toBe(true);
    });
  });

  describe('setToken', () => {
    it('updates the token', async () => {
      service.setToken('new-token');

      mockFetch.mockResolvedValueOnce({
        status: 204,
        headers: new Headers(),
      });

      await service.checkBlobExists('abc123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer new-token',
          }),
        })
      );
    });
  });

  describe('retry logic', () => {
    it('retries on 500 error', async () => {
      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(['test'])),
      });

      // Create service with short retry delay for testing
      const fastService = new BlobSyncService({
        serverUrl: testServerUrl,
        token: testToken,
        maxRetries: 3,
        initialRetryDelay: 10, // Very short for testing
      });

      const result = await fastService.downloadBlob('abc123');

      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 400 client error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(service.uploadBlob('abc123', new Blob(['test']))).rejects.toThrow();

      // Should only be called once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('URL handling', () => {
    it('handles URL with trailing slash', () => {
      const serviceWithSlash = new BlobSyncService({
        serverUrl: 'http://localhost:9876/',
        token: testToken,
      });

      mockFetch.mockResolvedValueOnce({
        status: 204,
        headers: new Headers(),
      });

      serviceWithSlash.checkBlobExists('abc123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/blobs/abc123',
        expect.any(Object)
      );
    });
  });
});
