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
 * Run both the localStorage and IndexedDB parts of the Slice B
 * migration. Call once at app boot, before any store hydrates from
 * persisted state.
 */
export async function runRelayRenameMigration(): Promise<RelayRenameResult> {
  const { migratedKeys, errors } = migrateLocalStorageKeys();
  const droppedIdb = await dropLegacyRelayCacheDb();

  if (migratedKeys.length > 0) {
    console.info(
      '[relayRename] migrated legacy keys:',
      migratedKeys.join(', '),
    );
  }

  return { migratedKeys, droppedIdb, errors };
}
