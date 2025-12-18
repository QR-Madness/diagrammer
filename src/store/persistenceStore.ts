/**
 * Persistence store for document saving/loading with localStorage.
 *
 * Manages document persistence, auto-save, and document index.
 * Each document is stored separately to avoid localStorage size limits.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  DiagramDocument,
  DocumentMetadata,
  STORAGE_KEYS,
  getDocumentMetadata,
} from '../types/Document';
import { usePageStore, PageStoreSnapshot } from './pageStore';
import { useRichTextStore } from './richTextStore';

/**
 * Auto-save debounce time in milliseconds.
 */
export const AUTO_SAVE_DEBOUNCE = 2000;

/**
 * Persistence state.
 */
export interface PersistenceState {
  /** ID of the currently open document (null if untitled) */
  currentDocumentId: string | null;
  /** Name of the current document */
  currentDocumentName: string;
  /** Index of all saved documents (metadata only) */
  documents: Record<string, DocumentMetadata>;
  /** Whether the current document has unsaved changes */
  isDirty: boolean;
  /** Timestamp of last save (null if never saved) */
  lastSavedAt: number | null;
  /** Whether auto-save is enabled */
  autoSaveEnabled: boolean;
}

/**
 * Persistence actions.
 */
export interface PersistenceActions {
  /** Create a new empty document */
  newDocument: (name?: string) => void;
  /** Save the current document */
  saveDocument: () => void;
  /** Save the current document with a new name */
  saveDocumentAs: (name: string) => void;
  /** Load a document by ID */
  loadDocument: (id: string) => boolean;
  /** Delete a document by ID */
  deleteDocument: (id: string) => void;
  /** Rename the current document */
  renameDocument: (name: string) => void;
  /** Export current document as JSON string */
  exportJSON: () => string;
  /** Import document from JSON string */
  importJSON: (json: string) => boolean;
  /** Mark the document as dirty (has unsaved changes) */
  markDirty: () => void;
  /** Set auto-save enabled/disabled */
  setAutoSave: (enabled: boolean) => void;
  /** Get all document metadata sorted by modified date */
  getDocumentList: () => DocumentMetadata[];
  /** Check if a document exists */
  documentExists: (id: string) => boolean;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Initial persistence state.
 */
const initialState: PersistenceState = {
  currentDocumentId: null,
  currentDocumentName: 'Untitled Document',
  documents: {},
  isDirty: false,
  lastSavedAt: null,
  autoSaveEnabled: true,
};

/**
 * Save a document to localStorage.
 */
function saveDocumentToStorage(doc: DiagramDocument): void {
  try {
    const key = `${STORAGE_KEYS.DOCUMENT_PREFIX}${doc.id}`;
    localStorage.setItem(key, JSON.stringify(doc));
  } catch (error) {
    console.error('Failed to save document to localStorage:', error);
    throw new Error('Failed to save document. Storage may be full.');
  }
}

/**
 * Load a document from localStorage.
 */
function loadDocumentFromStorage(id: string): DiagramDocument | null {
  try {
    const key = `${STORAGE_KEYS.DOCUMENT_PREFIX}${id}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json) as DiagramDocument;
  } catch (error) {
    console.error('Failed to load document from localStorage:', error);
    return null;
  }
}

/**
 * Delete a document from localStorage.
 */
function deleteDocumentFromStorage(id: string): void {
  try {
    const key = `${STORAGE_KEYS.DOCUMENT_PREFIX}${id}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete document from localStorage:', error);
  }
}

/**
 * Create a DiagramDocument from current page store state.
 */
function createDocumentFromPageStore(
  id: string,
  name: string,
  existingDoc?: DiagramDocument
): DiagramDocument {
  const pageSnapshot = usePageStore.getState().getSnapshot();
  const richTextContent = useRichTextStore.getState().getContent();

  return {
    id,
    name,
    pages: pageSnapshot.pages,
    pageOrder: pageSnapshot.pageOrder,
    activePageId: pageSnapshot.activePageId ?? pageSnapshot.pageOrder[0] ?? '',
    createdAt: existingDoc?.createdAt ?? Date.now(),
    modifiedAt: Date.now(),
    version: 1,
    richTextContent,
  };
}

/**
 * Load a DiagramDocument into the page store and rich text store.
 */
function loadDocumentToPageStore(doc: DiagramDocument): void {
  const snapshot: PageStoreSnapshot = {
    pages: doc.pages,
    pageOrder: doc.pageOrder,
    activePageId: doc.activePageId,
  };
  usePageStore.getState().loadSnapshot(snapshot);

  // Load rich text content (or reset if not present for backwards compatibility)
  useRichTextStore.getState().loadContent(doc.richTextContent);
}

/**
 * Persistence store for document management.
 *
 * Usage:
 * ```typescript
 * const { saveDocument, loadDocument, isDirty } = usePersistenceStore();
 *
 * // Save current document
 * saveDocument();
 *
 * // Load a document
 * loadDocument(documentId);
 *
 * // Check for unsaved changes
 * if (isDirty) { ... }
 * ```
 */
export const usePersistenceStore = create<PersistenceState & PersistenceActions>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Create a new empty document
      newDocument: (name?: string) => {
        const docName = name ?? 'Untitled Document';

        // Reset page store to empty
        usePageStore.getState().reset();
        usePageStore.getState().initializeDefault();

        // Reset rich text store to empty
        useRichTextStore.getState().reset();

        set({
          currentDocumentId: null,
          currentDocumentName: docName,
          isDirty: false,
          lastSavedAt: null,
        });
      },

