import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLocalStorageKeys } from './relayRename';

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
  has(key: string): boolean {
    return this.data.has(key);
  }
  get size(): number {
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
