import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLocalStorageKeys, migrateDocumentFieldNames } from './relayRename';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  has(key: string): boolean {
    return this.data.has(key);
  }
  get size(): number {
    return this.data.size;
  }
  get length(): number {
    return this.data.size;
  }
}

describe('migrateLocalStorageKeys (Phase 20.3 Slice B)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('is a no-op on a fresh install (no legacy keys present)', () => {
    const result = migrateLocalStorageKeys(storage);
    expect(result.migratedKeys).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(storage.size).toBe(0);
  });

  it('copies diagrammer-team to diagrammer-relay and removes the legacy key', () => {
    storage.setItem('diagrammer-team', '{"state":{"hostPort":9876}}');

    const result = migrateLocalStorageKeys(storage);

    expect(result.errors).toEqual([]);
    expect(result.migratedKeys).toContain('diagrammer-team -> diagrammer-relay');
    expect(storage.getItem('diagrammer-relay')).toBe('{"state":{"hostPort":9876}}');
    expect(storage.has('diagrammer-team')).toBe(false);
  });

  it('copies diagrammer-team-cache-meta to diagrammer-relay-cache-meta', () => {
    storage.setItem('diagrammer-team-cache-meta', '[{"id":"doc-1"}]');

    migrateLocalStorageKeys(storage);

    expect(storage.getItem('diagrammer-relay-cache-meta')).toBe('[{"id":"doc-1"}]');
    expect(storage.has('diagrammer-team-cache-meta')).toBe(false);
  });

  it('migrates both keys in one pass', () => {
    storage.setItem('diagrammer-team', 'A');
    storage.setItem('diagrammer-team-cache-meta', 'B');

    const result = migrateLocalStorageKeys(storage);

    expect(result.migratedKeys.length).toBe(2);
    expect(storage.getItem('diagrammer-relay')).toBe('A');
    expect(storage.getItem('diagrammer-relay-cache-meta')).toBe('B');
    expect(storage.has('diagrammer-team')).toBe(false);
    expect(storage.has('diagrammer-team-cache-meta')).toBe(false);
  });

  it('does not overwrite an existing v2 key when both exist (stale-legacy guard)', () => {
    storage.setItem('diagrammer-team', 'legacy-value');
    storage.setItem('diagrammer-relay', 'v2-value');

    const result = migrateLocalStorageKeys(storage);

    // New key untouched; legacy key still removed.
    expect(storage.getItem('diagrammer-relay')).toBe('v2-value');
    expect(storage.has('diagrammer-team')).toBe(false);
    // Not counted as a "migrated" pair since we didn't write.
    expect(result.migratedKeys).not.toContain('diagrammer-team -> diagrammer-relay');
  });

  it('is idempotent — running twice with no legacy keys is a no-op', () => {
    storage.setItem('diagrammer-team', 'X');
    migrateLocalStorageKeys(storage);

    const result = migrateLocalStorageKeys(storage);

    expect(result.migratedKeys).toEqual([]);
    expect(storage.getItem('diagrammer-relay')).toBe('X');
  });
});

describe('migrateDocumentFieldNames (Phase 20.3 protocol v2 rename)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('renames isTeamDocument to isRelayDocument on stored documents', () => {
    const legacy = {
      id: 'doc-1',
      name: 'Beta-era doc',
      isTeamDocument: true,
      pages: {},
    };
    storage.setItem('diagrammer-doc-doc-1', JSON.stringify(legacy));

    const result = migrateDocumentFieldNames(storage);

    expect(result.errors).toEqual([]);
    expect(result.renamedFields).toBe(1);
    const after = JSON.parse(storage.getItem('diagrammer-doc-doc-1')!);
    expect(after.isRelayDocument).toBe(true);
    expect(after.isTeamDocument).toBeUndefined();
    expect(after.name).toBe('Beta-era doc');
    expect(after.id).toBe('doc-1');
  });

  it('renames the field on every entry in the document index', () => {
    const index = [
      { id: 'a', name: 'A', isTeamDocument: true },
      { id: 'b', name: 'B', isTeamDocument: false },
      { id: 'c', name: 'C' },
    ];
    storage.setItem('diagrammer-documents', JSON.stringify(index));

    const result = migrateDocumentFieldNames(storage);

    expect(result.errors).toEqual([]);
    expect(result.renamedFields).toBe(1);
    const after = JSON.parse(storage.getItem('diagrammer-documents')!);
    expect(after[0].isRelayDocument).toBe(true);
    expect(after[1].isRelayDocument).toBe(false);
    expect(after[0].isTeamDocument).toBeUndefined();
    expect(after[2]).toEqual({ id: 'c', name: 'C' });
  });

  it('is idempotent — re-running on already-migrated data is a no-op', () => {
    storage.setItem('diagrammer-doc-x', JSON.stringify({ id: 'x', isRelayDocument: true }));

    const result = migrateDocumentFieldNames(storage);

    expect(result.renamedFields).toBe(0);
    expect(JSON.parse(storage.getItem('diagrammer-doc-x')!).isRelayDocument).toBe(true);
  });

  it('does not overwrite a new field if both happen to coexist', () => {
    storage.setItem(
      'diagrammer-doc-x',
      JSON.stringify({ id: 'x', isTeamDocument: false, isRelayDocument: true }),
    );

    migrateDocumentFieldNames(storage);

    const after = JSON.parse(storage.getItem('diagrammer-doc-x')!);
    expect(after.isRelayDocument).toBe(true);
    expect(after.isTeamDocument).toBeUndefined();
  });

  it('ignores keys outside the diagrammer-doc- prefix and index', () => {
    storage.setItem('something-else', JSON.stringify({ isTeamDocument: true }));

    const result = migrateDocumentFieldNames(storage);

    expect(result.renamedFields).toBe(0);
    expect(JSON.parse(storage.getItem('something-else')!).isTeamDocument).toBe(true);
  });

  it('records a parse error rather than throwing on malformed JSON', () => {
    storage.setItem('diagrammer-doc-bad', 'not json {');

    const result = migrateDocumentFieldNames(storage);

    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('diagrammer-doc-bad');
  });
});
