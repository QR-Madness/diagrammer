import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDocumentVersion,
  setDocumentVersion,
  initializeVersion,
  incrementLocalVersion,
  confirmSave,
  hasUnsavedChanges,
  isVersionStale,
  clearDocumentVersion,
  clearAllVersions,
  createVersionConflict,
  canSaveWithVersion,
  getVersionSummary,
  getResolutionDescription,
  canAutoMerge,
  VersionConflictError,
  InvalidVersionError,
  type DocumentVersion,
  type VersionConflict,
} from './VersionConflict';
import type { DiagramDocument } from './Document';

// Helper to create test document
function createTestDocument(id: string, name: string): DiagramDocument {
  return {
    id,
    name,
    pages: {},
    pageOrder: ['page-1'],
    activePageId: 'page-1',
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    version: 1,
  };
}

describe('VersionConflict', () => {
  beforeEach(() => {
    clearAllVersions();
  });

  describe('Version tracking store', () => {
    it('initializes version tracking for a document', () => {
      const version = initializeVersion('doc-1', 5);

      expect(version.serverVersion).toBe(5);
      expect(version.localVersion).toBe(5);
      expect(version.lastSyncedAt).toBeDefined();
    });

    it('gets and sets document versions', () => {
      const version: DocumentVersion = {
        serverVersion: 3,
        localVersion: 4,
        lastSyncedAt: Date.now(),
      };

      setDocumentVersion('doc-1', version);
      const retrieved = getDocumentVersion('doc-1');

      expect(retrieved).toEqual(version);
    });

    it('returns undefined for unknown documents', () => {
      expect(getDocumentVersion('unknown')).toBeUndefined();
    });

    it('increments local version', () => {
      initializeVersion('doc-1', 1);

      const newVersion = incrementLocalVersion('doc-1');

      expect(newVersion).toBe(2);
      expect(getDocumentVersion('doc-1')?.localVersion).toBe(2);
      expect(getDocumentVersion('doc-1')?.serverVersion).toBe(1);
    });

    it('initializes version on increment if not tracked', () => {
      const newVersion = incrementLocalVersion('doc-new');

      expect(newVersion).toBe(1);
      expect(getDocumentVersion('doc-new')).toBeDefined();
    });

    it('confirms save and updates server version', () => {
      initializeVersion('doc-1', 1);
      incrementLocalVersion('doc-1');
      incrementLocalVersion('doc-1');

      confirmSave('doc-1', 3);

      const version = getDocumentVersion('doc-1');
      expect(version?.serverVersion).toBe(3);
      expect(version?.localVersion).toBe(3);
      expect(version?.lastSyncedAt).toBeDefined();
    });

    it('confirms save with etag', () => {
      initializeVersion('doc-1', 1);
      confirmSave('doc-1', 2, 'abc123');

      const version = getDocumentVersion('doc-1');
      expect(version?.etag).toBe('abc123');
    });

    it('clears document version', () => {
      initializeVersion('doc-1', 1);
      clearDocumentVersion('doc-1');

      expect(getDocumentVersion('doc-1')).toBeUndefined();
    });

    it('clears all versions', () => {
      initializeVersion('doc-1', 1);
      initializeVersion('doc-2', 2);
      clearAllVersions();

      expect(getDocumentVersion('doc-1')).toBeUndefined();
      expect(getDocumentVersion('doc-2')).toBeUndefined();
    });
  });

  describe('Version check utilities', () => {
    it('detects unsaved changes', () => {
      initializeVersion('doc-1', 1);
      expect(hasUnsavedChanges('doc-1')).toBe(false);

      incrementLocalVersion('doc-1');
      expect(hasUnsavedChanges('doc-1')).toBe(true);

      confirmSave('doc-1', 2);
      expect(hasUnsavedChanges('doc-1')).toBe(false);
    });

    it('returns false for unsaved changes on unknown doc', () => {
      expect(hasUnsavedChanges('unknown')).toBe(false);
    });

    it('detects stale version', () => {
      initializeVersion('doc-1', 5);

      expect(isVersionStale('doc-1', 5)).toBe(false);
      expect(isVersionStale('doc-1', 6)).toBe(true);
      expect(isVersionStale('doc-1', 4)).toBe(false);
    });

    it('returns false for stale check on unknown doc', () => {
      expect(isVersionStale('unknown', 10)).toBe(false);
    });

    it('checks if save can proceed', () => {
      initializeVersion('doc-1', 5);

      expect(canSaveWithVersion('doc-1', 5)).toBe(true);
      expect(canSaveWithVersion('doc-1', 6)).toBe(false);
      expect(canSaveWithVersion('doc-1', 4)).toBe(false);
    });

    it('allows save for untracked documents', () => {
      expect(canSaveWithVersion('new-doc', 1)).toBe(true);
    });
  });

  describe('Version conflict creation', () => {
    it('creates conflict object', () => {
      const localDoc = createTestDocument('doc-1', 'Local Version');
      const serverDoc = createTestDocument('doc-1', 'Server Version');

      const conflict = createVersionConflict(localDoc, serverDoc, 3, 5);

      expect(conflict.documentId).toBe('doc-1');
      expect(conflict.localDocument).toBe(localDoc);
      expect(conflict.serverDocument).toBe(serverDoc);
      expect(conflict.localVersion).toBe(3);
      expect(conflict.serverVersion).toBe(5);
      expect(conflict.detectedAt).toBeDefined();
    });
  });

  describe('Version summary', () => {
    it('returns summary for tracked document', () => {
      initializeVersion('doc-1', 5);
      const summary = getVersionSummary('doc-1');

      expect(summary).toContain('doc-1');
      expect(summary).toContain('local=5');
      expect(summary).toContain('server=5');
    });

    it('shows dirty state in summary', () => {
      initializeVersion('doc-1', 5);
      incrementLocalVersion('doc-1');
      const summary = getVersionSummary('doc-1');

      expect(summary).toContain('(dirty)');
    });

    it('returns not tracked for unknown doc', () => {
      const summary = getVersionSummary('unknown');
      expect(summary).toContain('not tracked');
    });
  });

  describe('Resolution descriptions', () => {
    it('provides descriptions for all resolutions', () => {
      expect(getResolutionDescription('overwrite')).toContain('Replace');
      expect(getResolutionDescription('reload')).toContain('Discard');
      expect(getResolutionDescription('merge')).toContain('combine');
      expect(getResolutionDescription('save-as-copy')).toContain('new document');
      expect(getResolutionDescription('cancel')).toContain('Cancel');
    });
  });

  describe('Auto merge check', () => {
    it('returns false (not implemented)', () => {
      const localDoc = createTestDocument('doc-1', 'Local');
      const serverDoc = createTestDocument('doc-1', 'Server');
      const conflict = createVersionConflict(localDoc, serverDoc, 1, 2);

      expect(canAutoMerge(conflict)).toBe(false);
    });
  });
});

describe('Error classes', () => {
  describe('VersionConflictError', () => {
    it('creates error with conflict info', () => {
      const localDoc = createTestDocument('doc-1', 'Local');
      const serverDoc = createTestDocument('doc-1', 'Server');
      const conflict = createVersionConflict(localDoc, serverDoc, 3, 5);

      const error = new VersionConflictError(conflict);

      expect(error.name).toBe('VersionConflictError');
      expect(error.message).toContain('doc-1');
      expect(error.message).toContain('3');
      expect(error.message).toContain('5');
      expect(error.conflict).toBe(conflict);
    });
  });

  describe('InvalidVersionError', () => {
    it('creates error with reason', () => {
      const error = new InvalidVersionError('doc-1', 'version is negative');

      expect(error.name).toBe('InvalidVersionError');
      expect(error.message).toContain('doc-1');
      expect(error.message).toContain('version is negative');
    });
  });
});
