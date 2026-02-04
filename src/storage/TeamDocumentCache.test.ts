/**
 * Team Document Cache Tests
 *
 * Tests for persistent offline caching of team documents.
 * Phase 14.9.2 - Offline Reliability
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TeamDocumentCache } from './TeamDocumentCache';
import type { DiagramDocument } from '../types/Document';

// Mock IndexedDB
const mockIDBData: Record<string, unknown> = {};
const mockIDBRequest = () => ({
  onerror: null as ((event: unknown) => void) | null,
  onsuccess: null as ((event: unknown) => void) | null,
  result: null as unknown,
  error: null as Error | null,
});

const mockObjectStore = {
  get: vi.fn((key: string) => {
    const req = mockIDBRequest();
    setTimeout(() => {
      req.result = mockIDBData[key] ?? null;
      req.onsuccess?.({});
    }, 0);
    return req;
  }),
  put: vi.fn((value: { id: string }) => {
    const req = mockIDBRequest();
    setTimeout(() => {
      mockIDBData[value.id] = value;
      req.onsuccess?.({});
    }, 0);
    return req;
  }),
  delete: vi.fn((key: string) => {
    const req = mockIDBRequest();
    setTimeout(() => {
      delete mockIDBData[key];
      req.onsuccess?.({});
    }, 0);
    return req;
  }),
  getAll: vi.fn(() => {
    const req = mockIDBRequest();
    setTimeout(() => {
      req.result = Object.values(mockIDBData);
      req.onsuccess?.({});
    }, 0);
    return req;
  }),
  clear: vi.fn(() => {
    const req = mockIDBRequest();
    setTimeout(() => {
      for (const key of Object.keys(mockIDBData)) {
        delete mockIDBData[key];
      }
      req.onsuccess?.({});
    }, 0);
    return req;
  }),
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
};

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: {
    contains: vi.fn(() => true),
  },
  createObjectStore: vi.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

// Setup mocks
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: vi.fn(() => {
      const req = mockIDBRequest();
      setTimeout(() => {
        req.result = mockDB;
        req.onsuccess?.({});
      }, 0);
      return req;
    }),
  },
});

// ============ Test Fixtures ============

function createTestDocument(id: string, overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    id,
    name: `Test Document ${id}`,
    pages: {},
    pageOrder: ['page-1'],
    activePageId: 'page-1',
    createdAt: Date.now() - 10000,
    modifiedAt: Date.now(),
    isTeamDocument: true,
    ...overrides,
  } as DiagramDocument;
}

// ============ Tests ============

describe('TeamDocumentCache', () => {
  beforeEach(() => {
    // Clear mocks and data
    vi.clearAllMocks();
    localStorageMock.clear();
    for (const key of Object.keys(mockIDBData)) {
      delete mockIDBData[key];
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('put and get', () => {
    it('caches and retrieves a document', async () => {
      const doc = createTestDocument('doc-1');

      await TeamDocumentCache.put(doc, 'host-123');
      const cached = await TeamDocumentCache.get('doc-1');

      expect(cached).toEqual(doc);
    });

    it('returns null for uncached document', async () => {
      const cached = await TeamDocumentCache.get('non-existent');
      expect(cached).toBeNull();
    });

    it('stores metadata in localStorage', async () => {
      const doc = createTestDocument('doc-1', { serverVersion: 5 });

      await TeamDocumentCache.put(doc, 'host-123');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'diagrammer-team-cache-meta',
        expect.stringContaining('doc-1')
      );

      const meta = TeamDocumentCache.getMeta('doc-1');
      expect(meta).not.toBeNull();
      expect(meta?.id).toBe('doc-1');
      expect(meta?.hostId).toBe('host-123');
      expect(meta?.serverVersion).toBe(5);
    });
  });

  describe('has', () => {
    it('returns true for cached document', async () => {
      const doc = createTestDocument('doc-1');
      await TeamDocumentCache.put(doc, 'host-123');

      expect(TeamDocumentCache.has('doc-1')).toBe(true);
    });

    it('returns false for uncached document', () => {
      expect(TeamDocumentCache.has('non-existent')).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes a cached document', async () => {
      const doc = createTestDocument('doc-1');
      await TeamDocumentCache.put(doc, 'host-123');

      await TeamDocumentCache.remove('doc-1');

      expect(TeamDocumentCache.has('doc-1')).toBe(false);
      const cached = await TeamDocumentCache.get('doc-1');
      expect(cached).toBeNull();
    });
  });

  describe('getCachedIds', () => {
    it('returns all cached document IDs', async () => {
      await TeamDocumentCache.put(createTestDocument('doc-1'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-2'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-3'), 'host-456');

      const ids = TeamDocumentCache.getCachedIds();

      expect(ids).toContain('doc-1');
      expect(ids).toContain('doc-2');
      expect(ids).toContain('doc-3');
      expect(ids.length).toBe(3);
    });
  });

  describe('getCachedIdsForHost', () => {
    it('returns only IDs for specified host', async () => {
      await TeamDocumentCache.put(createTestDocument('doc-1'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-2'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-3'), 'host-456');

      const idsForHost123 = TeamDocumentCache.getCachedIdsForHost('host-123');
      const idsForHost456 = TeamDocumentCache.getCachedIdsForHost('host-456');

      expect(idsForHost123).toContain('doc-1');
      expect(idsForHost123).toContain('doc-2');
      expect(idsForHost123).not.toContain('doc-3');
      expect(idsForHost456).toContain('doc-3');
      expect(idsForHost456).not.toContain('doc-1');
    });
  });

  describe('clearForHost', () => {
    it('clears only documents for specified host', async () => {
      await TeamDocumentCache.put(createTestDocument('doc-1'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-2'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-3'), 'host-456');

      await TeamDocumentCache.clearForHost('host-123');

      expect(TeamDocumentCache.has('doc-1')).toBe(false);
      expect(TeamDocumentCache.has('doc-2')).toBe(false);
      expect(TeamDocumentCache.has('doc-3')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('clears all cached documents', async () => {
      await TeamDocumentCache.put(createTestDocument('doc-1'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-2'), 'host-456');

      await TeamDocumentCache.clearAll();

      expect(TeamDocumentCache.getCachedIds().length).toBe(0);
    });
  });

  describe('isStale', () => {
    it('returns true for uncached document', () => {
      expect(TeamDocumentCache.isStale('non-existent', 1)).toBe(true);
    });

    it('returns true when server version is higher', async () => {
      const doc = createTestDocument('doc-1', { serverVersion: 5 });
      await TeamDocumentCache.put(doc, 'host-123');

      expect(TeamDocumentCache.isStale('doc-1', 6)).toBe(true);
    });

    it('returns false when server version is same or lower', async () => {
      const doc = createTestDocument('doc-1', { serverVersion: 5 });
      await TeamDocumentCache.put(doc, 'host-123');

      expect(TeamDocumentCache.isStale('doc-1', 5)).toBe(false);
      expect(TeamDocumentCache.isStale('doc-1', 4)).toBe(false);
    });

    it('returns true when cached doc has no version', async () => {
      const doc = createTestDocument('doc-1');
      delete (doc as { serverVersion?: number }).serverVersion;
      await TeamDocumentCache.put(doc, 'host-123');

      expect(TeamDocumentCache.isStale('doc-1', 1)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', async () => {
      await TeamDocumentCache.put(createTestDocument('doc-1'), 'host-123');
      await TeamDocumentCache.put(createTestDocument('doc-2'), 'host-123');

      const stats = TeamDocumentCache.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.maxSize).toBe(50 * 1024 * 1024);
      expect(stats.maxEntries).toBe(50);
    });
  });

  describe('getTotalSize', () => {
    it('calculates total cache size', async () => {
      const doc1 = createTestDocument('doc-1');
      const doc2 = createTestDocument('doc-2');

      await TeamDocumentCache.put(doc1, 'host-123');
      await TeamDocumentCache.put(doc2, 'host-123');

      const totalSize = TeamDocumentCache.getTotalSize();
      const expectedSize = JSON.stringify(doc1).length + JSON.stringify(doc2).length;

      expect(totalSize).toBe(expectedSize);
    });
  });

  describe('preloadAll', () => {
    it('returns map of all cached documents', async () => {
      const doc1 = createTestDocument('doc-1');
      const doc2 = createTestDocument('doc-2');

      await TeamDocumentCache.put(doc1, 'host-123');
      await TeamDocumentCache.put(doc2, 'host-123');

      const preloaded = await TeamDocumentCache.preloadAll();

      expect(preloaded.size).toBe(2);
      expect(preloaded.get('doc-1')).toEqual(doc1);
      expect(preloaded.get('doc-2')).toEqual(doc2);
    });
  });
});
