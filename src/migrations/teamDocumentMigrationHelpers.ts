/**
 * Persistence-store glue for the team-document migration. Kept in a
 * separate file so the migration core (`teamDocumentMigration.ts`)
 * stays import-free of Zustand and easy to unit-test.
 */

import type { StoreApi, UseBoundStore } from 'zustand';
import type { DiagramDocument, DocumentMetadata } from '../types/Document';
import { getDocumentMetadata } from '../types/Document';

export { saveDocumentToStorage } from '../store/persistenceStore';

interface MinimalPersistenceState {
  documents: Record<string, DocumentMetadata>;
}

/**
 * Insert (or overwrite) the doc in `usePersistenceStore.documents` so
 * the Documents tab + recent-docs UI sees it immediately, without
 * touching the active document / page state.
 */
export function registerLocalDocument(
  store: UseBoundStore<StoreApi<MinimalPersistenceState>>,
  doc: DiagramDocument,
): void {
  const metadata = getDocumentMetadata(doc);
  store.setState((state) => ({
    documents: {
      ...state.documents,
      [doc.id]: metadata,
    },
  }));
}