      // Save the current document
      saveDocument: () => {
        const state = get();
        let docId = state.currentDocumentId;

        // If no ID, create a new one
        if (!docId) {
          docId = nanoid();
        }

        // Get existing document for createdAt timestamp
        const existingDoc = docId ? loadDocumentFromStorage(docId) : undefined;

        // Create document from current state
        const doc = createDocumentFromPageStore(
          docId,
          state.currentDocumentName,
          existingDoc ?? undefined
        );

        // Save to localStorage
        saveDocumentToStorage(doc);

        // Update metadata index
        const metadata = getDocumentMetadata(doc);

        set((state) => ({
          currentDocumentId: docId,
          documents: {
            ...state.documents,
            [docId!]: metadata,
          },
          isDirty: false,
          lastSavedAt: Date.now(),
        }));

        // Save current document ID
        localStorage.setItem(STORAGE_KEYS.CURRENT_DOCUMENT, docId);
      },

      // Save with a new name
      saveDocumentAs: (name: string) => {
        const newId = nanoid();

        // Create document from current state
        const doc = createDocumentFromPageStore(newId, name);

        // Save to localStorage
        saveDocumentToStorage(doc);

        // Update metadata index
        const metadata = getDocumentMetadata(doc);

        set((state) => ({
          currentDocumentId: newId,
          currentDocumentName: name,
          documents: {
            ...state.documents,
            [newId]: metadata,
          },
          isDirty: false,
          lastSavedAt: Date.now(),
        }));

        // Save current document ID
        localStorage.setItem(STORAGE_KEYS.CURRENT_DOCUMENT, newId);
      },

      // Load a document by ID
      loadDocument: (id: string): boolean => {
        const doc = loadDocumentFromStorage(id);
        if (!doc) {
          console.warn(`Document ${id} not found`);
          return false;
        }

        // Load into page store
        loadDocumentToPageStore(doc);

        set({
          currentDocumentId: id,
          currentDocumentName: doc.name,
          isDirty: false,
          lastSavedAt: doc.modifiedAt,
        });

        // Save current document ID
        localStorage.setItem(STORAGE_KEYS.CURRENT_DOCUMENT, id);

        return true;
      },

