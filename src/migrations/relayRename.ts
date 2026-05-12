/**
 * Slice B (Phase 20.3) storage-key migration.
 *
 * Renames persisted localStorage keys and drops the legacy IndexedDB
 * cache when the app boots into v2 for the first time. Idempotent —
 * safe to invoke on every launch.
 *
 * What moves:
 *   localStorage `diagrammer-team`             -> `diagrammer-relay`
 *   localStorage `diagrammer-team-cache-meta`  -> `diagrammer-relay-cache-meta`
 *   IndexedDB    `diagrammer-team-cache`       (dropped — cache rebuilds
 *                                                from the relay on first
 *                                                reconnect; cheaper than
 *                                                a cross-DB copy)
 *
 * Fresh installs read no legacy keys, so this function is a no-op.
 */

const RENAMES: ReadonlyArray<readonly [legacy: string, current: string]> = [
  ['diagrammer-team', 'diagrammer-relay'],
  ['diagrammer-team-cache-meta', 'diagrammer-relay-cache-meta'],
];

const LEGACY_IDB_NAME = 'diagrammer-team-cache';

/**
 * Migration result for telemetry / log inspection.
 */
export interface RelayRenameResult {
  migratedKeys: string[];
  droppedIdb: boolean;
  renamedFields: number;
  errors: string[];
}

/**
 * Run the Slice B rename migration against the provided storage. The
 * `storage` parameter is injectable for tests; defaults to
 * `window.localStorage` in production.
 */
export function migrateLocalStorageKeys(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
): { migratedKeys: string[]; errors: string[] } {
  const migratedKeys: string[] = [];
  const errors: string[] = [];

  for (const [legacy, current] of RENAMES) {
    try {
      const legacyValue = storage.getItem(legacy);
      if (legacyValue === null) continue;

      const currentValue = storage.getItem(current);
      if (currentValue === null) {
        // Only copy if the new key isn't already populated — prevents
        // overwriting a v2-era value with stale v1 data if both keys
        // somehow coexist.
        storage.setItem(current, legacyValue);
        migratedKeys.push(`${legacy} -> ${current}`);
      }

      storage.removeItem(legacy);
    } catch (err) {
      errors.push(`${legacy}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { migratedKeys, errors };
}

/**
 * Drop the legacy `diagrammer-team-cache` IndexedDB database. The cache
 * is rebuilt from the relay on first reconnect, so cross-DB record
 * copying is not worth the surface area. Returns true if a drop was
 * attempted (regardless of whether the DB existed).
 */
export async function dropLegacyRelayCacheDb(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;

  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(LEGACY_IDB_NAME);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    // `onblocked` fires when other tabs still hold the legacy DB open.
    // Treat as a no-op for this run; next launch will retry.
    req.onblocked = () => resolve(false);
  });
}

/**
 * Storage keys touched by the document-field rename below. Kept local
 * to avoid an import cycle with `src/types/Document.ts`.
 */
const DOCUMENT_PREFIX = 'diagrammer-doc-';
const DOCUMENT_INDEX_KEY = 'diagrammer-documents';

/**
 * Protocol v2 field rename: `isTeamDocument` → `isRelayDocument` on
 * every persisted document blob and on the document-index entries.
 * Idempotent — re-running is a no-op once the field has been migrated.
 *
 * Operates on raw JSON to avoid coupling the migration to the live
 * `DocumentMetadata` interface (which won't carry the legacy field
 * after this commit lands).
 */
export function migrateDocumentFieldNames(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'key' | 'length'> = localStorage,
): { renamedFields: number; errors: string[] } {
  let renamedFields = 0;
  const errors: string[] = [];

  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null) keys.push(k);
  }

  const rewriteIfNeeded = (
    key: string,
    transform: (parsed: unknown) => { value: unknown; changed: boolean },
  ): void => {
    const raw = storage.getItem(key);
    if (raw === null) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      const { value, changed } = transform(parsed);
      if (changed) {
        storage.setItem(key, JSON.stringify(value));
        renamedFields++;
      }
    } catch (err) {
      errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const renameOnObject = (obj: Record<string, unknown>): boolean => {
    if ('isTeamDocument' in obj) {
      if (!('isRelayDocument' in obj)) {
        obj['isRelayDocument'] = obj['isTeamDocument'];
      }
      delete obj['isTeamDocument'];
      return true;
    }
    return false;
  };

  for (const key of keys) {
    if (key.startsWith(DOCUMENT_PREFIX)) {
      rewriteIfNeeded(key, (parsed) => {
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const changed = renameOnObject(parsed as Record<string, unknown>);
          return { value: parsed, changed };
        }
        return { value: parsed, changed: false };
      });
    }
  }

  rewriteIfNeeded(DOCUMENT_INDEX_KEY, (parsed) => {
    if (!Array.isArray(parsed)) return { value: parsed, changed: false };
    let changed = false;
    for (const entry of parsed) {
      if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
        if (renameOnObject(entry as Record<string, unknown>)) changed = true;
      }
    }
    return { value: parsed, changed };
  });

  return { renamedFields, errors };
}

/**
 * Run both the localStorage and IndexedDB parts of the Slice B
 * migration plus the protocol-v2 field rename. Call once at app boot,
 * before any store hydrates from persisted state.
 */
export async function runRelayRenameMigration(): Promise<RelayRenameResult> {
  const { migratedKeys, errors: keyErrors } = migrateLocalStorageKeys();
  const { renamedFields, errors: fieldErrors } = migrateDocumentFieldNames();
  const droppedIdb = await dropLegacyRelayCacheDb();

  if (migratedKeys.length > 0) {
    console.info(
      '[relayRename] migrated legacy keys:',
      migratedKeys.join(', '),
    );
  }
  if (renamedFields > 0) {
    console.info(
      '[relayRename] renamed isTeamDocument → isRelayDocument on',
      renamedFields,
      'persisted document(s)',
    );
  }

  return {
    migratedKeys,
    droppedIdb,
    renamedFields,
    errors: [...keyErrors, ...fieldErrors],
  };
}