      // Delete a document by ID
      deleteDocument: (id: string) => {
        const state = get();

        // Delete from localStorage
        deleteDocumentFromStorage(id);

        // Remove from index
        set((state) => {
          const newDocuments = { ...state.documents };
          delete newDocuments[id];
          return { documents: newDocuments };
        });

        // If we deleted the current document, create a new one
        if (state.currentDocumentId === id) {
          get().newDocument();
        }
      },

      // Rename the current document
      renameDocument: (name: string) => {
        const state = get();
        const docId = state.currentDocumentId;

        set({ currentDocumentName: name, isDirty: true });

        // If document is saved, update metadata
        if (docId && state.documents[docId]) {
          const existingMeta = state.documents[docId];
          const updatedMeta: DocumentMetadata = {
            ...existingMeta,
            name,
          };
          set({
            documents: {
              ...state.documents,
              [docId]: updatedMeta,
            },
          });
        }
      },

      // Export current document as JSON
      exportJSON: (): string => {
        const state = get();
        const docId = state.currentDocumentId ?? nanoid();

        const doc = createDocumentFromPageStore(docId, state.currentDocumentName);

        return JSON.stringify(doc, null, 2);
      },

      // Import document from JSON
      importJSON: (json: string): boolean => {
        try {
          const doc = JSON.parse(json) as DiagramDocument;

          // Validate basic structure
          if (!doc.pages || !doc.pageOrder || !Array.isArray(doc.pageOrder)) {
            console.error('Invalid document format');
            return false;
          }

          // Generate new ID to avoid conflicts
          const newId = nanoid();
          doc.id = newId;
          doc.modifiedAt = Date.now();

          // Save to localStorage
          saveDocumentToStorage(doc);

          // Load into page store
          loadDocumentToPageStore(doc);

          // Update metadata index
          const metadata = getDocumentMetadata(doc);

          set((state) => ({
            currentDocumentId: newId,
            currentDocumentName: doc.name,
            documents: {
              ...state.documents,
              [newId]: metadata,
            },
            isDirty: false,
            lastSavedAt: Date.now(),
          }));

          // Save current document ID
          localStorage.setItem(STORAGE_KEYS.CURRENT_DOCUMENT, newId);

          return true;
        } catch (error) {
          console.error('Failed to import document:', error);
          return false;
        }
      },

      // Mark document as dirty
      markDirty: () => {
        set({ isDirty: true });
      },

      // Set auto-save
      setAutoSave: (enabled: boolean) => {
        set({ autoSaveEnabled: enabled });
      },

      // Get sorted document list
      getDocumentList: (): DocumentMetadata[] => {
        const docs = Object.values(get().documents);
        return docs.sort((a, b) => b.modifiedAt - a.modifiedAt);
      },

      // Check if document exists
      documentExists: (id: string): boolean => {
        return !!get().documents[id];
      },

      // Reset to initial state
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEYS.DOCUMENT_INDEX,
      version: 1,
      partialize: (state) => ({
        // Only persist the document index and settings, not current document state
        documents: state.documents,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
    }
  )
);

/**
 * Initialize persistence on app startup.
 * Loads the last opened document or creates a new one.
 */
export function initializePersistence(): void {
  const store = usePersistenceStore.getState();

  // Try to load the last opened document
  const lastDocId = localStorage.getItem(STORAGE_KEYS.CURRENT_DOCUMENT);

  if (lastDocId && store.documentExists(lastDocId)) {
    const success = store.loadDocument(lastDocId);
    if (success) return;
  }

  // No last document or failed to load - create new document
  store.newDocument();
}

/**
 * Download the current document as a JSON file.
 */
export function downloadDocument(filename?: string): void {
  const store = usePersistenceStore.getState();
  const json = store.exportJSON();
  const name = filename ?? `${store.currentDocumentName}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Upload and import a document from a JSON file.
 * Returns a promise that resolves to true if successful.
 */
export function uploadDocument(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const json = reader.result as string;
        const success = usePersistenceStore.getState().importJSON(json);
        resolve(success);
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        resolve(false);
      };
      reader.readAsText(file);
    };

    input.click();
  });
}
